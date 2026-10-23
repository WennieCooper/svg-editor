import { DocumentSnapshot } from "../../domain/DocumentSnapshot.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class UndoableCommand implements Command {
  private before?: DocumentSnapshot;
  private after?: DocumentSnapshot;
  private summary = "";

  constructor(private readonly command: Command, private readonly session: EditorSession) {}

  execute(): string {
    const before = new DocumentSnapshot(this.session.getDocument());
    try {
      const summary = this.command.execute();
      const after = new DocumentSnapshot(this.session.getDocument());
      this.before = before;
      this.after = after;
      this.summary = summary;
      this.session.getHistory().record(this);
      return summary;
    } catch (error) {
      // Failed edits restore document state and never touch history or redo.
      this.session.restoreDocument(before.restore());
      throw error;
    }
  }

  undo(): string {
    if (this.before === undefined) throw new Error("command has not executed");
    this.session.restoreDocument(this.before.restore());
    return `undone: ${this.summary}`;
  }

  redo(): string {
    if (this.after === undefined) throw new Error("command has not executed");
    this.session.restoreDocument(this.after.restore());
    return `redone: ${this.summary}`;
  }
}
