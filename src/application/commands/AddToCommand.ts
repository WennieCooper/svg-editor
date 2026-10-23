import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class AddToCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly values: readonly string[]) {}

  execute(): string {
    const document = this.session.getDocument();
    const args = new Arguments(this.values);
    args.requireCount([2], "addto <gid> <id>");
    const gid = args.text(0);
    const id = args.text(1);
    document.addTo(gid, id);
    return `${document.find(id).getType()}#${id} moved into g#${gid}`;
  }
}
