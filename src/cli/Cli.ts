import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";
import type { CommandDispatcher } from "../application/CommandDispatcher.js";
import { Tokenizer } from "./Tokenizer.js";

export class Cli {
  private readonly tokenizer = new Tokenizer();

  constructor(
    private readonly input: Readable,
    private readonly output: Writable,
    private readonly dispatcher: CommandDispatcher,
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
        try {
          const tokens = this.tokenizer.tokenize(line);
          if (tokens.length > 0) {
            this.output.write(this.dispatcher.execute(tokens) + "\n");
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "unexpected failure";
          this.output.write("error: " + message.replace(/[\r\n]+/g, " ") + "\n");
        }
        reader.prompt();
      }
    } finally {
      reader.close();
    }
  }
}
