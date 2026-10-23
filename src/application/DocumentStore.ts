import type { ReadResult } from "./ReadResult.js";
import type { SvgDocument } from "../domain/SvgDocument.js";

export interface DocumentStore {
  read(filePath: string): ReadResult;
  save(document: SvgDocument, filePath: string): void;
}
