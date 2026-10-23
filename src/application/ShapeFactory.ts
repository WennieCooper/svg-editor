import { Rect } from "../domain/shapes/Rect.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { Arguments } from "./Arguments.js";

export class ShapeFactory {
  create(type: string, values: readonly string[]): Shape {
    // The only shape-name dispatch point; extend here in the next stage.
    switch (type) {
      case "rect": {
        const args = new Arguments(values);
        args.requireCount([5, 6], "create rect <id> <x> <y> <w> <h> [fill]");
        return new Rect(
          args.text(0),
          args.number(1),
          args.number(2),
          args.number(3),
          args.number(4),
          args.optionalText(5),
        );
      }
      default:
        throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }
}
