import { describe, expect, test } from "bun:test";
import { MaskShape } from "../../core";
import { parseMainCliArgs } from "./index";

describe("parseMainCliArgs", () => {
    test("parses default options", () => {
        const parsed = parseMainCliArgs([]);

        expect(parsed.showHelp).toBe(false);
        expect(parsed.error).toBeUndefined();
        expect(parsed.batchOptions.outputFormat).toBe("auto");
        expect(parsed.batchOptions.maskShape).toBe(MaskShape.Square);
    });

    test("parses explicit device package and flags", () => {
        const parsed = parseMainCliArgs([
            "-w",
            "--device-package", "com.example.app",
            "--format", "png",
            "--shape", "circle",
            "--monochrome",
            "--round"
        ]);

        expect(parsed.error).toBeUndefined();
        expect(parsed.batchOptions.writeToDisk).toBe(true);
        expect(parsed.batchOptions.packageFilters).toEqual(["com.example.app"]);
        expect(parsed.batchOptions.outputFormat).toBe("png");
        expect(parsed.batchOptions.maskShape).toBe(MaskShape.Circle);
        expect(parsed.batchOptions.preferMonochrome).toBe(true);
        expect(parsed.batchOptions.preferRoundIcon).toBe(true);
    });

    test("rejects removed legacy flags", () => {
        const parsed = parseMainCliArgs(["--apk"]);

        expect(parsed.error).toContain("--all, --svg and --apk are removed");
    });

    test("rejects invalid shape", () => {
        const parsed = parseMainCliArgs(["--shape", "triangle"]);

        expect(parsed.error).toContain("Unknown shape");
    });
});
