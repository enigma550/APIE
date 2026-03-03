#!/usr/bin/env bun

import { CommandService, AdbService, Aapt2Service, UnzipService } from "./services/cliServices";
import { IconResolver } from "./resolvers/iconResolver";
import { ApkIconExtractor } from "./engine/apkIconExtractor";
import { AppEngine } from "./engine/appEngine";
import { MaskShape, type OutputFormat, type AppEngineConfig } from "./types";

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(`
======================================
 ANDROID ADAPTIVE ICON EXTRACTOR CLI
======================================

Usage: bun run src/cli.ts [options]

Options:
  -h, --help       Show this help menu.
  -w, --write      Write the extracted icons to disk.
  -o, --output     Specify a custom output directory (e.g., -o ./icons) (Default: ./output).
  -f, --format     Force a specific output format: <png|svg|webp> (Default: native format).
  -s, --shape      Mask shape for icons: <square|circle|squircle|rounded> (Default: square).
  -c, --concurrency Concurrency limits (e.g., -c 4) (Default: 8).

Example:
  bun run src/cli.ts -w -o ./my-icons -f webp -s squircle -c 4
    `);
    process.exit(0);
}

const writeToDisk = args.includes("-w") || args.includes("--write");

let targetFormat: OutputFormat = "native";
const formatIndex = args.findIndex(a => a === "-f" || a === "--format");
if (formatIndex !== -1 && args.length > formatIndex + 1) {
    const parsedFormat = args[formatIndex + 1]!.toLowerCase();
    if (parsedFormat === "png" || parsedFormat === "webp" || parsedFormat === "svg") {
        targetFormat = parsedFormat as OutputFormat;
    } else {
        console.error(`[ERROR] Unknown format '${parsedFormat}'. Use png, svg, or webp.`);
        process.exit(1);
    }
}

// Use MaskShape Enum for validation
let maskShape: MaskShape = MaskShape.Square;
const shapeIndex = args.findIndex(a => a === "-s" || a === "--shape");
if (shapeIndex !== -1 && args.length > shapeIndex + 1) {
    const parsedShape = args[shapeIndex + 1]!.toLowerCase();

    // Check if the user's input exists in our Enum
    if (Object.values(MaskShape).includes(parsedShape as MaskShape)) {
        maskShape = parsedShape as MaskShape;
    } else {
        console.warn(`[WARN] Unknown shape '${parsedShape}', falling back to square.`);
    }
} else if (args.includes("--circle")) {
    maskShape = MaskShape.Circle; // Legacy support
}

let customOutputDir: string | undefined = undefined;
const outputIndex = args.findIndex(a => a === "-o" || a === "--output");
if (outputIndex !== -1 && args.length > outputIndex + 1) {
    customOutputDir = args[outputIndex + 1];
}

let maxConcurrentTasks: number | undefined = undefined;
const concurrencyIndex = args.findIndex(a => a === "-c" || a === "--concurrency");
if (concurrencyIndex !== -1 && args.length > concurrencyIndex + 1) {
    const parsedC = parseInt(args[concurrencyIndex + 1]!, 10);
    if (!isNaN(parsedC) && parsedC > 0) {
        maxConcurrentTasks = parsedC;
    } else {
        console.warn(`[WARN] Invalid concurrency value '${args[concurrencyIndex + 1]}', ignoring.`);
    }
}

const engineConfig: AppEngineConfig = {
    maskShape,
    writeToDisk,
    targetFormat,
    customOutputDir,
    maxConcurrentTasks
};

const commandService = new CommandService();
const adbService = new AdbService(commandService);
const unzipService = new UnzipService(commandService);
const aapt2Service = new Aapt2Service(commandService, unzipService);
const iconResolver = new IconResolver(aapt2Service);

const extractor = new ApkIconExtractor(aapt2Service, unzipService, iconResolver, maskShape);

const appEngine = new AppEngine(
    adbService,
    aapt2Service,
    unzipService,
    extractor,
    engineConfig
);

appEngine.start();