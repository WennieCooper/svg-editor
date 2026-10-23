import { NumberValue } from "./NumberValue.js";

export class Geometry {
  private values: Record<string, number>;
  private readonly nonNegative: ReadonlySet<string>;

  constructor(values: Readonly<Record<string, number>>, nonNegative: readonly string[]) {
    this.nonNegative = new Set(nonNegative);
    this.validate(values);
    this.values = { ...values };
  }

  has(attribute: string): boolean { return Object.hasOwn(this.values, attribute); }

  attributes(): Record<string, string> {
    return Object.fromEntries(Object.entries(this.values).map(([key, value]) => [key, String(value)]));
  }

  set(attribute: string, value: string): void {
    if (!this.has(attribute)) throw new Error(`unknown attribute: ${attribute}`);
    const next = { ...this.values, [attribute]: NumberValue.parse(value) };
    this.validate(next);
    this.values = next;
  }

  planMove(dx: number, dy: number, xNames: readonly string[], yNames: readonly string[]): () => void {
    if (![dx, dy].every(Number.isFinite)) throw new Error("offsets must be finite numbers");
    const next = { ...this.values };
    for (const name of xNames) next[name] = this.values[name]! + dx;
    for (const name of yNames) next[name] = this.values[name]! + dy;
    this.validate(next);
    return () => { this.values = next; };
  }

  planScale(factor: number): () => void {
    if (!Number.isFinite(factor) || factor <= 0) throw new Error("scale factor must be positive");
    const next = Object.fromEntries(Object.entries(this.values).map(([key, value]) => [key, value * factor]));
    this.validate(next);
    return () => { this.values = next; };
  }

  private validate(values: Readonly<Record<string, number>>): void {
    for (const [name, value] of Object.entries(values)) {
      if (!Number.isFinite(value)) throw new Error("geometry must contain finite numbers");
      if (this.nonNegative.has(name) && value < 0) throw new Error(`${name} must be non-negative`);
    }
  }
}
