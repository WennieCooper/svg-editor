import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const files = [];
const visit = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (path.endsWith(".ts")) files.push(path);
  }
};
visit(sourceRoot);
const allowed = {
  cli: new Set(["cli", "application"]),
  application: new Set(["application", "domain"]),
  domain: new Set(["domain"]),
  infrastructure: new Set(["infrastructure", "application", "domain"]),
};

test("source imports respect the documented module directions and IO boundary", () => {
  for (const path of files) {
    const module = relative(sourceRoot, path).split(sep)[0];
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      const specifier = statement.moduleSpecifier.text;
      if (specifier.startsWith(".")) {
        const target = relative(sourceRoot, resolve(dirname(path), specifier)).split(sep)[0];
        assert.ok(module === "main.ts" || allowed[module]?.has(target),
          relative(sourceRoot, path) + " must not depend on " + target);
      } else {
        assert.ok(module === "main.ts" || module === "cli" || module === "infrastructure",
          relative(sourceRoot, path) + " contains external/IO dependency " + specifier);
      }
    }
  }
});

test("production classes use one class per matching file and have no top-level free functions", () => {
  for (const path of files) {
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
    const classes = source.statements.filter(ts.isClassDeclaration);
    assert.ok(classes.length <= 1, path);
    if (classes.length === 1) assert.equal(classes[0].name.text, basename(path, ".ts"));
    assert.equal(source.statements.filter(ts.isFunctionDeclaration).length, 0, path);
    const inspect = node => {
      if (ts.isSwitchStatement(node)) assert.equal(basename(path), "CommandDispatcher.ts", path);
      ts.forEachChild(node, inspect);
    };
    inspect(source);
  }
});
