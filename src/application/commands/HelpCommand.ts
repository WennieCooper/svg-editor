import type { Command } from "./Command.js";

export class HelpCommand implements Command {
  execute(): string {
    return [
      "Available commands:",
      "  help    Show currently implemented commands",
      "This initial scaffold implements help only.",
    ].join("\n");
  }
}
