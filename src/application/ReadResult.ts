import type { SvgDocument } from "../domain/SvgDocument.js";

export class ReadResult {
  private readonly warnings: readonly string[];

  constructor(private readonly document: SvgDocument, warnings: readonly string[]) {
    this.warnings = [...warnings];
  }

  getDocument(): SvgDocument { return this.document; }
  getWarnings(): readonly string[] { return [...this.warnings]; }
}
