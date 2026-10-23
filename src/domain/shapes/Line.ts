import { Geometry } from "../Geometry.js";
import { Shape } from "./Shape.js";

export class Line extends Shape {
  constructor(id: string, x1: number, y1: number, x2: number, y2: number, stroke?: string) {
    super(id, new Geometry({ x1, y1, x2, y2 }, []), ["x1", "x2"], ["y1", "y2"]);
    if (stroke !== undefined) this.setAttribute("stroke", stroke);
  }

  clone(): Line {
    const a = this.getAttributes();
    return this.copyStylesTo(new Line(this.getId(), Number(a.x1), Number(a.y1), Number(a.x2), Number(a.y2)));
  }

  getType(): string { return "line"; }

  describe(): string {
    const a = this.getAttributes();
    return `line#${this.getId()}  (${a.x1},${a.y1}) -> (${a.x2},${a.y2})${this.styleDescription()}`;
  }
}
