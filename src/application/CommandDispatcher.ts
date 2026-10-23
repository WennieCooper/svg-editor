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
      case "help":
        return new HelpCommand(args);
      case "init":
        return new InitCommand(this.session, args);
      case "create":
        return new CreateCommand(this.session, this.factory, args);
      case "move":
        return new MoveCommand(this.session, args);
      case "scale":
        return new ScaleCommand(this.session, args);
      case "set":
        return new SetCommand(this.session, args);
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
