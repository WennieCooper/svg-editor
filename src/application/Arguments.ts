import { NumberValue } from "../domain/NumberValue.js";

export class Arguments {
  private readonly values: readonly string[];

  constructor(values: readonly string[]) {
    this.values = [...values];
  }

  requireCount(allowed: readonly number[], usage: string): void {
    if (!allowed.includes(this.values.length)) {
      throw new Error(`usage: ${usage}`);
    }
  }

  text(index: number): string {
    const value = this.values[index];
    if (value === undefined) {
      throw new Error("missing argument");
    }
    return value;
  }

  number(index: number): number {
    return NumberValue.parse(this.text(index));
  }

  optionalText(index: number): string | undefined {
    return this.values[index];
  }
}
