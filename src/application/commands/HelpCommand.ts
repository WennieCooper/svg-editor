import { Arguments } from "../Arguments.js";
import type { Command } from "./Command.js";

export class HelpCommand implements Command {
  constructor(private readonly values: readonly string[] = []) {}

  execute(): string {
    new Arguments(this.values).requireCount([0], "help");
    return [
      "Available commands (current development stage):",
      "  init [w] [h]                           Create a canvas (default 800x600)",
      "  create rect <id> <x> <y> <w> <h> [fill]  Create a rectangle",
      "  tree [id]                              Show the document or one shape",
      "  help                                   Show this help",
      "Other shapes, containers, editing, history and SVG IO are not implemented yet.",
    ].join("\n");
  }
}
