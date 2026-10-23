import { Geometry } from "../Geometry.js";
import { NumberValue } from "../NumberValue.js";

export abstract class Shape {
  private readonly styles = new Map<string, string>();
  private readonly xNames: readonly string[];
  private readonly yNames: readonly string[];

  constructor(
    private readonly id: string,
    private readonly geometry: Geometry,
    xNames: readonly string[],
    yNames: readonly string[],
  ) {
    if (id.length === 0 || /\s/.test(id)) {
      throw new Error("id must be non-empty and contain no whitespace");
    }
    this.xNames = [...xNames];
    this.yNames = [...yNames];
  }

  getId(): string { return this.id; }

  abstract getType(): string;
  abstract describe(): string;

  getAttributes(): Readonly<Record<string, string>> {
    return { id: this.id, ...this.geometry.attributes(), ...Object.fromEntries(this.styles) };
  }

  getTextContent(): string | undefined { return undefined; }
  isContainer(): boolean { return false; }
  getChildren(): readonly Shape[] { return []; }

  contains(shape: Shape): boolean {
    return this === shape || this.getChildren().some((child) => child.contains(shape));
  }

  move(dx: number, dy: number): void { this.planMove(dx, dy)(); }
  scale(factor: number): void { this.planScale(factor)(); }

  planMove(dx: number, dy: number): () => void {
    return this.geometry.planMove(dx, dy, this.xNames, this.yNames);
  }

  planScale(factor: number): () => void {
    return this.geometry.planScale(factor);
  }

  setAttribute(attribute: string, value: string): void {
    if (this.geometry.has(attribute)) {
      this.geometry.set(attribute, value);
    } else if (attribute === "fill" || attribute === "stroke") {
      if (value.trim() === "") throw new Error(`${attribute} must not be empty`);
      this.styles.set(attribute, value);
    } else if (attribute === "stroke-width") {
      const number = NumberValue.parse(value);
      if (number < 0) throw new Error("stroke-width must be non-negative");
      this.styles.set(attribute, String(number));
    } else {
      throw new Error(`unknown attribute: ${attribute}`);
    }
  }

  protected styleDescription(): string {
    return [...this.styles].map(([name, value]) => ` ${name}=${value}`).join("");
  }
}
