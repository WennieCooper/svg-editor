import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class DeleteCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly values: readonly string[]) {}

  execute(): string {
    const document = this.session.getDocument();
    const args = new Arguments(this.values);
    args.requireCount([1], "delete <id>");
    const shape = document.delete(args.text(0));
    return `${shape.getType()}#${shape.getId()} deleted`;
  }
}
