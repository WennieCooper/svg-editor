import { UndoableCommand } from "./commands/UndoableCommand.js";
import { UndoCommand } from "./commands/UndoCommand.js";
import { RedoCommand } from "./commands/RedoCommand.js";
import { DeleteCommand } from "./commands/DeleteCommand.js";
import { FrontCommand } from "./commands/FrontCommand.js";
import { BackCommand } from "./commands/BackCommand.js";
import { CanvasCommand } from "./commands/CanvasCommand.js";
import { GroupCommand } from "./commands/GroupCommand.js";
import { UngroupCommand } from "./commands/UngroupCommand.js";
import { AddToCommand } from "./commands/AddToCommand.js";
import { MoveCommand } from "./commands/MoveCommand.js";
import { ScaleCommand } from "./commands/ScaleCommand.js";
import { SetCommand } from "./commands/SetCommand.js";
import { ShowCommand } from "./commands/ShowCommand.js";
import type { DocumentStore } from "./DocumentStore.js";
import { SaveCommand } from "./commands/SaveCommand.js";
import type { Command } from "./commands/Command.js";
import { CreateCommand } from "./commands/CreateCommand.js";
import { HelpCommand } from "./commands/HelpCommand.js";
import { InitCommand } from "./commands/InitCommand.js";
import { TreeCommand } from "./commands/TreeCommand.js";
import type { EditorSession } from "./EditorSession.js";
import type { ShapeFactory } from "./ShapeFactory.js";

export class CommandDispatcher {
  constructor(
    private readonly session: EditorSession,
    private readonly factory: ShapeFactory,
    private readonly store: DocumentStore,
  ) {}

  execute(tokens: readonly string[]): string {
    const name = tokens[0];
    if (name === undefined) {
      return "";
    }
    return this.createCommand(name, tokens.slice(1)).execute();
  }

  private createCommand(name: string, args: readonly string[]): Command {
    // The only command-name dispatch point; later replace with registration.
    switch (name) {
      case "undo":
        return new UndoCommand(this.session, args);
      case "redo":
        return new RedoCommand(this.session, args);
      case "help":
        return new HelpCommand(args);
      case "init":
        return new InitCommand(this.session, args);
      case "create":
        return new UndoableCommand(new CreateCommand(this.session, this.factory, args), this.session);
      case "delete":
        return new UndoableCommand(new DeleteCommand(this.session, args), this.session);
      case "front":
        return new UndoableCommand(new FrontCommand(this.session, args), this.session);
      case "back":
        return new UndoableCommand(new BackCommand(this.session, args), this.session);
      case "canvas":
        return new CanvasCommand(this.session, args);
      case "group":
        return new UndoableCommand(new GroupCommand(this.session, args), this.session);
      case "ungroup":
        return new UndoableCommand(new UngroupCommand(this.session, args), this.session);
      case "addto":
        return new UndoableCommand(new AddToCommand(this.session, args), this.session);
      case "move":
        return new UndoableCommand(new MoveCommand(this.session, args), this.session);
      case "scale":
        return new UndoableCommand(new ScaleCommand(this.session, args), this.session);
      case "set":
        return new UndoableCommand(new SetCommand(this.session, args), this.session);
      case "show":
        return new ShowCommand(this.session, args);
      case "save":
        return new SaveCommand(this.session, this.store, args);
      case "tree":
        return new TreeCommand(this.session, args);
      default:
        throw new Error(`unknown command: ${name}`);
    }
  }
}
