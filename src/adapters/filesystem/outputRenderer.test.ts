import { describe, expect, test } from "bun:test";
import type { SvgExtractionResult } from "../../core";
import { renderExtractionOutput } from "./outputRenderer";

const ONE_BY_ONE_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl9l4sAAAAASUVORK5CYII=";
const ONE_BY_ONE_WEBP_BASE64 = "UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoBAAEAAUAmJaACdLoB+AADsAD+8ut//NgVzXPv9//S4P0uD9Lg/9KQAAA=";

function createResult(svg: string, containsRasterImages: boolean): SvgExtractionResult {
    return {
        packageName: "com.example.app",
        svg,
        iconResourceId: 0,
        sourcePath: "device-model",
        containsRasterImages,
        isPureVector: !containsRasterImages,
        isExact: true,
        fidelity: containsRasterImages ? "exact-raster" : "exact-vector",
        approximateReasons: [],
        inputApkPaths: []
    };
}

describe("renderExtractionOutput", () => {
    test("keeps pure vector output as svg in auto mode", async () => {
        const result = createResult("<svg xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"10\" height=\"10\" fill=\"#f00\" /></svg>", false);
        const rendered = await renderExtractionOutput(result, "auto");

        expect(rendered.extension).toBe("svg");
        expect(rendered.buffer.toString("utf8")).toContain("<rect");
    });

    test("unwraps standalone embedded png in auto mode", async () => {
        const result = createResult(
            `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}" /></svg>`,
            true
        );
        const rendered = await renderExtractionOutput(result, "auto");

        expect(rendered.extension).toBe("png");
        expect(rendered.buffer.toString("base64")).toBe(ONE_BY_ONE_PNG_BASE64);
    });

    test("unwraps standalone embedded webp in auto mode", async () => {
        const result = createResult(
            `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/webp;base64,${ONE_BY_ONE_WEBP_BASE64}" /></svg>`,
            true
        );
        const rendered = await renderExtractionOutput(result, "auto");

        expect(rendered.extension).toBe("webp");
        expect(rendered.buffer.toString("base64")).toBe(ONE_BY_ONE_WEBP_BASE64);
    });

    test("keeps mixed raster and vector content as svg in auto mode", async () => {
        const result = createResult(
            `<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#0866ff" /><image href="data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}" /></svg>`,
            true
        );
        const rendered = await renderExtractionOutput(result, "auto");

        expect(rendered.extension).toBe("svg");
        expect(rendered.buffer.toString("utf8")).toContain("<rect");
        expect(rendered.buffer.toString("utf8")).toContain("data:image/png;base64");
    });
});
