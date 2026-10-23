import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { CommandDispatcher } from "../dist/application/CommandDispatcher.js";
import { EditorSession } from "../dist/application/EditorSession.js";
import { ShapeFactory } from "../dist/application/ShapeFactory.js";
import { Tokenizer } from "../dist/cli/Tokenizer.js";
import { SvgDocument } from "../dist/domain/SvgDocument.js";
import { Rect } from "../dist/domain/shapes/Rect.js";

test("tokenizer preserves color, quoted spaces, empty arguments and Windows paths", () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize('create rect r1 -1 .5 100 60 #ffffff'),
    ["create", "rect", "r1", "-1", ".5", "100", "60", "#ffffff"]);
  assert.deepEqual(tokenizer.tokenize('set t1 text "hello world"'),
    ["set", "t1", "text", "hello world"]);
  assert.deepEqual(tokenizer.tokenize('set t1 text ""'), ["set", "t1", "text", ""]);
  assert.deepEqual(tokenizer.tokenize(String.raw`read "D:\work\demo.svg"`),
    ["read", String.raw`D:\work\demo.svg`]);
  assert.deepEqual(tokenizer.tokenize("  # comment"), []);
  assert.deepEqual(tokenizer.tokenize("  "), []);
  assert.throws(() => tokenizer.tokenize('create rect "r1'), /unterminated/);
});

test("domain enforces dimensions, unique case-sensitive ids and defensive child collection", () => {
  const document = new SvgDocument();
  document.add(new Rect("r1", 0, 0, 0, 10));
  document.add(new Rect("R1", -2, 1.5, 10, 20));
  assert.throws(() => document.add(new Rect("r1", 1, 2, 3, 4)), /id already exists/);
  assert.throws(() => new Rect("bad", 0, 0, -1, 10), /non-negative/);
  assert.throws(() => new Rect("bad", NaN, 0, 1, 10), /finite/);
  assert.throws(() => new Rect("bad id", 0, 0, 1, 10), /id/);
  assert.throws(() => new SvgDocument(0, 100), /positive/);
  document.getShapes().pop();
  assert.equal(document.getShapes().length, 2);
});

test("commands create and inspect a document while failed commands preserve it", () => {
  const session = new EditorSession();
  const dispatcher = new CommandDispatcher(session, new ShapeFactory());
  const tokenizer = new Tokenizer();
  const run = (line) => dispatcher.execute(tokenizer.tokenize(line));
  assert.match(run("help"), /create rect/);
  assert.throws(() => run("tree"), /no document/);
  assert.throws(() => run("create rect r1 0 0 1 1"), /no document/);
  assert.equal(run("init"), "canvas 800x600 created");
  assert.equal(run("init 400"), "canvas 400x600 created");
  assert.equal(run("init 400 200"), "canvas 400x200 created");
  assert.equal(run("create rect r1 -1.5 2 100 60 #ffffff"), "rect#r1 created");
  assert.equal(run("create rect r2 0 0 0 0"), "rect#r2 created");
  assert.equal(run("tree"),
    "svg (400x200)\n├── rect#r1  x=-1.5 y=2 w=100 h=60 fill=#ffffff\n└── rect#r2  x=0 y=0 w=0 h=0");
  assert.equal(run("tree r1"), "rect#r1  x=-1.5 y=2 w=100 h=60 fill=#ffffff");
  const before = run("tree");
  for (const invalid of [
    "init 0 200", "init 100 nope", "init 1 2 3",
    "create rect r1 0 0 1 1", "create rect r3 0 0 -1 10",
    "create rect r3 0 NaN 1 1", "create rect r3 0 0 1e999 1",
    'create rect r3 "" 0 1 1', "create rect r3 0x10 0 1 1",
    "create rect r3 0 0 1", "create rect r3 0 0 1 1 red extra",
    "create box n1", "tree missing", "tree r1 extra", "help extra",
  ]) {
    assert.throws(() => run(invalid), undefined, invalid);
    assert.equal(run("tree"), before, invalid);
  }
  assert.equal(run("init 10.5 20"), "canvas 10.5x20 created");
  assert.equal(run("tree"), "svg (10.5x20)");
});

test("real CLI continues after errors, skips comments and reaches EOF", () => {
  const result = spawnSync(process.execPath, ["dist/main.js"], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
    input: [
      "tree", "# ignored", "", "init 400 200",
      "create rect r1 30 40 100 60 #ff0000", "tree",
      'create rect "broken', "tree r1", "unknown", "help", "",
    ].join("\n"),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /error: no document/);
  assert.match(result.stdout, /rect#r1  x=30 y=40 w=100 h=60 fill=#ff0000/);
  assert.match(result.stdout, /error: unterminated double quote/);
  assert.match(result.stdout, /error: unknown command: unknown/);
  assert.match(result.stdout, /Available commands/);
  assert.doesNotMatch(result.stdout, /ignored/);
});
