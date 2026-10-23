export class Tokenizer {
  tokenize(line: string): string[] {
    if (line.trimStart().startsWith("#")) {
      return [];
    }
    const tokens: string[] = [];
    let token = "";
    let quoted = false;
    let started = false;
    for (let index = 0; index < line.length; index++) {
      const char = line.charAt(index);
      if (quoted && char === "\\") {
        const next = line.charAt(index + 1);
        if (next === '"' || next === "\\") {
          token += next;
          index++;
          continue;
        }
      }
      if (char === '"') {
        quoted = !quoted;
        started = true;
      } else if (!quoted && /\s/.test(char)) {
        if (started) {
          tokens.push(token);
          token = "";
          started = false;
        }
      } else {
        token += char;
        started = true;
      }
    }
    if (quoted) {
      throw new Error("unterminated double quote");
    }
    if (started) {
      tokens.push(token);
    }
    return tokens;
  }
}
