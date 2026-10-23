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
    if (this.values.length < 2) throw new Error("usage: create <type> <id> [params...] [in <containerId>]");
    const values = [...this.values];
    // Only a final pair is a clause: a text content token equal to "in" stays content.
    let containerId: string | undefined;
    if (values.length >= 4 && values[values.length - 2] === "in") {
      containerId = values.pop()!;
      values.pop();
    }
    const args = new Arguments(values);
    const shape = this.factory.create(args.text(0), values.slice(1));
    document.add(shape, containerId);
    const parent = containerId === undefined ? "" : ` in g#${containerId}`;
    return `${shape.getType()}#${shape.getId()} created${parent}`;
  }
}
