import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class TreeCommand implements Command {
  constructor(
    private readonly session: EditorSession,
    private readonly values: readonly string[],
  ) {}

  execute(): string {
    const document = this.session.getDocument();
    const args = new Arguments(this.values);
    args.requireCount([0, 1], "tree [id]");
    if (this.values.length === 1) {
      return document.find(args.text(0)).describe();
    }
    const shapes = document.getShapes();
    const lines = [`svg (${document.getWidth()}x${document.getHeight()})`];
    shapes.forEach((shape, index) => {
      const branch = index === shapes.length - 1 ? "└── " : "├── ";
      lines.push(branch + shape.describe());
    });
    return lines.join("\n");
  }
}
