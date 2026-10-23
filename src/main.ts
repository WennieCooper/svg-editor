import { Cli } from "./cli/Cli.js";

const cli = new Cli(process.stdin, process.stdout);
await cli.run();
