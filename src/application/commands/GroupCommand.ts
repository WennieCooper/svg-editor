import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class GroupCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly values: readonly string[]) {}

  execute(): string {
    const document = this.session.getDocument();
    if (this.values.length < 3) throw new Error("usage: group <newGid> <id1> <id2>...");
    const group = document.group(this.values[0]!, this.values.slice(1));
    return `g#${group.getId()} created with ${group.getChildren().length} children`;
  }
}
