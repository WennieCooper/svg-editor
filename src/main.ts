import { CommandDispatcher } from "./application/CommandDispatcher.js";
import { EditorSession } from "./application/EditorSession.js";
import { ShapeFactory } from "./application/ShapeFactory.js";
import { SvgReader } from "./infrastructure/SvgReader.js";
import { SvgWriter } from "./infrastructure/SvgWriter.js";
import { SvgFileStore } from "./infrastructure/SvgFileStore.js";
import { Cli } from "./cli/Cli.js";

const session = new EditorSession();
const factory = new ShapeFactory();
const store = new SvgFileStore(new SvgWriter(), new SvgReader(factory));
const dispatcher = new CommandDispatcher(session, factory, store);
const cli = new Cli(process.stdin, process.stdout, dispatcher);
await cli.run();
