export abstract class Shape {
  constructor(private readonly id: string) {
    if (id.length === 0 || /\s/.test(id)) {
      throw new Error("id must be non-empty and contain no whitespace");
    }
  }

  getId(): string {
    return this.id;
  }

  abstract getType(): string;

  abstract describe(): string;
}
