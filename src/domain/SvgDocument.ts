import type { Shape } from "./shapes/Shape.js";

export class SvgDocument {
  private readonly shapes = new Map<string, Shape>();

  constructor(
    private readonly width: number = 800,
    private readonly height: number = 600,
  ) {
    if (![width, height].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error("canvas dimensions must be positive finite numbers");
    }
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  add(shape: Shape): void {
    const id = shape.getId();
    if (this.shapes.has(id)) {
      throw new Error(`id already exists: ${id}`);
    }
    this.shapes.set(id, shape);
  }

  find(id: string): Shape {
    const shape = this.shapes.get(id);
    if (shape === undefined) {
      throw new Error(`no such shape: ${id}`);
    }
    return shape;
  }

  getShapes(): readonly Shape[] {
    return [...this.shapes.values()];
  }
}
