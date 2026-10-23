import { Geometry } from "../Geometry.js";
import { Shape } from "./Shape.js";

export class Rect extends Shape {
  constructor(id: string, x: number, y: number, width: number, height: number, fill?: string) {
    super(id, new Geometry({ x, y, width, height }, ["width", "height"]), ["x"], ["y"]);
    if (fill !== undefined) this.setAttribute("fill", fill);
  }

  getType(): string { return "rect"; }

  describe(): string {
    const a = this.getAttributes();
    return `rect#${this.getId()}  x=${a.x} y=${a.y} w=${a.width} h=${a.height}${this.styleDescription()}`;
  }
}
