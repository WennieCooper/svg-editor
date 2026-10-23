import assert from "node:assert/strict";
import { test } from "node:test";
import { CommandDispatcher } from "../dist/application/CommandDispatcher.js";
import { EditorSession } from "../dist/application/EditorSession.js";
import { ShapeFactory } from "../dist/application/ShapeFactory.js";
import { Tokenizer } from "../dist/cli/Tokenizer.js";
import { SvgDocument } from "../dist/domain/SvgDocument.js";
import { Rect } from "../dist/domain/shapes/Rect.js";
import { Circle } from "../dist/domain/shapes/Circle.js";
import { Ellipse } from "../dist/domain/shapes/Ellipse.js";
import { Line } from "../dist/domain/shapes/Line.js";
import { Text } from "../dist/domain/shapes/Text.js";
import { SvgWriter } from "../dist/infrastructure/SvgWriter.js";

for (const [name, shape, expected] of [
  ["rect", new Rect("r", 1, 2, 3, 4), { id: "r", x: "22", y: "44", width: "6", height: "8" }],
  ["circle", new Circle("c", 1, 2, 3), { id: "c", cx: "22", cy: "44", r: "6" }],
  ["ellipse", new Ellipse("e", 1, 2, 3, 4), { id: "e", cx: "22", cy: "44", rx: "6", ry: "8" }],
  ["line", new Line("l", 1, 2, 3, 4), { id: "l", x1: "22", y1: "44", x2: "26", y2: "48" }],
  ["text", new Text("t", 1, 2, "Hello"), { id: "t", x: "22", y: "44" }],
]) {
  test(name + " moves positions and scales all geometry through the shared interface", () => {
    shape.move(10, 20);
    shape.scale(2);
    assert.deepEqual(shape.getAttributes(), expected);
    shape.setAttribute("stroke-width", "3");
    shape.scale(0.5);
    assert.equal(shape.getAttributes()["stroke-width"], "3", "stroke-width is a style, not geometry");
    assert.throws(() => shape.setAttribute("id", "changed"), /unknown attribute: id/);
    assert.throws(() => shape.setAttribute("transform", "translate(1,2)"), /unknown attribute/);
  });
}

test("overflow and invalid geometry edits are atomic, including multi-coordinate line movement", () => {
  const line = new Line("l", 0, 0, Number.MAX_VALUE, 2);
  const before = line.getAttributes();
  assert.throws(() => line.move(Number.MAX_VALUE, 10), /finite/);
  assert.deepEqual(line.getAttributes(), before);
  assert.throws(() => line.scale(2), /finite/);
  assert.deepEqual(line.getAttributes(), before);
  for (const factor of [0, -1, NaN, Infinity]) {
    assert.throws(() => line.scale(factor), /scale factor must be positive/);
    assert.deepEqual(line.getAttributes(), before);
  }
  const circle = new Circle("c", 0, 0, 5);
  assert.throws(() => circle.setAttribute("r", "-1"), /non-negative/);
  assert.equal(circle.getAttributes().r, "5");
  assert.throws(() => circle.setAttribute("r", ""), /invalid number/);
  assert.throws(() => circle.setAttribute("fill", ""), /must not be empty/);
  assert.throws(() => circle.setAttribute("stroke-width", "-1"), /non-negative/);
  assert.equal(circle.getAttributes()["stroke-width"], undefined);
});

test("factory, edit commands, show and tree work for all five leaves with strict attribute whitelists", () => {
  const session = new EditorSession();
  const dispatcher = new CommandDispatcher(session, new ShapeFactory(), { save() {} });
  const tokenizer = new Tokenizer();
  const run = (line) => dispatcher.execute(tokenizer.tokenize(line));
  for (const command of ["move r 1 2", "scale r 2", "set r fill red", "show r"]) {
    assert.throws(() => run(command), /no document/);
  }
  run("init");
  run("create rect r 1 2 3 4");
  run("create circle c 10 20 5 red");
  run("create ellipse e 30 40 8 9 green");
  run("create line l 1 2 3 4 black");
  run('create text t 20 40 "开始 & 结束"');
  run("move l -1 2");
  run("scale c 2");
  run("set e rx 12.5");
  run('set t text "新的标题 with spaces"');
  run("set r fill #ffffff");
  run("set r stroke black");
  run("set r stroke-width 1.5");
  assert.match(run("tree c"), /cx=20 cy=40 r=10 fill=red/);
  assert.match(run("tree l"), /\(0,4\) -> \(2,6\) stroke=black/);
  assert.match(run("tree e"), /rx=12.5 ry=9/);
  assert.match(run("tree t"), /新的标题 with spaces/);
  assert.match(run("show c"), /circle#c  parent=svg/);
  assert.match(run("show c"), /r=10/);
  assert.match(run("show t"), /text="新的标题 with spaces"/);
  const before = run("tree");
  for (const invalid of [
    "create circle bad 1 2 -1", "create ellipse bad 1 2 -3 4",
    "create line bad 1 2 nope 4", "create text bad 1 2", "create text bad 1 2 hello extra",
    "create circle c 0 0 1", "move l 5 nope", "move l 1", "scale c 0", "scale c -1",
    "set c width 100", "set r r 2", "set l r 2", "set t label text", "set c r -1",
    "set e ry nope", "set r stroke-width -1", "set r fill red extra", "show missing", "show c extra",
  ]) {
    assert.throws(() => run(invalid), undefined, invalid);
    assert.equal(run("tree"), before, invalid);
  }
  run('set t text ""');
  assert.equal(session.getDocument().find("t").getTextContent(), "");
});

test("text is XML child content, defaults remain absent, and styles and geometry survive serialization", () => {
  const document = new SvgDocument(200, 100);
  document.add(new Text("t", 1, 2, 'A & <B> "C"'));
  document.add(new Text("empty", 0, 0, ""));
  document.add(new Circle("c", 10, 20, 5));
  document.add(new Ellipse("e", 30, 40, 8, 9));
  document.add(new Line("l", 1, 2, 3, 4));
  const svg = new SvgWriter().serialize(document);
  assert.ok(svg.includes('<text id="t" x="1" y="2">A &amp; &lt;B&gt; &quot;C&quot;</text>'));
  assert.ok(svg.includes('<text id="empty" x="0" y="0"></text>'));
  assert.ok(svg.includes('<circle id="c" cx="10" cy="20" r="5"/>'));
  assert.ok(svg.includes('<ellipse id="e" cx="30" cy="40" rx="8" ry="9"/>'));
  assert.ok(svg.includes('<line id="l" x1="1" y1="2" x2="3" y2="4"/>'));
  assert.doesNotMatch(svg, / text=/);
  const invalid = new SvgDocument();
  invalid.add(new Text("bad", 0, 0, "\u0000"));
  assert.throws(() => new SvgWriter().serialize(invalid), /invalid XML character/);
});
