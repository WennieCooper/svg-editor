import { DOMParser } from "@xmldom/xmldom";
import type { Element, Node } from "@xmldom/xmldom";
import { ReadResult } from "../application/ReadResult.js";
import { ShapeFactory } from "../application/ShapeFactory.js";
import { NumberValue } from "../domain/NumberValue.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import { XmlEncoder } from "./XmlEncoder.js";

export class SvgReader {
  private static readonly namespace = "http://www.w3.org/2000/svg";

  constructor(private readonly factory: ShapeFactory = new ShapeFactory()) {}

  parse(source: string): ReadResult {
    try {
      new XmlEncoder().validate(source);
      const xml = new DOMParser({ onError: (_level, message) => { throw new Error(message); } })
        .parseFromString(source, "application/xml");
      if (xml.doctype !== null) throw new Error("DOCTYPE is not supported");
      const root = xml.documentElement;
      if (root === null || this.name(root) !== "svg") throw new Error("expected an svg root");
      this.validateNamespace(root);
      const attributes = this.attributes(root);
      const viewBox = attributes.viewBox;
      const box = viewBox === undefined ? undefined : SvgDocument.parseViewBox(viewBox);
      const width = this.length(attributes.width, box?.[2] ?? 800);
      const height = this.length(attributes.height, box?.[3] ?? 600);
      const document = new SvgDocument(width, height);
      if (viewBox !== undefined) document.setViewBox(viewBox);
      if (attributes.id !== undefined && attributes.id !== "") document.setRootId(attributes.id);
      for (const [name, value] of Object.entries(attributes)) {
        if (!["id", "width", "height", "viewBox", "version"].includes(name)) document.importAttribute(name, value);
      }

      const elements = this.descendants(root);
      const used = new Set<string>();
      const rootId = document.getRootId();
      if (rootId !== undefined) used.add(rootId);
      // Reserve ALL explicit ids before assigning missing ones (including later siblings).
      for (const element of elements) {
        this.validateNamespace(element);
        const id = element.getAttribute("id");
        if (id !== null && id !== "") {
          if (used.has(id)) throw new Error(`id already exists: ${id}`);
          used.add(id);
        }
      }
      const assigned = new Map<Element, string>();
      const warnings: string[] = [];
      for (const element of elements) {
        let id = element.getAttribute("id");
        if (id === null || id === "") {
          let sequence = 1;
          do { id = this.name(element) + sequence++; } while (used.has(id));
          used.add(id);
          warnings.push(`warning: assigned id ${id} to unnamed <${this.name(element)}>`);
        }
        assigned.set(element, id);
      }

      const append = (parent: Element, containerId?: string): void => {
        for (const element of this.children(parent)) {
          const id = assigned.get(element)!;
          const shape = this.factory.read(this.name(element), id, this.attributes(element), this.text(element));
          const children = this.children(element);
          if (!shape.isContainer() && children.length > 0) {
            throw new Error(`child elements not supported in <${this.name(element)}>`);
          }
          if (shape.getTextContent() === undefined) this.requireNoText(element);
          document.add(shape, containerId);
          if (shape.isContainer()) append(element, shape.getId());
        }
      };
      this.requireNoText(root);
      append(root);
      return new ReadResult(document, warnings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid XML";
      throw new Error(`invalid SVG: ${message.replace(/[\r\n]+/g, " ")}`);
    }
  }

  private name(element: Element): string { return element.localName ?? element.tagName; }

  private length(value: string | undefined, fallback: number): number {
    if (value === undefined) return fallback;
    const token = value.trim();
    return NumberValue.parse(token.endsWith("px") ? token.slice(0, -2) : token);
  }

  private validateNamespace(element: Element): void {
    if (element.namespaceURI !== null && element.namespaceURI !== SvgReader.namespace) {
      throw new Error(`unsupported namespace on <${element.tagName}>`);
    }
  }

  private attributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = Object.create(null) as Record<string, string>;
    for (let index = 0; index < element.attributes.length; index++) {
      const attribute = element.attributes.item(index)!;
      if (attribute.namespaceURI === "http://www.w3.org/2000/xmlns/") continue;
      attributes[attribute.name] = attribute.value;
    }
    return attributes;
  }

  private children(element: Element): Element[] {
    const result: Element[] = [];
    for (let index = 0; index < element.childNodes.length; index++) {
      const node = element.childNodes.item(index)!;
      if (node.nodeType === 1) result.push(node as Element);
    }
    return result;
  }

  private descendants(element: Element): Element[] {
    return this.children(element).flatMap((child) => [child, ...this.descendants(child)]);
  }

  private text(element: Element): string {
    let content = "";
    for (let index = 0; index < element.childNodes.length; index++) {
      const node = element.childNodes.item(index)!;
      if (this.isText(node)) content += node.nodeValue ?? "";
    }
    return content;
  }

  private requireNoText(element: Element): void {
    if (this.text(element).trim() !== "") throw new Error(`unexpected text in <${this.name(element)}>`);
  }

  private isText(node: Node): boolean { return node.nodeType === 3 || node.nodeType === 4; }
}
