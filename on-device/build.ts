#!/usr/bin/env bun

import { buildDex } from "./tooling";

const compileMode = process.argv.includes("--stubs")
    ? "stubs"
    : "auto";

await buildDex({
    verifyOnDevice: process.argv.includes("--verify"),
    compileMode
});
