import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { CommandDispatcher } from "../dist/application/CommandDispatcher.js";
import { EditorSession } from "../dist/application/EditorSession.js";
import { ShapeFactory } from "../dist/application/ShapeFactory.js";
import { UndoableCommand } from "../dist/application/commands/UndoableCommand.js";
import { Tokenizer } from "../dist/cli/Tokenizer.js";
import { DocumentSnapshot } from "../dist/domain/DocumentSnapshot.js";
import { SvgWriter } from "../dist/infrastructure/SvgWriter.js";

class Harness {
  session = new EditorSession();
  saves = 0;
  dispatcher = new CommandDispatcher(this.session, new ShapeFactory(), {
    save: (_document, path) => {
      if (path === "bad.svg") throw new Error("cannot write file: bad.svg");
      this.saves++;
    },
  });
  tokenizer = new Tokenizer();
  run(line) { return this.dispatcher.execute(this.tokenizer.tokenize(line)); }
  state() {
    const document = this.session.getDocument();
    const parents = [];
    const visit = (nodes) => nodes.forEach(node => {
      parents.push([node.getId(), document.parentLabel(node.getId())]);
      visit(node.getChildren());
    });
    visit(document.getShapes());
    return { svg: new SvgWriter().serialize(document), count: document.countShapes(), parents };
  }
  setup() {
    for (const line of [
      "init 600 400", "create g scene", "set scene fill gray",
      "create g left in scene", "create g right in scene",
      "create rect r 0.1 2 3 4 red in left", "set r stroke-width 1.5",
      'create text t 5 6 "原始文字 & content" in left',
      "create circle c 20 30 4 in right", "create ellipse e 40 50 6 7 in right",
      "create line l 1 2 3 4 black in scene",
    ]) this.run(line);
  }
}

for (const command of [
  "create rect fresh 1 2 3 4 in left",
  "delete left", "move scene 10 20", "scale scene 0.1",
  "set r fill blue", 'set t text ""',
  "group pair t r", "group cross c r", "ungroup left",
  "addto right r", "front left", "back right",
]) {
  test("one undo/redo restores full document for: " + command, () => {
    const h = new Harness();
    h.setup();
    const before = h.state();
    h.run(command);
    const after = h.state();
    assert.notDeepEqual(after, before);
    assert.match(h.run("undo"), /^undone:/);
    assert.deepEqual(h.state(), before);
    assert.match(h.run("redo"), /^redone:/);
    assert.deepEqual(h.state(), after);
    h.run("undo");
    assert.deepEqual(h.state(), before);
  });
}

test("snapshots contain independent polymorphic clones of all six types", () => {
  const h = new Harness();
  h.setup();
  const before = h.state();
  const snapshot = new DocumentSnapshot(h.session.getDocument());
  const restored = snapshot.restore();
  restored.find("r").move(100, 0);
  restored.find("scene").setAttribute("fill", "orange");
  restored.find("t").setAttribute("text", "changed");
  restored.addTo("left", "c");
  assert.deepEqual(h.state(), before);
  h.session.restoreDocument(snapshot.restore());
  assert.deepEqual(h.state(), before);
  h.session.getDocument().delete("scene");
  h.session.restoreDocument(snapshot.restore());
  assert.deepEqual(h.state(), before);
});

test("redo clears only on a successful new edit; failed commands and views preserve redo", () => {
  const h = new Harness();
  h.setup();
  h.run("move r 1 2");
  const moved = h.state();
  h.run("undo");
  const before = h.state();
  for (const invalid of [
    "create rect r 0 0 1 1", "move r nope 1", "set r width -1",
    "group bad scene r", "delete missing", "save bad.svg", "canvas 100 -1", "init 0 100",
    "undo extra", "redo extra",
  ]) {
    assert.throws(() => h.run(invalid), undefined, invalid);
    assert.deepEqual(h.state(), before, invalid);
  }
  for (const view of ["tree", "show r", "help", "canvas"]) h.run(view);
  h.run("redo");
  assert.deepEqual(h.state(), moved);
  h.run("undo");
  h.run("set r fill blue");
  assert.throws(() => h.run("redo"), /nothing to redo/);
});

for (const io of ["init 100 100", "save ok.svg", "canvas 100 100"]) {
  test("successful " + io + " blocks both stacks until a successful edit", () => {
    const h = new Harness();
    h.setup();
    h.run("move r 1 1");
    h.run("undo");
    h.run(io);
    const blocked = h.state();
    for (const action of ["undo", "redo"]) {
      assert.throws(() => h.run(action), /^Error: undo not allowed after io command$/);
    }
    assert.throws(() => h.run("delete missing"), /no such shape/);
    assert.throws(() => h.run("save bad.svg"), /cannot write/);
    h.run("canvas");
    h.run("help");
    assert.throws(() => h.run("undo"), /undo not allowed after io command/);
    assert.deepEqual(h.state(), blocked);
    h.run("create rect fresh 1 2 3 4");
    h.run("undo");
    assert.deepEqual(h.state(), blocked);
    assert.throws(() => h.run("undo"), /nothing to undo/);
    h.run("redo");
    assert.match(h.run("tree fresh"), /rect#fresh/);
  });
}

test("failed save preserves edit history and redo restores without re-executing the edit", () => {
  const h = new Harness();
  assert.throws(() => h.run("undo"), /no document/);
  assert.throws(() => h.run("redo"), /no document/);
  h.run("init");
  h.run("create rect r 0 0 1 1");
  assert.throws(() => h.run("save bad.svg"), /cannot write/);
  h.run("undo");
  assert.equal(h.session.getDocument().countShapes(), 0);
  h.run("redo");
  let executions = 0;
  const command = new UndoableCommand({
    execute: () => {
      executions++;
      h.session.getDocument().find("r").move(1, 2);
      return "custom move";
    },
  }, h.session);
  command.execute();
  const after = h.state();
  h.run("undo");
  h.run("redo");
  assert.deepEqual(h.state(), after);
  assert.equal(executions, 1);
  assert.equal(h.saves, 0);
});

test("unexpected partial edit failures roll back state without consuming undo or redo", () => {
  const h = new Harness();
  h.setup();
  h.run("move r 1 2");
  h.run("undo");
  const before = h.state();
  const command = new UndoableCommand({
    execute: () => {
      h.session.getDocument().delete("left");
      throw new Error("injected failure");
    },
  }, h.session);
  assert.throws(() => command.execute(), /injected failure/);
  assert.deepEqual(h.state(), before);
  h.run("redo");
  assert.match(h.run("tree r"), /x=1.1 y=4/);
});

test("real CLI recovers deleted groups and enforces the canvas history barrier", () => {
  const result = spawnSync(process.execPath, ["dist/main.js"], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
    input: [
      "init", "create g scene", "create rect r 1 2 3 4 in scene",
      "delete scene", "undo", "tree", "redo", "tree", "canvas 400 200",
      "undo", "create circle c 10 20 5", "undo", "redo", "show c", "",
    ].join("\n"),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /undone: g#scene deleted/);
  assert.match(result.stdout, /g#scene\n    └── rect#r/);
  assert.match(result.stdout, /redone: g#scene deleted/);
  assert.match(result.stdout, /error: undo not allowed after io command/);
  assert.match(result.stdout, /circle#c  parent=svg/);
});

test("multiple undo/redo steps preserve the timeline across subtree deletion and id reuse", () => {
  const h = new Harness();
  h.setup();
  const states = [h.state()];
  for (const command of [
    "move r 10 20", "group pair t r", "addto right pair", "back pair",
    'set t text "changed"', "scale scene 0.5", "delete right", "create rect right 0 0 1 1",
  ]) {
    h.run(command);
    states.push(h.state());
  }
  for (let index = states.length - 2; index >= 0; index--) {
    h.run("undo");
    assert.deepEqual(h.state(), states[index], "undo step " + index);
  }
  for (let index = 1; index < states.length; index++) {
    h.run("redo");
    assert.deepEqual(h.state(), states[index], "redo step " + index);
  }
});
