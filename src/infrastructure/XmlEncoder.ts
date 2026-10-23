export class XmlEncoder {
  attribute(value: string): string {
    // XML 1.0 excludes control characters and unpaired UTF-16 surrogates.
    if (/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u.test(value)) {
      throw new Error("invalid XML character");
    }
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .replace(/\t/g, "&#9;")
      .replace(/\n/g, "&#10;")
      .replace(/\r/g, "&#13;");
  }
}
