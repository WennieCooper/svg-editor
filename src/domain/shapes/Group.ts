import { Geometry } from "../Geometry.js";
import { Shape } from "./Shape.js";

export class Group extends Shape {
  private readonly children: Shape[] = [];

  constructor(id: string) {
    super(id, new Geometry({}, []), [], []);
  }

  getType(): string { return "g"; }
  override isContainer(): boolean { return true; }
  override getChildren(): readonly Shape[] { return [...this.children]; }
  describe(): string { return `g#${this.getId()}${this.styleDescription()}`; }

  insert(shape: Shape, index: number = this.children.length): void {
    if (shape.contains(this)) {
      throw new Error(`cannot group a container into its own descendant: ${shape.getId()}`);
    }
    if (this.children.includes(shape)) throw new Error(`shape already in container: ${shape.getId()}`);
    this.children.splice(index, 0, shape);
  }

  remove(shape: Shape): void {
    const index = this.children.indexOf(shape);
    if (index < 0) throw new Error(`no such child: ${shape.getId()}`);
    this.children.splice(index, 1);
  }

  override planMove(dx: number, dy: number): () => void {
    const plans = [super.planMove(dx, dy), ...this.children.map((child) => child.planMove(dx, dy))];
    return () => { for (const apply of plans) apply(); };
  }

  override planScale(factor: number): () => void {
    const plans = [super.planScale(factor), ...this.children.map((child) => child.planScale(factor))];
    return () => { for (const apply of plans) apply(); };
  }
}
