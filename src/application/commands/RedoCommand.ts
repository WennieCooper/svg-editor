import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class RedoCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly values: readonly string[]) {}

  execute(): string {
    this.session.getDocument();
    new Arguments(this.values).requireCount([0], "redo");
    return this.session.getHistory().redo();
  }
}
