export class SvgPresentation {
  private readonly values = new Map<string, string>();
  private static readonly allowed = new Set([
    "fill", "stroke", "stroke-width", "transform",
    "font-size", "font-family", "font-weight", "font-style",
    "text-anchor", "dominant-baseline", "opacity", "fill-opacity", "stroke-opacity",
    "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray",
    "stroke-dashoffset", "visibility", "display", "xml:space", "preserveAspectRatio",
  ]);

  set(name: string, value: string): void {
    if (!SvgPresentation.allowed.has(name) && !/^data-[\w-]+$/.test(name)) {
      throw new Error(`unsupported SVG attribute: ${name}`);
    }
    this.values.set(name, value);
  }

  attributes(): Record<string, string> { return Object.fromEntries(this.values); }

  copyTo(target: SvgPresentation): void {
    for (const [name, value] of this.values) target.values.set(name, value);
  }
}
