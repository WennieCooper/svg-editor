import { Geometry } from "../Geometry.js";
import { Shape } from "./Shape.js";

export class Circle extends Shape {
  constructor(id: string, cx: number, cy: number, r: number, fill?: string) {
    super(id, new Geometry({ cx, cy, r }, ["r"]), ["cx"], ["cy"]);
    if (fill !== undefined) this.setAttribute("fill", fill);
  }

  clone(): Circle {
    const a = this.getAttributes();
    return this.copyStylesTo(new Circle(this.getId(), Number(a.cx), Number(a.cy), Number(a.r)));
  }

  getType(): string { return "circle"; }

  describe(): string {
    const a = this.getAttributes();
    return `circle#${this.getId()}  cx=${a.cx} cy=${a.cy} r=${a.r}${this.styleDescription()}`;
  }
}
