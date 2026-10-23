import { Arguments } from "../Arguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { Command } from "./Command.js";

export class ShowCommand implements Command {
  constructor(private readonly session: EditorSession, private readonly values: readonly string[]) {}

  execute(): string {
    const document = this.session.getDocument();
    const args = new Arguments(this.values);
    args.requireCount([1], "show <id>");
    const shape = document.find(args.text(0));
    const attributes = Object.entries(shape.getAttributes())
      .filter(([name]) => name !== "id")
      .map(([name, value]) => `  ${name}=${value}`);
    const text = shape.getTextContent();
    if (text !== undefined) attributes.push(`  text=${JSON.stringify(text)}`);
    return [`${shape.getType()}#${shape.getId()}  parent=svg`, ...attributes].join("\n");
  }
}
