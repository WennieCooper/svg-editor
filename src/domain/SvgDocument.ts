import { Group } from "./shapes/Group.js";
import type { Shape } from "./shapes/Shape.js";

export class SvgDocument {
  private readonly roots: Shape[] = [];
  private readonly shapes = new Map<string, Shape>();
  private readonly parents = new Map<Shape, Group | undefined>();

  constructor(private width: number = 800, private height: number = 600) {
    this.validateDimensions(width, height);
  }

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }
  getShapes(): readonly Shape[] { return [...this.roots]; }
  countShapes(): number { return this.shapes.size; }

  add(shape: Shape, containerId?: string): void {
    const parent = containerId === undefined ? undefined : this.container(containerId);
    const subtree = this.walk([shape]);
    const ids = new Set<string>();
    for (const node of subtree) {
      const id = node.getId();
      if (this.shapes.has(id) || ids.has(id)) throw new Error(`id already exists: ${id}`);
      ids.add(id);
    }
    this.attach(shape, parent);
    this.register(shape, parent);
  }

  find(id: string): Shape {
    const shape = this.shapes.get(id);
    if (shape === undefined) throw new Error(`no such shape: ${id}`);
    return shape;
  }

  parentLabel(id: string): string {
    const parent = this.parents.get(this.find(id));
    return parent === undefined ? "svg" : `g#${parent.getId()}`;
  }

  group(id: string, memberIds: readonly string[]): Group {
    const group = new Group(id);
    if (this.shapes.has(id)) throw new Error(`id already exists: ${id}`);
    if (memberIds.length < 2) throw new Error("group requires at least two shapes");
    const selected = memberIds.map((memberId) => this.find(memberId));
    if (new Set(selected).size !== selected.length) throw new Error("duplicate group member");
    for (const ancestor of selected) {
      if (selected.some((node) => node !== ancestor && ancestor.contains(node))) {
        throw new Error(`cannot group a container into its own descendant: ${ancestor.getId()}`);
      }
    }
    const wanted = new Set(selected);
    const ordered = this.walk(this.roots).filter((node) => wanted.has(node));
    const parent = this.ancestors(ordered[0]!).find((candidate) =>
      ordered.every((node) => this.ancestors(node).includes(candidate)));
    const siblings = this.childrenOf(parent);
    let branch = ordered[0]!;
    while (this.parents.get(branch) !== parent) branch = this.parents.get(branch)!;
    const before = siblings.slice(0, siblings.indexOf(branch));
    const insertion = before.filter((node) => !wanted.has(node)).length;
    // Validation is complete; all following mutations use existing nodes/parents.
    for (const node of ordered) this.detach(node);
    this.attach(group, parent, insertion);
    this.shapes.set(id, group);
    for (const node of ordered) this.attach(node, group);
    return group;
  }

  addTo(containerId: string, id: string): void {
    const parent = this.container(containerId);
    const shape = this.find(id);
    if (shape.contains(parent)) {
      throw new Error(`cannot group a container into its own descendant: ${shape.getId()}`);
    }
    this.detach(shape);
    this.attach(shape, parent);
  }

  ungroup(id: string): number {
    const group = this.container(id);
    const parent = this.parents.get(group);
    if (parent === undefined) throw new Error(`cannot ungroup top-level container: ${id}`);
    const children = group.getChildren();
    const index = parent.getChildren().indexOf(group);
    this.detach(group);
    children.forEach((child, offset) => {
      group.remove(child);
      this.attach(child, parent, index + offset);
    });
    this.parents.delete(group);
    this.shapes.delete(id);
    return children.length;
  }

  resize(width: number, height: number): void {
    this.validateDimensions(width, height);
    this.width = width;
    this.height = height;
  }

  delete(id: string): Shape {
    const shape = this.find(id);
    const subtree = this.walk([shape]);
    this.detach(shape);
    for (const node of subtree) {
      this.shapes.delete(node.getId());
      this.parents.delete(node);
    }
    return shape;
  }

  front(id: string): Shape { return this.reorder(id, true); }
  back(id: string): Shape { return this.reorder(id, false); }

  private reorder(id: string, foreground: boolean): Shape {
    const shape = this.find(id);
    const parent = this.parents.get(shape);
    this.detach(shape);
    this.attach(shape, parent, foreground ? undefined : 0);
    return shape;
  }

  private validateDimensions(width: number, height: number): void {
    if (![width, height].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error("canvas dimensions must be positive finite numbers");
    }
  }

  private container(id: string): Group {
    const shape = this.shapes.get(id);
    if (shape === undefined) throw new Error(`no such container: ${id}`);
    if (!(shape instanceof Group)) throw new Error(`not a container: ${id}`);
    return shape;
  }

  private childrenOf(parent: Group | undefined): readonly Shape[] {
    return parent === undefined ? this.roots : parent.getChildren();
  }

  private attach(shape: Shape, parent: Group | undefined, index?: number): void {
    if (parent === undefined) this.roots.splice(index ?? this.roots.length, 0, shape);
    else parent.insert(shape, index);
    this.parents.set(shape, parent);
  }

  private detach(shape: Shape): void {
    const parent = this.parents.get(shape);
    if (parent === undefined) this.roots.splice(this.roots.indexOf(shape), 1);
    else parent.remove(shape);
  }

  private register(shape: Shape, parent: Group | undefined): void {
    this.shapes.set(shape.getId(), shape);
    this.parents.set(shape, parent);
    for (const child of shape.getChildren()) this.register(child, shape as Group);
  }

  private ancestors(shape: Shape): (Group | undefined)[] {
    const ancestors: (Group | undefined)[] = [];
    let parent = this.parents.get(shape);
    while (parent !== undefined) {
      ancestors.push(parent);
      parent = this.parents.get(parent);
    }
    ancestors.push(undefined);
    return ancestors;
  }

  private walk(shapes: readonly Shape[]): Shape[] {
    const result: Shape[] = [];
    for (const shape of shapes) {
      result.push(shape, ...this.walk(shape.getChildren()));
    }
    return result;
  }
}
