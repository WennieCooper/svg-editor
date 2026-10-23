import type { UndoableCommand } from "./commands/UndoableCommand.js";

export class CommandHistory {
  private readonly undoStack: UndoableCommand[] = [];
  private readonly redoStack: UndoableCommand[] = [];
  private blocked = false;

  record(command: UndoableCommand): void {
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.blocked = false;
  }

  block(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.blocked = true;
  }

  undo(): string {
    this.requireAllowed();
    const command = this.undoStack.at(-1);
    if (command === undefined) throw new Error("nothing to undo");
    const result = command.undo();
    this.undoStack.pop();
    this.redoStack.push(command);
    return result;
  }

  redo(): string {
    this.requireAllowed();
    const command = this.redoStack.at(-1);
    if (command === undefined) throw new Error("nothing to redo");
    const result = command.redo();
    this.redoStack.pop();
    this.undoStack.push(command);
    return result;
  }

  private requireAllowed(): void {
    if (this.blocked) throw new Error("undo not allowed after io command");
  }
}
