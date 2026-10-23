import { Shape } from "./Shape.js";

export class Rect extends Shape {
  constructor(
    id: string,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    private readonly fill?: string,
  ) {
    super(id);
    if (![x, y, width, height].every(Number.isFinite)) {
      throw new Error("rectangle geometry must contain finite numbers");
    }
    if (width < 0 || height < 0) {
      throw new Error("rectangle width and height must be non-negative");
    }
    if (fill !== undefined && fill.length === 0) {
      throw new Error("fill must not be empty");
    }
  }

  getType(): string {
    return "rect";
  }

  getAttributes(): Readonly<Record<string, string>> {
    const attributes: Record<string, string> = {
      id: this.getId(),
      x: String(this.x),
      y: String(this.y),
      width: String(this.width),
      height: String(this.height),
    };
    if (this.fill !== undefined) {
      attributes.fill = this.fill;
    }
    return attributes;
  }

  describe(): string {
    const style = this.fill === undefined ? "" : ` fill=${this.fill}`;
    return `rect#${this.getId()}  x=${this.x} y=${this.y} w=${this.width} h=${this.height}${style}`;
  }
}
