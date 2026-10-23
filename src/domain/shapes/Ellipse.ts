import { Geometry } from "../Geometry.js";
import { Shape } from "./Shape.js";

export class Ellipse extends Shape {
  constructor(id: string, cx: number, cy: number, rx: number, ry: number, fill?: string) {
    super(id, new Geometry({ cx, cy, rx, ry }, ["rx", "ry"]), ["cx"], ["cy"]);
    if (fill !== undefined) this.setAttribute("fill", fill);
  }

  getType(): string { return "ellipse"; }

  describe(): string {
    const a = this.getAttributes();
    return `ellipse#${this.getId()}  cx=${a.cx} cy=${a.cy} rx=${a.rx} ry=${a.ry}${this.styleDescription()}`;
  }
}
