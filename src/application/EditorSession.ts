import { SvgDocument } from "../domain/SvgDocument.js";

export class EditorSession {
  private document?: SvgDocument;

  initialize(width: number, height: number): SvgDocument {
    // Construct and validate before replacing the current document.
    const document = new SvgDocument(width, height);
    this.document = document;
    return document;
  }

  getDocument(): SvgDocument {
    if (this.document === undefined) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    return this.document;
  }
}
