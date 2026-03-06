#!/usr/bin/env bun

import { runCli } from "./adapters/cli/index";

const exitCode = await runCli(process.argv.slice(2));
await Bun.sleep(250);
process.exit(exitCode);
