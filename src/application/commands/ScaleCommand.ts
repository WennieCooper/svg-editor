import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class ScaleCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly values: readonly string[]) {}

  execute(): string {
    const document = this.session.getDocument();
    const args = new Arguments(this.values);
    args.requireCount([2], "scale <id> <factor>");
    const shape = document.find(args.text(0));
    const factor = args.number(1);
    shape.scale(factor);
    return `${shape.getType()}#${shape.getId()} scaled by ${factor}`;
  }
}
