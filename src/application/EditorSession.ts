import { CommandHistory } from "./CommandHistory.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import type { DocumentStore } from "./DocumentStore.js";

export class EditorSession {
  private readonly history = new CommandHistory();
  private document?: SvgDocument;
  private filePath?: string;

  initialize(width: number, height: number): SvgDocument {
    // Construct and validate before replacing the current document.
    const document = new SvgDocument(width, height);
    this.document = document;
    this.filePath = undefined;
    this.history.block();
    return document;
  }

  getHistory(): CommandHistory { return this.history; }

  restoreDocument(document: SvgDocument): void {
    // History restores model state only, preserving the successful IO path.
    this.document = document;
  }

  resize(width: number, height: number): void {
    this.getDocument().resize(width, height);
    this.history.block();
  }

  getDocument(): SvgDocument {
    if (this.document === undefined) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    return this.document;
  }

  read(store: DocumentStore, filePath: string): readonly string[] {
    const result = store.read(filePath);
    // No state is replaced until file parsing, validation and id assignment all succeed.
    this.document = result.getDocument();
    this.filePath = filePath;
    this.history.block();
    return result.getWarnings();
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
    this.history.block();
    return target;
  }
}
