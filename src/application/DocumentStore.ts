import type { SvgDocument } from "../domain/SvgDocument.js";

export interface DocumentStore {
  save(document: SvgDocument, filePath: string): void;
}
