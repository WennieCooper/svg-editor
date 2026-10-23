import { Group } from "../domain/shapes/Group.js";
import { Rect } from "../domain/shapes/Rect.js";
import { Circle } from "../domain/shapes/Circle.js";
import { Ellipse } from "../domain/shapes/Ellipse.js";
import { Line } from "../domain/shapes/Line.js";
import { Text } from "../domain/shapes/Text.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { ShapeDefinition } from "./ShapeDefinition.js";

export class ShapeFactory {
  // The sole shape-name dispatch registry, shared by CLI creation and SVG import.
  private readonly definitions = new Map<string, ShapeDefinition>([
    ["g", new ShapeDefinition([], (id) => new Group(id), "create g <id>")],
    ["rect", new ShapeDefinition(["x", "y", "width", "height"],
      (id, a) => new Rect(id, a[0]!, a[1]!, a[2]!, a[3]!),
      "create rect <id> <x> <y> <w> <h> [fill]", "fill")],
    ["circle", new ShapeDefinition(["cx", "cy", "r"],
      (id, a) => new Circle(id, a[0]!, a[1]!, a[2]!),
      "create circle <id> <cx> <cy> <r> [fill]", "fill")],
    ["ellipse", new ShapeDefinition(["cx", "cy", "rx", "ry"],
      (id, a) => new Ellipse(id, a[0]!, a[1]!, a[2]!, a[3]!),
      "create ellipse <id> <cx> <cy> <rx> <ry> [fill]", "fill")],
    ["line", new ShapeDefinition(["x1", "y1", "x2", "y2"],
      (id, a) => new Line(id, a[0]!, a[1]!, a[2]!, a[3]!),
      "create line <id> <x1> <y1> <x2> <y2> [stroke]", "stroke")],
    ["text", new ShapeDefinition(["x", "y"],
      (id, a, text) => new Text(id, a[0]!, a[1]!, text),
      'create text <id> <x> <y> "content"', undefined, true)],
  ]);

  create(type: string, values: readonly string[]): Shape {
    return this.definition(type).create(values);
  }

  read(type: string, id: string, attributes: Readonly<Record<string, string>>, text: string): Shape {
    return this.definition(type).read(id, attributes, text);
  }

  private definition(type: string): ShapeDefinition {
    const definition = this.definitions.get(type);
    if (definition === undefined) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return definition;
  }
}
