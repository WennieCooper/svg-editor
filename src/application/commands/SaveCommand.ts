import { Arguments } from "../Arguments.js";
import type { DocumentStore } from "../DocumentStore.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class SaveCommand implements Command {
  constructor(
    private readonly session: EditorSession,
    private readonly store: DocumentStore,
    private readonly values: readonly string[],
  ) {}

  execute(): string {
    const document = this.session.getDocument();
    const args = new Arguments(this.values);
    args.requireCount([0, 1], "save [file.svg]");
    const filePath = this.session.save(this.store, args.optionalText(0));
    return `saved to ${filePath} (${document.getShapes().length} elements)`;
  }
}
