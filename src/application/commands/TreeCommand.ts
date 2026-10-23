import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import { TreeRenderer } from "../TreeRenderer.js";
import type { Command } from "./Command.js";

export class TreeCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly values: readonly string[]) {}

  execute(): string {
    const document = this.session.getDocument();
    const args = new Arguments(this.values);
    args.requireCount([0, 1], "tree [id]");
    const renderer = new TreeRenderer();
    if (this.values.length === 1) return renderer.subtree(document.find(args.text(0)));
    return [`svg (${document.getWidth()}x${document.getHeight()})`,
      ...renderer.children(document.getShapes())].join("\n");
  }
}
