import { runBatchDeviceSvg } from "../onDevice";
import { parseMainCliArgs } from "./args";

const HELP_TEXT = `
======================================
 ANDROID ADAPTIVE ICON EXTRACTOR CLI
======================================

Usage:
  bun run start -w

Required:
  None. By default the CLI runs on all installed third-party apps on the connected device.

Optional:
  -h, --help                Show this help menu.
  -w, --write               Write output files to disk. Without this, only summary is printed.
  --device-package, -dp     Process only one package (default is all apps).
  -o, --output              Output directory (Default: ./output).
  -f, --format              Output format: <auto|svg|png|webp> (Default: auto).
  -s, --shape               Mask shape: <square|circle|squircle|rounded> (Default: square).
  --refresh                 Rebuild outputs instead of reusing existing files.
  --monochrome              Prefer adaptive icon monochrome layer when present.
  --round                   Prefer android:roundIcon when present.
  --report-raster           Write raster fallback report JSON.
  --report-raster-path      Custom path for raster fallback report JSON.

Examples:
  bun run start -w
  bun run start -w -f svg
  bun run start -w -dp com.whatsapp -f png -o ./output
`;

export async function runCli(args: string[]): Promise<number> {
    const parsed = parseMainCliArgs(args);
    if (parsed.showHelp) {
        console.log(HELP_TEXT);
        return 0;
    }

    if (parsed.error) {
        console.error(`[ERROR] ${parsed.error}`);
        return 1;
    }

    try {
        const result = await runBatchDeviceSvg(parsed.batchOptions);
        console.log(JSON.stringify(result, null, 2));
        return 0;
    } catch (error) {
        if (error instanceof Error) {
            console.error(`[FATAL ERROR] ${error.message}`);
        } else {
            console.error("[FATAL ERROR]", error);
        }
        return 1;
    }
}
