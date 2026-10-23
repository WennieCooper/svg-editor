import { CommandDispatcher } from "./application/CommandDispatcher.js";
import { EditorSession } from "./application/EditorSession.js";
import { ShapeFactory } from "./application/ShapeFactory.js";
import { Cli } from "./cli/Cli.js";

const session = new EditorSession();
const dispatcher = new CommandDispatcher(session, new ShapeFactory());
const cli = new Cli(process.stdin, process.stdout, dispatcher);
await cli.run();
