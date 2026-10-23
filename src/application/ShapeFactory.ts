import { Group } from "../domain/shapes/Group.js";
import { Rect } from "../domain/shapes/Rect.js";
import { Circle } from "../domain/shapes/Circle.js";
import { Ellipse } from "../domain/shapes/Ellipse.js";
import { Line } from "../domain/shapes/Line.js";
import { Text } from "../domain/shapes/Text.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { Arguments } from "./Arguments.js";

export class ShapeFactory {
  create(type: string, values: readonly string[]): Shape {
    const args = new Arguments(values);
    // The only shape-name dispatch point; all six built-in types are registered here.
    switch (type) {
      case "g":
        args.requireCount([1], "create g <id>");
        return new Group(args.text(0));
      case "rect":
        args.requireCount([5, 6], "create rect <id> <x> <y> <w> <h> [fill]");
        return new Rect(args.text(0), args.number(1), args.number(2), args.number(3), args.number(4), args.optionalText(5));
      case "circle":
        args.requireCount([4, 5], "create circle <id> <cx> <cy> <r> [fill]");
        return new Circle(args.text(0), args.number(1), args.number(2), args.number(3), args.optionalText(4));
      case "ellipse":
        args.requireCount([5, 6], "create ellipse <id> <cx> <cy> <rx> <ry> [fill]");
        return new Ellipse(args.text(0), args.number(1), args.number(2), args.number(3), args.number(4), args.optionalText(5));
      case "line":
        args.requireCount([5, 6], "create line <id> <x1> <y1> <x2> <y2> [stroke]");
        return new Line(args.text(0), args.number(1), args.number(2), args.number(3), args.number(4), args.optionalText(5));
      case "text":
        args.requireCount([4], 'create text <id> <x> <y> "content"');
        return new Text(args.text(0), args.number(1), args.number(2), args.text(3));
      default:
        throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }
}
