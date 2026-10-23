import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class UngroupCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly values: readonly string[]) {}

  execute(): string {
    const document = this.session.getDocument();
    const args = new Arguments(this.values);
    args.requireCount([1], "ungroup <gid>");
    const id = args.text(0);
    const count = document.ungroup(id);
    return `g#${id} ungrouped (${count} children promoted)`;
  }
}
