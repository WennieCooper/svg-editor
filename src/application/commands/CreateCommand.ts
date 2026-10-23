import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { ShapeFactory } from "../ShapeFactory.js";
import type { Command } from "./Command.js";

export class CreateCommand implements Command {
  constructor(
    private readonly session: EditorSession,
    private readonly factory: ShapeFactory,
    private readonly values: readonly string[],
  ) {}

  execute(): string {
    const document = this.session.getDocument();
    if (this.values.length < 2) {
      throw new Error("usage: create rect <id> <x> <y> <w> <h> [fill]");
    }
    const args = new Arguments(this.values);
    const shape = this.factory.create(args.text(0), this.values.slice(1));
    document.add(shape);
    return `${shape.getType()}#${shape.getId()} created`;
  }
}
