import { Arguments } from "../Arguments.js";
import type { Command } from "./Command.js";

export class HelpCommand implements Command {
  constructor(private readonly values: readonly string[] = []) {}

  execute(): string {
    new Arguments(this.values).requireCount([0], "help");
    return [
      "Available commands (current development stage):",
      "  init [w] [h]",
      "  create rect <id> <x> <y> <w> <h> [fill]",
      "  create circle <id> <cx> <cy> <r> [fill]",
      "  create ellipse <id> <cx> <cy> <rx> <ry> [fill]",
      "  create line <id> <x1> <y1> <x2> <y2> [stroke]",
      '  create text <id> <x> <y> "content"',
      "  create g <id>",
      "  All create commands support an optional trailing: in <containerId>",
      "  group <newGid> <id1> <id2>...",
      "  ungroup <gid>",
      "  addto <gid> <id>",
      "  move <id> <dx> <dy>",
      "  scale <id> <factor>",
      "  set <id> <attr> <value>",
      "  tree [id]",
      "  show <id>",
      "  save [file.svg]",
      "  help",
      "Deletion, z-order, canvas, history and SVG reading are not implemented yet.",
    ].join("\n");
  }
}
