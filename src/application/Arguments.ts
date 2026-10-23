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
    const token = this.text(index);
    // Accept signed decimal/scientific notation, but not blank, hex or Infinity.
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)) {
      throw new Error(`invalid number: ${token}`);
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      throw new Error(`invalid number: ${token}`);
    }
    return value;
  }

  optionalText(index: number): string | undefined {
    return this.values[index];
  }
}
