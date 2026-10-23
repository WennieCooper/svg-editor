import assert from "node:assert/strict";
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

test("create in supports all types, nested tree, accurate parent and recursive element count", () => {
  const h = new Harness();
  h.run("init");
  h.run("create g scene");
  h.run("create g node in scene");
  h.run("create rect r 1 2 3 4 red in node");
  h.run("create circle c 1 2 3 in node");
  h.run("create ellipse e 1 2 3 4 in node");
  h.run("create line l 1 2 3 4 black in scene");
  h.run('create text t 1 2 "in" in node');
  assert.deepEqual(h.ids(), ["scene"]);
  assert.deepEqual(h.ids("node"), ["r", "c", "e", "t"]);
  assert.match(h.run("tree"), /└── g#scene\n    ├── g#node\n    │   ├── rect#r/);
  assert.match(h.run("tree node"), /^g#node\n├── rect#r/);
  assert.match(h.run("show t"), /parent=g#node/);
  assert.match(h.run("tree t"), /"in"/);
  assert.equal(h.run("save example.svg"), "saved to example.svg (7 elements)");
  assert.match(h.saved, /<g id="scene">\n    <g id="node">\n      <rect/);
  assert.match(h.saved, /<text id="t" x="1" y="2">in<\/text>/);
  assert.equal(h.session.getDocument().countShapes(), 7);
});

test("nested Composite moves and scales each descendant exactly once and retains style inheritance", () => {
  const h = new Harness();
  h.run("init");
  h.run("create g scene");
  h.run("create g node in scene");
  h.run("create rect r 1 2 3 4 in node");
  h.run("create line l 5 6 7 8 in scene");
  h.run("set scene fill blue");
  h.run("move scene 10 20");
  h.run("scale scene 2");
  assert.match(h.run("tree r"), /x=22 y=44 w=6 h=8/);
  assert.match(h.run("tree l"), /\(30,52\) -> \(34,56\)/);
  assert.equal(h.session.getDocument().find("r").getAttributes().fill, undefined);
  h.run("save a.svg");
  assert.match(h.saved, /<g id="scene" fill="blue">/);
  assert.doesNotMatch(h.saved, /<rect[^>]*fill=/);
  assert.throws(() => h.run("set scene x 1"), /unknown attribute: x/);
  h.run("create g empty");
  assert.throws(() => h.run("scale empty 0"), /scale factor must be positive/);
});

test("a descendant overflow leaves every earlier sibling and nested group unchanged", () => {
  const h = new Harness();
  h.run("init");
  h.run("create g scene");
  h.run("create rect first 1 2 3 4 in scene");
  h.run("create g inner in scene");
  h.run("create line huge 0 0 1.7976931348623157e308 1 in inner");
  const before = h.run("tree");
  assert.throws(() => h.run("move scene 1.7976931348623157e308 1"), /finite/);
  assert.equal(h.run("tree"), before);
  assert.throws(() => h.run("scale scene 2"), /finite/);
  assert.equal(h.run("tree"), before);
});

test("group preserves source order and occupies first selected sibling, ungroup restores position", () => {
  const h = new Harness();
  h.run("init");
  h.run("create g scene");
  for (const id of ["a", "b", "c", "d"]) h.run(`create rect ${id} 0 0 1 1 in scene`);
  h.run("group pair c a");
  assert.deepEqual(h.ids("scene"), ["pair", "b", "d"]);
  assert.deepEqual(h.ids("pair"), ["a", "c"]);
  assert.match(h.run("show a"), /parent=g#pair/);
  h.run("ungroup pair");
  assert.deepEqual(h.ids("scene"), ["a", "c", "b", "d"]);
  assert.match(h.run("show c"), /parent=g#scene/);
  assert.throws(() => h.run("tree pair"), /no such shape/);
  assert.equal(h.session.getDocument().countShapes(), 5);
  h.run("create g empty in scene");
  h.run("ungroup empty");
  assert.deepEqual(h.ids("scene"), ["a", "c", "b", "d"]);
});

test("group across containers uses lowest common parent and document preorder", () => {
  const h = new Harness();
  h.run("init");
  h.run("create g scene");
  h.run("create g left in scene");
  h.run("create g right in scene");
  h.run("create rect a 0 0 1 1 in left");
  h.run("create rect b 0 0 1 1 in right");
  h.run("group pair b a");
  assert.deepEqual(h.ids("scene"), ["pair", "left", "right"]);
  assert.deepEqual(h.ids("pair"), ["a", "b"]);
  assert.deepEqual(h.ids("left"), []);
  assert.deepEqual(h.ids("right"), []);
  h.run("create rect outside 0 0 1 1");
  h.run("group outer outside pair");
  assert.deepEqual(h.ids(), ["outer", "scene"]);
  assert.deepEqual(h.ids("outer"), ["pair", "outside"]);
  assert.throws(() => h.run("ungroup outer"), /cannot ungroup top-level container: outer/);
});

test("addto appends, updates parent and rejects self or ancestor cycles before mutation", () => {
  const h = new Harness();
  h.run("init");
  h.run("create g scene");
  h.run("create g nested in scene");
  h.run("create rect a 0 0 1 1 in scene");
  h.run("create rect b 0 0 1 1 in nested");
  h.run("addto nested a");
  assert.deepEqual(h.ids("nested"), ["b", "a"]);
  assert.match(h.run("show a"), /parent=g#nested/);
  h.run("addto nested b");
  assert.deepEqual(h.ids("nested"), ["a", "b"]);
  const before = h.run("tree");
  for (const [command, error] of [
    ["addto nested scene", /own descendant: scene/],
    ["addto scene scene", /own descendant: scene/],
    ["group bad nested a", /own descendant: nested/],
    ["group bad a a", /duplicate group member/],
    ["group bad a missing", /no such shape/],
    ["group scene a b", /id already exists/],
    ["ungroup scene", /top-level/],
    ["ungroup a", /not a container/],
    ["create rect a 0 0 1 1 in nested", /id already exists/],
    ["create rect fresh 0 0 1 1 in missing", /no such container/],
    ["create rect fresh 0 0 1 1 in a", /not a container/],
    ["create g nested in scene", /id already exists/],
    ["addto missing a", /no such container/],
  ]) {
    assert.throws(() => h.run(command), error, command);
    assert.equal(h.run("tree"), before, command);
    assert.equal(h.session.getDocument().countShapes(), 4);
  }
});
