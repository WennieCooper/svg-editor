import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { CommandDispatcher } from "../dist/application/CommandDispatcher.js";
import { EditorSession } from "../dist/application/EditorSession.js";
import { ShapeFactory } from "../dist/application/ShapeFactory.js";
import { Tokenizer } from "../dist/cli/Tokenizer.js";
import { SvgDocument } from "../dist/domain/SvgDocument.js";
import { Rect } from "../dist/domain/shapes/Rect.js";
import { SvgFileStore } from "../dist/infrastructure/SvgFileStore.js";
import { SvgWriter } from "../dist/infrastructure/SvgWriter.js";

test("SVG output contains canvas, geometry, ordered elements and escaped attributes", () => {
  const document = new SvgDocument(400, 200);
  document.add(new Rect('矩形&<>"', -1.5, 2, 100, 60, '#4a90d9'));
  document.add(new Rect("plain", 0, 0, 1, 1));
  const svg = new SvgWriter().serialize(document);
  assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg, /width="400" height="200" viewBox="0 0 400 200"/);
  assert.match(svg, /id="矩形&amp;&lt;&gt;&quot;"/);
  assert.match(svg, /x="-1.5" y="2" width="100" height="60" fill="#4a90d9"/);
  assert.match(svg, /<rect id="plain" x="0" y="0" width="1" height="1"\/>/);
  assert.ok(svg.indexOf('id="矩形') < svg.indexOf('id="plain"'));
  const attributes = document.find("plain").getAttributes();
  attributes.x = "999";
  assert.equal(document.find("plain").getAttributes().x, "0");
  const invalid = new SvgDocument();
  invalid.add(new Rect("invalid", 0, 0, 1, 1, "\u0000"));
  assert.throws(() => new SvgWriter().serialize(invalid), /invalid XML character/);
});

test("successful saves remember path; failed saves and failed init leave path and document unchanged", () => {
  const calls = [];
  const store = { save(document, path) {
    calls.push(path);
    if (path === "bad.svg") throw new Error("cannot write file: bad.svg");
  } };
  const session = new EditorSession();
  const dispatcher = new CommandDispatcher(session, new ShapeFactory(), store);
  const tokenizer = new Tokenizer();
  const run = (line) => dispatcher.execute(tokenizer.tokenize(line));
  assert.throws(() => run("save a.svg"), /no document/);
  run("init");
  run("create rect r1 0 0 10 10");
  const before = run("tree");
  assert.throws(() => run("save"), /no file path/);
  assert.throws(() => run('save ""'), /no file path/);
  assert.equal(run('save "中文 demo.svg"'), "saved to 中文 demo.svg (1 elements)");
  assert.equal(run("save"), "saved to 中文 demo.svg (1 elements)");
  assert.throws(() => run("save bad.svg"), /cannot write file/);
  assert.equal(run("tree"), before);
  assert.equal(run("save"), "saved to 中文 demo.svg (1 elements)");
  assert.throws(() => run("init -1 100"), /positive/);
  assert.equal(run("save"), "saved to 中文 demo.svg (1 elements)");
  assert.throws(() => run("save a.svg extra"), /usage/);
  run("init");
  assert.throws(() => run("save"), /no file path/);
  assert.deepEqual(calls, ["中文 demo.svg", "中文 demo.svg", "bad.svg", "中文 demo.svg", "中文 demo.svg"]);
});

test("disk saves replace successfully and preserve old target on serialization failure", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-save-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const target = join(directory, "中文 demo.svg");
  const document = new SvgDocument();
  document.add(new Rect("r1", 0, 0, 10, 10, "red"));
  const store = new SvgFileStore();
  writeFileSync(target, "old content");
  store.save(document, target);
  assert.match(readFileSync(target, "utf8"), /fill="red"/);
  const before = readFileSync(target, "utf8");
  const invalid = new SvgDocument();
  invalid.add(new Rect("invalid", 0, 0, 1, 1, "\u0000"));
  assert.throws(() => store.save(invalid, target), /cannot write file/);
  assert.equal(readFileSync(target, "utf8"), before);
  const blocked = join(directory, "existing-directory");
  mkdirSync(blocked);
  assert.throws(() => store.save(document, blocked), /cannot write file/);
  assert.throws(() => store.save(document, join(directory, "missing", "a.svg")), /cannot write file/);
  assert.deepEqual(readdirSync(directory).sort(), ["existing-directory", "中文 demo.svg"].sort());
});

test("real CLI saves SVG using a quoted path and continues after file IO errors", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-cli-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../dist/main.js", import.meta.url))], {
    cwd: directory,
    encoding: "utf8",
    input: [
      "init 400 200", "create rect r1 30 40 100 60 red",
      'save "中文 demo.svg"', "save missing/a.svg", "save", "tree", "",
    ].join("\n"),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /saved to 中文 demo.svg \(1 elements\)/);
  assert.match(result.stdout, /error: cannot write file: missing\/a.svg/);
  assert.match(result.stdout, /rect#r1  x=30 y=40/);
  assert.match(readFileSync(join(directory, "中文 demo.svg"), "utf8"), /<rect id="r1"/);
});
