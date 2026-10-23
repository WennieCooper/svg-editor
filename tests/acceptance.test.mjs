import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { SvgReader } from "../dist/infrastructure/SvgReader.js";

class AcceptanceSession {
  constructor(t) {
    this.directory = mkdtempSync(join(tmpdir(), "svg-editor-acceptance-"));
    t.after(() => rmSync(this.directory, { recursive: true, force: true }));
    mkdirSync(join(this.directory, "examples"));
  }
  run(input) {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("../dist/main.js", import.meta.url))], {
      cwd: this.directory, encoding: "utf8", input,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    return result.stdout;
  }
  saved(name) {
    return new SvgReader().parse(readFileSync(join(this.directory, "examples", name), "utf8")).getDocument();
  }
}

test("assignment section 6 complete transcript has the expected state and exact specified errors", (t) => {
  const session = new AcceptanceSession(t);
  copyFileSync(new URL("../examples/other.svg", import.meta.url), join(session.directory, "examples", "other.svg"));
  const output = session.run(readFileSync(new URL("../examples/assignment-session.txt", import.meta.url), "utf8"));
  assert.deepEqual(output.match(/error:[^\r\n]*/g), [
    "error: cannot group a container into its own descendant: markers",
    "error: undo not allowed after io command",
  ]);
  assert.match(output, /warning: assigned id rect1 to unnamed <rect>/);
  assert.match(output, /read examples\/other.svg \(7 elements\)/);
  assert.match(output, /svg \(400x300\)/);
  const document = session.saved("assignment-session.svg");
  assert.equal(document.countShapes(), 5);
  assert.equal(document.find("title").getTextContent(), "My Diagram");
  assert.equal(document.find("c1").getAttributes().cx, "130");
  assert.equal(document.parentLabel("box"), "g#markers");
  assert.deepEqual(document.find("markers").getChildren().map(s => s.getId()), ["c1", "box"]);
});

test("assignment section 6.1 Chinese flowchart roundtrips with the correct eight-element count", (t) => {
  const session = new AcceptanceSession(t);
  const output = session.run(readFileSync(new URL("../examples/assignment-flowchart.txt", import.meta.url), "utf8"));
  assert.doesNotMatch(output, /error:/);
  assert.match(output, /saved to examples\/assignment-flowchart.svg \(8 elements\)/);
  const document = session.saved("assignment-flowchart.svg");
  assert.equal(document.countShapes(), 8);
  assert.equal(document.find("start-label").getTextContent(), "开始");
  assert.equal(document.find("process-label").getTextContent(), "处理数据 v2");
  assert.equal(document.find("process").getAttributes().y, "100");
  assert.equal(document.find("process-label").getAttributes().y, "135");
  assert.equal(document.parentLabel("arrow1"), "g#flowchart");
  assert.equal(document.parentLabel("process-label"), "g#node2");
});

test("required error catalogue is emitted exactly by the CLI", (t) => {
  const session = new AcceptanceSession(t);
  const output = session.run([
    "tree", "init", "create rect r1 0 0 1 1", "create rect r1 0 0 1 1", "move r9 1 2",
    "create rect r2 0 0 1 1 in node9", "create rect r2 0 0 1 1 in r1",
    "create hexagon hx", "create g scene", "ungroup scene", "create g nested in scene",
    "group bad scene nested", "scale r1 0", "set r1 font-size 12",
    "read missing.svg", "save missing/out.svg", "create box n1 0 0 1 1 label", "tree", "",
  ].join("\n"));
  assert.deepEqual(output.match(/error:[^\r\n]*/g), [
    "error: no document. use 'init' or 'read' first",
    "error: id already exists: r1",
    "error: no such shape: r9",
    "error: no such container: node9",
    "error: not a container: r1",
    "error: unknown shape type: hexagon (is the plugin loaded?)",
    "error: cannot ungroup top-level container: scene",
    "error: cannot group a container into its own descendant: scene",
    "error: scale factor must be positive",
    "error: unknown attribute: font-size",
    "error: cannot read file: missing.svg",
    "error: cannot write file: missing/out.svg",
    "error: unknown shape type: box (is the plugin loaded?)",
  ]);
  assert.match(output, /rect#r1  x=0 y=0 w=1 h=1/);
});
