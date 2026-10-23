import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class CanvasCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly values: readonly string[]) {}

  execute(): string {
    const document = this.session.getDocument();
    const args = new Arguments(this.values);
    args.requireCount([0, 1, 2], "canvas [w] [h]");
    if (this.values.length === 0) return `canvas ${document.getWidth()}x${document.getHeight()}`;
    const width = args.number(0);
    const height = this.values.length === 2 ? args.number(1) : document.getHeight();
    document.resize(width, height);
    return `canvas resized to ${document.getWidth()}x${document.getHeight()}`;
  }
}
