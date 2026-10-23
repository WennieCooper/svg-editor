import { NumberValue } from "../domain/NumberValue.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { Arguments } from "./Arguments.js";

export class ShapeDefinition {
  constructor(
    private readonly geometryNames: readonly string[],
    private readonly createShape: (id: string, geometry: readonly number[], content: string) => Shape,
    private readonly usage: string,
    private readonly styleArgument?: "fill" | "stroke",
    private readonly hasText: boolean = false,
  ) {}

  create(values: readonly string[]): Shape {
    const args = new Arguments(values);
    const required = 1 + this.geometryNames.length + (this.hasText ? 1 : 0);
    args.requireCount(this.styleArgument === undefined ? [required] : [required, required + 1], this.usage);
    const geometry = this.geometryNames.map((_name, index) => args.number(index + 1));
    const content = this.hasText ? args.text(required - 1) : "";
    const shape = this.createShape(args.text(0), geometry, content);
    const style = args.optionalText(required);
    if (this.styleArgument !== undefined && style !== undefined) shape.setAttribute(this.styleArgument, style);
    return shape;
  }

  read(id: string, attributes: Readonly<Record<string, string>>, content: string): Shape {
    const geometry = this.geometryNames.map((name) => {
      const value = (attributes[name] ?? "0").trim();
      return NumberValue.parse(value.endsWith("px") ? value.slice(0, -2) : value);
    });
    const shape = this.createShape(id, geometry, content);
    for (const [name, value] of Object.entries(attributes)) {
      if (name !== "id" && !this.geometryNames.includes(name)) shape.importAttribute(name, value);
    }
    return shape;
  }
}
