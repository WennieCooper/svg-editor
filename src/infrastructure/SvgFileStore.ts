import { randomUUID } from "node:crypto";
import { closeSync, openSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { DocumentStore } from "../application/DocumentStore.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { SvgWriter } from "./SvgWriter.js";

export class SvgFileStore implements DocumentStore {
  constructor(private readonly writer: SvgWriter = new SvgWriter()) {}

  save(document: SvgDocument, filePath: string): void {
    let descriptor: number | undefined;
    let temporaryPath: string | undefined;
    try {
      // Serialize before touching disk; stage beside the target before replacing it.
      const content = this.writer.serialize(document);
      const candidate = join(dirname(filePath), `.${basename(filePath)}.${randomUUID()}.tmp`);
      descriptor = openSync(candidate, "wx");
      temporaryPath = candidate;
      writeFileSync(descriptor, content, { encoding: "utf8" });
      closeSync(descriptor);
      descriptor = undefined;
      renameSync(candidate, filePath);
      temporaryPath = undefined;
    } catch {
      throw new Error(`cannot write file: ${filePath}`);
    } finally {
      if (descriptor !== undefined) {
        try { closeSync(descriptor); } catch { /* Preserve the original write error. */ }
      }
      if (temporaryPath !== undefined) {
        try { unlinkSync(temporaryPath); } catch { /* Best-effort staging cleanup. */ }
      }
    }
  }
}
