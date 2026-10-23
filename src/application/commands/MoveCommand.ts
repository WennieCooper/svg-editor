import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class MoveCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly values: readonly string[]) {}

  execute(): string {
    const document = this.session.getDocument();
    const args = new Arguments(this.values);
    args.requireCount([3], "move <id> <dx> <dy>");
    const shape = document.find(args.text(0));
    const dx = args.number(1);
    const dy = args.number(2);
    shape.move(dx, dy);
    return `${shape.getType()}#${shape.getId()} moved by (${dx},${dy})`;
  }
}
