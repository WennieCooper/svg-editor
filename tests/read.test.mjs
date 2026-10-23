import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { CommandDispatcher } from "../dist/application/CommandDispatcher.js";
import { EditorSession } from "../dist/application/EditorSession.js";
import { ShapeFactory } from "../dist/application/ShapeFactory.js";
import { Tokenizer } from "../dist/cli/Tokenizer.js";
import { SvgFileStore } from "../dist/infrastructure/SvgFileStore.js";
import { SvgReader } from "../dist/infrastructure/SvgReader.js";
import { SvgWriter } from "../dist/infrastructure/SvgWriter.js";

const fixture = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>
  <text id="t1" x="10" y="290">imported &amp; 中文<![CDATA[ <literal>]]></text>
  <circle id="c1" cx="50" cy="50" r="10"/>
  <g id="g1">
    <rect id="r2" x="0" y="0" width="10" height="10"/>
    <circle id="c2" cx="5" cy="5" r="2"/>
  </g>
  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>
  <line id="l1" x1="1" y1="2" x2="3" y2="4" stroke="black"/>
</svg>`;

class Harness {
  session = new EditorSession();
  dispatcher = new CommandDispatcher(this.session, new ShapeFactory(), new SvgFileStore());
  tokenizer = new Tokenizer();
  run(line) { return this.dispatcher.execute(this.tokenizer.tokenize(line)); }
  state() { return new SvgWriter().serialize(this.session.getDocument()); }
}

test("XML reader loads six types, nested parents, entities, CDATA and missing-id warnings", () => {
  const result = new SvgReader().parse(fixture);
  const document = result.getDocument();
  assert.equal(document.countShapes(), 8);
  assert.equal(document.getWidth(), 400);
  assert.equal(document.parentLabel("r2"), "g#g1");
  assert.equal(document.find("t1").getTextContent(), "imported & 中文 <literal>");
  assert.deepEqual(result.getWarnings(), ["warning: assigned id rect1 to unnamed <rect>"]);
  const warnings = result.getWarnings();
  warnings.pop();
  assert.equal(result.getWarnings().length, 1);
  assert.equal(document.find("c1").getAttributes().fill, undefined);
});

test("id allocation reserves later explicit ids and the root id before assigning names", () => {
  const result = new SvgReader().parse(
    '<svg id="rect1"><rect/><rect id="rect3"/><g><rect/></g><circle id="C"/><circle id="c"/></svg>');
  const document = result.getDocument();
  assert.deepEqual(result.getWarnings(), [
    "warning: assigned id rect2 to unnamed <rect>",
    "warning: assigned id g1 to unnamed <g>",
    "warning: assigned id rect4 to unnamed <rect>",
  ]);
  assert.equal(document.getRootId(), "rect1");
  assert.equal(document.find("rect2").getAttributes().width, "0");
  assert.equal(document.parentLabel("rect4"), "g#g1");
  assert.equal(document.countShapes(), 6);
  assert.throws(() => document.add(new ShapeFactory().create("rect", ["rect1", "0", "0", "1", "1"])), /id already exists/);
  assert.throws(() => document.group("rect1", ["C", "c"]), /id already exists/);
});

test("prefix namespaces, px lengths, empty text, inherited styling, viewBox and transforms survive roundtrip", () => {
  const source = `<s:svg xmlns:s="http://www.w3.org/2000/svg" id="canvas" width="400px" height="200px"
    viewBox="-10 -20 800 400" fill="gray" font-family="sans-serif" preserveAspectRatio="xMidYMid meet">
    <s:g id="scene" transform="translate(60,40) scale(0.8)" data-kind="box">
      <s:rect id="r" x="1.5px" y="2" width="3px" height="4" stroke-width="2px"/>
      <s:text id="t" x="10" y="20" font-size="16" text-anchor="middle" xml:space="preserve">  A &amp; B  </s:text>
      <s:text id="empty" />
    </s:g>
  </s:svg>`;
  const reader = new SvgReader();
  const document = reader.parse(source).getDocument();
  assert.equal(document.find("scene").getType(), "g");
  assert.equal(document.find("r").getAttributes().x, "1.5");
  assert.equal(document.find("r").getAttributes()["stroke-width"], "2");
  assert.equal(document.find("t").getTextContent(), "  A & B  ");
  assert.equal(document.find("empty").getTextContent(), "");
  const writer = new SvgWriter();
  const canonical = writer.serialize(document);
  assert.equal(writer.serialize(reader.parse(canonical).getDocument()), canonical);
  assert.equal(writer.serialize(document.clone()), canonical);
  document.find("scene").move(10, 20);
  assert.equal(document.find("scene").getAttributes().transform, "translate(60,40) scale(0.8)");
  assert.equal(document.find("r").getAttributes().x, "11.5", "edit coordinates remain local");
  assert.throws(() => document.find("t").setAttribute("font-size", "20"), /unknown attribute/);
  document.resize(100, 100);
  assert.equal(document.getRootAttributes().viewBox, "0 0 100 100");
});

test("missing geometry defaults to zero and viewBox supplies dimensions when absent", () => {
  const reader = new SvgReader();
  const document = reader.parse('<svg viewBox="0 0 300 150"><circle id="c"/><text id="t"/></svg>').getDocument();
  assert.equal(document.getWidth(), 300);
  assert.equal(document.getHeight(), 150);
  assert.deepEqual(document.find("c").getAttributes(), { id: "c", cx: "0", cy: "0", r: "0" });
  assert.equal(document.find("t").getTextContent(), "");
  const empty = reader.parse("<svg/>").getDocument();
  assert.equal(empty.getWidth(), 800);
  assert.equal(empty.getHeight(), 600);
});

test("malformed or unsupported input is rejected instead of silently dropping content", () => {
  for (const source of [
    "", "<html/>", "<svg><rect></svg>", '<svg><rect id="same"/><circle id="same"/></svg>',
    '<svg id="same"><rect id="same"/></svg>', '<svg width="-1" height="20"/>',
    '<svg viewBox="0 0 100"/>', '<svg viewBox="0 0 0 100"/>',
    '<svg><circle id="c" r="-1"/></svg>', '<svg><rect id="r" x="20%"/></svg>',
    '<svg><rect id="r" id="again"/></svg>', '<svg><text id="t">&unknown;</text></svg>',
    '<!DOCTYPE svg><svg/>', '<svg><path d="M0 0"/></svg>',
    '<svg><rect style="fill:red"/></svg>', '<svg><text><tspan>nested</tspan></text></svg>',
    '<svg xmlns="http://example.com/other"/>', '<svg xmlns:x="http://example.com/other"><x:rect/></svg>',
    '<svg><g>unexpected</g></svg>', '<svg><rect id="bad id"/></svg>',
    "<svg>\u0000</svg>",
  ]) {
    assert.throws(() => new SvgReader().parse(source), /invalid SVG:/, source);
  }
});

test("every existing saved example reads back without warnings or semantic loss", () => {
  const reader = new SvgReader();
  const writer = new SvgWriter();
  for (const name of ["rectangles", "shapes", "groups", "layers-before", "layers-after", "history"]) {
    const source = readFileSync(new URL("../examples/" + name + ".svg", import.meta.url), "utf8");
    const result = reader.parse(source);
    assert.deepEqual(result.getWarnings(), [], name);
    assert.equal(writer.serialize(result.getDocument()), source, name);
  }
});

test("successful read initializes the document and default path, blocks history, then permits edits", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-read-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "中文 import.svg");
  writeFileSync(path, fixture);
  const h = new Harness();
  const output = h.run('read "' + path + '"');
  assert.match(output, /^warning: assigned id rect1/);
  assert.match(output, /\(8 elements\)$/);
  assert.equal(h.session.getDocument().getWidth(), 400);
  assert.throws(() => h.run("undo"), /undo not allowed after io command/);
  assert.throws(() => h.run("redo"), /undo not allowed after io command/);
  const before = h.state();
  h.run('set t1 text "new title"');
  h.run("undo");
  assert.equal(h.state(), before);
  h.run("redo");
  assert.equal(h.session.getDocument().find("t1").getTextContent(), "new title");
  h.run("save");
  assert.equal(readFileSync(path, "utf8"), h.state());
  assert.throws(() => h.run("undo"), /undo not allowed after io command/);
});

test("failed reads preserve current document, redo, default save path and blocked state", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-read-fail-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const valid = join(directory, "valid.svg");
  const invalid = join(directory, "invalid.svg");
  const missing = join(directory, "missing.svg");
  writeFileSync(valid, fixture);
  writeFileSync(invalid, "<svg><rect/><path/></svg>");
  const h = new Harness();
  h.run('read "' + valid + '"');
  h.run("move c1 1 2");
  const moved = h.state();
  h.run("undo");
  const before = h.state();
  for (const command of ['read "' + invalid + '"', 'read "' + missing + '"', "read", "read x.svg extra"]) {
    assert.throws(() => h.run(command));
    assert.equal(h.state(), before);
  }
  h.run("redo");
  assert.equal(h.state(), moved);
  h.run("save");
  assert.equal(readFileSync(valid, "utf8"), moved);
  assert.equal(readFileSync(invalid, "utf8"), "<svg><rect/><path/></svg>");
  assert.throws(() => h.run('read "' + invalid + '"'), /invalid SVG/);
  assert.throws(() => h.run("undo"), /undo not allowed after io command/);
  const fresh = new Harness();
  assert.throws(() => fresh.run('read "' + missing + '"'), /cannot read file:/);
  assert.throws(() => fresh.run("tree"), /no document/);
});

test("read replaces a previous document and history instead of merging graphs", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-replace-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "new.svg");
  writeFileSync(path, '<svg width="100" height="50"><circle id="c" cx="10" cy="20" r="5"/></svg>');
  const h = new Harness();
  h.run("init");
  h.run("create rect old 0 0 1 1");
  h.run("move old 1 2");
  h.run("undo");
  h.run('read "' + path + '"');
  assert.throws(() => h.run("show old"), /no such shape/);
  assert.equal(h.session.getDocument().countShapes(), 1);
  assert.throws(() => h.run("redo"), /undo not allowed after io command/);
  h.run("move c 1 2");
  h.run("undo");
  assert.throws(() => h.run("undo"), /nothing to undo/);
});

test("real CLI emits warnings only for a successful read, saves to imported path and continues after errors", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-read-cli-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, "中文 input.svg"), fixture);
  writeFileSync(join(directory, "bad.svg"), "<svg><rect/><path/></svg>");
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../dist/main.js", import.meta.url))], {
    cwd: directory, encoding: "utf8",
    input: ['read "中文 input.svg"', "undo", "read bad.svg", "read missing.svg",
      'set t1 text "edited & saved"', "undo", "redo", "save", "tree", ""].join("\n"),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal((result.stdout.match(/warning: assigned id/g) ?? []).length, 1);
  assert.match(result.stdout, /read 中文 input.svg \(8 elements\)/);
  assert.match(result.stdout, /error: undo not allowed after io command/);
  assert.match(result.stdout, /error: invalid SVG:/);
  assert.match(result.stdout, /error: cannot read file: missing.svg/);
  assert.match(readFileSync(join(directory, "中文 input.svg"), "utf8"), /edited &amp; saved/);
});
