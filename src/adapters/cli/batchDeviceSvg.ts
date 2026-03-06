#!/usr/bin/env bun

import { MaskShape } from "../../core";
import { runBatchDeviceSvg } from "../onDevice";

const args = process.argv.slice(2);
const writeToDisk = args.includes("-w") || args.includes("--write");
const refreshExisting = args.includes("--refresh");
const preferMonochrome = args.includes("--monochrome");
const preferRoundIcon = args.includes("--round");
const formatIndex = args.findIndex(arg => arg === "-f" || arg === "--format");
const outputFormat = formatIndex !== -1 && args.length > formatIndex + 1
    ? args[formatIndex + 1]?.toLowerCase()
    : "auto";
const shapeIndex = args.findIndex(arg => arg === "-s" || arg === "--shape");
const maskShape = shapeIndex !== -1 && args.length > shapeIndex + 1
    ? args[shapeIndex + 1]?.toLowerCase()
    : MaskShape.Square;
const outputIndex = args.findIndex(arg => arg === "--output" || arg === "-o");
const customOutputDir = outputIndex !== -1 && args.length > outputIndex + 1
    ? args[outputIndex + 1]
    : undefined;
const packageFilters = args.filter((arg, index) => {
    if (
        arg === "-w"
        || arg === "--write"
        || arg === "--refresh"
        || arg === "--monochrome"
        || arg === "--round"
        || arg === "-f"
        || arg === "--format"
        || arg === "-s"
        || arg === "--shape"
        || arg === "--output"
        || arg === "-o"
    ) {
        return false;
    }
    if (formatIndex !== -1 && index === formatIndex + 1) {
        return false;
    }
    if (shapeIndex !== -1 && index === shapeIndex + 1) {
        return false;
    }
    if (outputIndex !== -1 && index === outputIndex + 1) {
        return false;
    }
    return true;
});

try {
    const result = await runBatchDeviceSvg({
        packageFilters,
        writeToDisk,
        customOutputDir,
        refreshExisting,
        preferMonochrome,
        preferRoundIcon,
        outputFormat: (
            outputFormat === "auto"
            || outputFormat === "svg"
            || outputFormat === "png"
            || outputFormat === "webp"
        ) ? outputFormat : "auto",
        maskShape: Object.values(MaskShape).includes(maskShape as MaskShape)
            ? maskShape as MaskShape
            : MaskShape.Square
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 0;
} catch (error) {
    process.exitCode = 1;
    if (error instanceof Error) {
        console.error(`[FATAL ERROR] ${error.message}`);
    } else {
        console.error("[FATAL ERROR]", error);
    }
} finally {
    await Bun.sleep(250);
    process.exit(process.exitCode ?? 0);
}
