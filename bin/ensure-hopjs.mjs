#!/usr/bin/env node

import { runEnsureHopjs } from "../src/scan.mjs";

await runEnsureHopjs(process.argv.slice(2));
