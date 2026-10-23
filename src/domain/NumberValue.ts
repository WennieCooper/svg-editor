export class NumberValue {
  static parse(token: string): number {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)) {
      throw new Error(`invalid number: ${token}`);
    }
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error(`invalid number: ${token}`);
    return value;
  }
}
