import { SvgDocument } from "../domain/SvgDocument.js";
import type { DocumentStore } from "./DocumentStore.js";

export class EditorSession {
  private document?: SvgDocument;
  private filePath?: string;

  initialize(width: number, height: number): SvgDocument {
    // Construct and validate before replacing the current document.
    const document = new SvgDocument(width, height);
    this.document = document;
    this.filePath = undefined;
    return document;
  }

  getDocument(): SvgDocument {
    if (this.document === undefined) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    return this.document;
  }

  save(store: DocumentStore, filePath?: string): string {
    const document = this.getDocument();
    const target = filePath ?? this.filePath;
    if (target === undefined || target.trim() === "") {
      throw new Error("no file path. use 'save <file.svg>' first");
    }
    store.save(document, target);
    // Remember a new path only after the write succeeds.
    this.filePath = target;
    return target;
  }
}
