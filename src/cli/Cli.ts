import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";
import { HelpCommand } from "../application/commands/HelpCommand.js";

export class Cli {
  constructor(
    private readonly input: Readable,
    private readonly output: Writable,
  ) {}

  async run(): Promise<void> {
    const reader = createInterface({
      input: this.input,
      output: this.output,
      terminal: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    });
    this.output.write("svg-editor 0.1 — type 'help' for commands\n");
    reader.setPrompt("svg> ");
    reader.prompt();

    try {
      for await (const line of reader) {
        const command = line.trim();
        if (command !== "" && !command.startsWith("#")) {
          if (command === "help") {
            this.output.write(new HelpCommand().execute() + "\n");
          } else {
            this.output.write("error: command not implemented yet\n");
          }
        }
        reader.prompt();
      }
    } finally {
      reader.close();
    }
  }
}
