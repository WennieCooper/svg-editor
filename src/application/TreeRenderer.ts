import type { Shape } from "../domain/shapes/Shape.js";

export class TreeRenderer {
  subtree(shape: Shape): string {
    return [shape.describe(), ...this.children(shape.getChildren(), "")].join("\n");
  }

  children(shapes: readonly Shape[], prefix: string = ""): string[] {
    const lines: string[] = [];
    shapes.forEach((shape, index) => {
      const last = index === shapes.length - 1;
      lines.push(prefix + (last ? "└── " : "├── ") + shape.describe());
      lines.push(...this.children(shape.getChildren(), prefix + (last ? "    " : "│   ")));
    });
    return lines;
  }
}
