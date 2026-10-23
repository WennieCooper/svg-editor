import type { SvgDocument } from "./SvgDocument.js";

export class DocumentSnapshot {
  private readonly document: SvgDocument;

  constructor(document: SvgDocument) {
    this.document = document.clone();
  }

  restore(): SvgDocument {
    // Each restoration returns a fresh graph; callers cannot mutate this snapshot.
    return this.document.clone();
  }
}
