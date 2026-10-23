import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class SetCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly values: readonly string[]) {}

  execute(): string {
    const document = this.session.getDocument();
    const args = new Arguments(this.values);
    args.requireCount([3], "set <id> <attr> <value>");
    const shape = document.find(args.text(0));
    const attribute = args.text(1);
    const value = args.text(2);
    shape.setAttribute(attribute, value);
    return `${shape.getType()}#${shape.getId()} updated: ${attribute}=${JSON.stringify(value)}`;
  }
}
