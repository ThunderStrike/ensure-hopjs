import fs from "node:fs/promises";
import path from "node:path";
import { convertUrl } from "./convert-url.mjs";

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  ".turbo",
  ".cache",
]);

const SCAN_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".vue",
  ".svelte",
  ".astro",
]);

const urlRegex = /https?:\/\/[^\s"'`<>)]+/g;

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        yield* walk(fullPath);
      }

      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name);

    if (SCAN_EXTENSIONS.has(ext)) {
      yield fullPath;
    }
  }
}

function parseArgs(args) {
  const rootIndex = args.indexOf("--root");

  return {
    write: args.includes("--write"),
    check: args.includes("--check"),
    root:
      rootIndex >= 0 && args[rootIndex + 1]
        ? path.resolve(args[rootIndex + 1])
        : process.cwd(),
  };
}

export async function runEnsureHopjs(args = []) {
  const options = parseArgs(args);

  let scannedFiles = 0;
  let changedFiles = 0;
  let rewriteCount = 0;
  let alreadyHopCount = 0;
  let unsupportedCount = 0;

  const changes = [];
  const unsupported = [];

  for await (const filePath of walk(options.root)) {
    scannedFiles++;

    const original = await fs.readFile(filePath, "utf8");
    let updated = original;

    const urls = original.match(urlRegex) ?? [];
    const fileChanges = [];
    const fileUnsupported = [];

    for (const rawUrl of urls) {
      const result = convertUrl(rawUrl);
      if (!result) continue;

      if (result.type === "already-hop") {
        alreadyHopCount++;
        continue;
      }

      if (result.type === "unsupported-cdn") {
        unsupportedCount++;
        fileUnsupported.push(result);
        continue;
      }

      if (result.type === "rewrite") {
        rewriteCount++;
        fileChanges.push(result);
        updated = updated.split(result.from).join(result.to);
      }
    }

    if (fileChanges.length > 0) {
      changes.push({ filePath, fileChanges });

      if (options.write) {
        await fs.writeFile(filePath, updated);
        changedFiles++;
      }
    }

    if (fileUnsupported.length > 0) {
      unsupported.push({ filePath, fileUnsupported });
    }
  }

  printReport({
    root: options.root,
    write: options.write,
    scannedFiles,
    changedFiles,
    rewriteCount,
    alreadyHopCount,
    unsupportedCount,
    changes,
    unsupported,
  });

  if (options.check && ((!options.write && rewriteCount > 0) || unsupportedCount > 0)) {
    process.exitCode = 1;
  }
}

function printReport(result) {
  const relative = (filePath) => path.relative(result.root, filePath);

  console.log(`Scanned ${result.scannedFiles} files.`);
  console.log(`Already using hop.js: ${result.alreadyHopCount} URL(s).`);
  console.log(
    `${result.write ? "Rewritten" : "Rewrite candidates"}: ${result.rewriteCount} URL(s).`
  );
  console.log(`Unsupported CDN URLs flagged: ${result.unsupportedCount} URL(s).`);

  if (result.write) {
    console.log(`Changed files: ${result.changedFiles}.`);
  }

  if (result.changes.length > 0) {
    console.log("\nConvertible URLs:");

    for (const { filePath, fileChanges } of result.changes) {
      console.log(`\n${relative(filePath)}`);

      for (const change of fileChanges) {
        console.log(`  - ${change.from}`);
        console.log(`  + ${change.to}`);
      }
    }
  }

  if (result.unsupported.length > 0) {
    console.log("\nUnsupported CDN URLs to review manually:");

    for (const { filePath, fileUnsupported } of result.unsupported) {
      console.log(`\n${relative(filePath)}`);

      for (const item of fileUnsupported) {
        console.log(`  ! ${item.from}`);
        console.log(`    host: ${item.host}`);
        console.log(`    reason: ${item.reason}`);
      }
    }
  }
}
