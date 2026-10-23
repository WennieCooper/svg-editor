import { Arguments } from "../Arguments.js";
import type { DocumentStore } from "../DocumentStore.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class ReadCommand implements Command {
  constructor(
    private readonly session: EditorSession,
    private readonly store: DocumentStore,
    private readonly values: readonly string[],
  ) {}

  execute(): string {
    const args = new Arguments(this.values);
    args.requireCount([1], "read <file.svg>");
    const filePath = args.text(0);
    const warnings = this.session.read(this.store, filePath);
    return [...warnings, `read ${filePath} (${this.session.getDocument().countShapes()} elements)`].join("\n");
  }
}
