import { Geometry } from "../Geometry.js";
import { Shape } from "./Shape.js";

export class Text extends Shape {
  constructor(id: string, x: number, y: number, private content: string) {
    super(id, new Geometry({ x, y }, []), ["x"], ["y"]);
  }

  getType(): string { return "text"; }

  override getTextContent(): string { return this.content; }

  override setAttribute(attribute: string, value: string): void {
    if (attribute === "text") this.content = value;
    else super.setAttribute(attribute, value);
  }

  describe(): string {
    const a = this.getAttributes();
    return `text#${this.getId()}  (${a.x},${a.y}) ${JSON.stringify(this.content)}${this.styleDescription()}`;
  }
}
