import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class InitCommand implements Command {
  constructor(
    private readonly session: EditorSession,
    private readonly values: readonly string[],
  ) {}

  execute(): string {
    const args = new Arguments(this.values);
    args.requireCount([0, 1, 2], "init [w] [h]");
    const width = this.values.length >= 1 ? args.number(0) : 800;
    const height = this.values.length >= 2 ? args.number(1) : 600;
    const document = this.session.initialize(width, height);
    return `canvas ${document.getWidth()}x${document.getHeight()} created`;
  }
}
