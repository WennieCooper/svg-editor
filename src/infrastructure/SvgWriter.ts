import type { SvgDocument } from "../domain/SvgDocument.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { XmlEncoder } from "./XmlEncoder.js";

export class SvgWriter {
  private readonly encoder = new XmlEncoder();

  serialize(document: SvgDocument): string {
    const width = document.getWidth();
    const height = document.getHeight();
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      ...document.getShapes().flatMap((shape) => this.element(shape, "  ")),
      "</svg>", "",
    ].join("\n");
  }

  private element(shape: Shape, indent: string): string[] {
    const attributes = Object.entries(shape.getAttributes())
      .map(([name, value]) => `${name}="${this.encoder.attribute(value)}"`).join(" ");
    const tag = shape.getType();
    const text = shape.getTextContent();
    if (text !== undefined) {
      return [`${indent}<${tag} ${attributes}>${this.encoder.text(text)}</${tag}>`];
    }
    const children = shape.getChildren();
    if (children.length === 0) return [`${indent}<${tag} ${attributes}/>`];
    return [`${indent}<${tag} ${attributes}>`,
      ...children.flatMap((child) => this.element(child, indent + "  ")),
      `${indent}</${tag}>`];
  }
}
