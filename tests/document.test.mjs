import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { CommandDispatcher } from "../dist/application/CommandDispatcher.js";
import { EditorSession } from "../dist/application/EditorSession.js";
import { ShapeFactory } from "../dist/application/ShapeFactory.js";
import { Tokenizer } from "../dist/cli/Tokenizer.js";
import { SvgWriter } from "../dist/infrastructure/SvgWriter.js";

class Harness {
  session = new EditorSession();
  saved = "";
  dispatcher = new CommandDispatcher(this.session, new ShapeFactory(), {
    save: (document) => { this.saved = new SvgWriter().serialize(document); },
  });
  tokenizer = new Tokenizer();
  run(line) { return this.dispatcher.execute(this.tokenizer.tokenize(line)); }
  ids(parent) {
    const document = this.session.getDocument();
    return (parent === undefined ? document.getShapes() : document.find(parent).getChildren()).map(s => s.getId());
  }
}

test("delete removes an entire subtree from rendering and all indexes; ids can be reused", () => {
  const h = new Harness();
  h.run("init");
  h.run("create g scene");
  h.run("create g nested in scene");
  h.run("create rect card 0 0 1 1 in nested");
  h.run('create text label 1 2 "Hello" in nested');
  h.run("create circle survivor 3 4 5 in scene");
  assert.equal(h.run("delete nested"), "g#nested deleted");
  assert.deepEqual(h.ids("scene"), ["survivor"]);
  assert.equal(h.session.getDocument().countShapes(), 2);
  for (const id of ["nested", "card", "label"]) {
    assert.throws(() => h.run("show " + id), /no such shape/);
  }
  h.run("create g nested in scene");
  h.run("create rect card 0 0 1 1 in nested");
  h.run('create text label 1 2 "Hello" in nested');
  assert.match(h.run("show card"), /parent=g#nested/);
  h.run("delete card");
  assert.deepEqual(h.ids("nested"), ["label"]);
  h.run("delete scene");
  assert.equal(h.session.getDocument().countShapes(), 0);
  assert.deepEqual(h.ids(), []);
  h.run("create rect card 1 2 3 4");
  h.run("save out.svg");
  assert.match(h.saved, /id="card"/);
  assert.doesNotMatch(h.saved, /id="scene"|id="nested"|id="label"/);
});

test("front/back change only sibling order and SVG painter order, including containers", () => {
  const h = new Harness();
  h.run("init");
  for (const id of ["a", "b", "c"]) h.run(`create rect ${id} 0 0 10 10`);
  h.run("front a");
  assert.deepEqual(h.ids(), ["b", "c", "a"]);
  h.run("front a");
  assert.deepEqual(h.ids(), ["b", "c", "a"]);
  h.run("back a");
  assert.deepEqual(h.ids(), ["a", "b", "c"]);
  h.run("create g scene");
  h.run("create g nested in scene");
  h.run("create rect x 0 0 1 1 in scene");
  h.run("create rect y 0 0 1 1 in nested");
  const roots = h.ids();
  h.run("front nested");
  assert.deepEqual(h.ids("scene"), ["x", "nested"]);
  assert.deepEqual(h.ids(), roots);
  assert.deepEqual(h.ids("nested"), ["y"]);
  assert.match(h.run("show y"), /parent=g#nested/);
  h.run("back nested");
  assert.deepEqual(h.ids("scene"), ["nested", "x"]);
  h.run("front b");
  h.run("save out.svg");
  assert.ok(h.saved.indexOf('id="a"') < h.saved.indexOf('id="b"'));
  assert.ok(h.saved.indexOf('id="scene"') < h.saved.indexOf('id="b"'));
  assert.equal(h.session.getDocument().countShapes(), 7);
});

test("canvas query and resize preserve document identity, shapes, coordinates and save path", () => {
  const h = new Harness();
  h.run("init 400 200");
  h.run("create rect r 350 150 100 100 red");
  h.run("save out.svg");
  const document = h.session.getDocument();
  assert.equal(h.run("canvas"), "canvas 400x200");
  assert.equal(h.run("canvas 600 300"), "canvas resized to 600x300");
  assert.equal(h.run("canvas 500"), "canvas resized to 500x300");
  assert.equal(h.session.getDocument(), document);
  assert.match(h.run("tree r"), /x=350 y=150 w=100 h=100/);
  assert.equal(h.run("save"), "saved to out.svg (1 elements)");
  assert.match(h.saved, /width="500" height="300" viewBox="0 0 500 300"/);
  h.run("canvas 10.5 20.5");
  assert.match(h.run("tree r"), /x=350 y=150/);
});

test("bad document commands leave dimensions, hierarchy and order untouched", () => {
  const h = new Harness();
  for (const command of ["delete r", "front r", "back r", "canvas", "canvas 1 2"]) {
    assert.throws(() => h.run(command), /no document/);
  }
  h.run("init");
  h.run("create g scene");
  h.run("create rect r 0 0 1 1 in scene");
  const before = h.run("tree");
  for (const invalid of [
    "delete missing", "delete", "delete r extra", "front missing", "front", "front r extra",
    "back missing", "back", "back r extra", "canvas 1 2 3", "canvas nope 2", "canvas 0 100",
    "canvas 100 -1", "canvas 100 1e999", "canvas 100 NaN",
  ]) {
    assert.throws(() => h.run(invalid), undefined, invalid);
    assert.equal(h.run("tree"), before, invalid);
    assert.equal(h.session.getDocument().countShapes(), 2);
    assert.match(h.run("show r"), /parent=g#scene/);
  }
});

test("real CLI handles deletion, layer order and canvas changes", () => {
  const result = spawnSync(process.execPath, ["dist/main.js"], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
    input: ["init", "create rect a 0 0 10 10 red", "create rect b 1 1 10 10 blue",
      "front a", "tree", "back a", "delete b", "canvas 400 200", "canvas", "tree", ""].join("\n"),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /├── rect#b[^\n]*\n└── rect#a/);
  assert.match(result.stdout, /rect#b deleted/);
  assert.match(result.stdout, /canvas resized to 400x200/);
  assert.match(result.stdout, /svg \(400x200\)\n└── rect#a/);
});
