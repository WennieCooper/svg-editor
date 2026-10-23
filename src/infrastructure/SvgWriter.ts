import type { SvgDocument } from "../domain/SvgDocument.js";
import { XmlEncoder } from "./XmlEncoder.js";

export class SvgWriter {
  private readonly encoder = new XmlEncoder();

  serialize(document: SvgDocument): string {
    const width = document.getWidth();
    const height = document.getHeight();
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ];
    for (const shape of document.getShapes()) {
      const attributes = Object.entries(shape.getAttributes())
        .map(([name, value]) => `${name}="${this.encoder.attribute(value)}"`)
        .join(" ");
      const text = shape.getTextContent();
      const tag = shape.getType();
      lines.push(text === undefined
        ? `  <${tag} ${attributes}/>`
        : `  <${tag} ${attributes}>${this.encoder.text(text)}</${tag}>`);
    }
    lines.push("</svg>", "");
    return lines.join("\n");
  }
}
