import sharp from "sharp";
import type { OutputFormat, SvgExtractionResult } from "../../core";
import { extractEmbeddedRasterPayload } from "../../shared";

export function normalizeSvgOutputFormat(format: OutputFormat | undefined): "svg" | "png" | "webp" {
    if (!format || format === "auto") {
        return "svg";
    }
    if (format === "svg" || format === "png" || format === "webp") {
        return format;
    }
    return "svg";
}

export async function renderSvgOutput(
    svg: string,
    format: "svg" | "png" | "webp"
): Promise<{
    buffer: Buffer;
    extension: "svg" | "png" | "webp";
}> {
    if (format === "svg") {
        return {
            buffer: Buffer.from(svg, "utf8"),
            extension: "svg"
        };
    }

    if (format === "png") {
        return {
            buffer: await sharp(Buffer.from(svg, "utf8")).png().toBuffer(),
            extension: "png"
        };
    }

    return {
        buffer: await sharp(Buffer.from(svg, "utf8")).webp().toBuffer(),
        extension: "webp"
    };
}

export async function renderExtractionOutput(
    result: SvgExtractionResult,
    outputFormat: OutputFormat
): Promise<{
    buffer: Buffer;
    extension: "svg" | "png" | "webp";
}> {
    if (outputFormat !== "auto") {
        return renderSvgOutput(result.svg, normalizeSvgOutputFormat(outputFormat));
    }

    if (!result.containsRasterImages) {
        return renderSvgOutput(result.svg, "svg");
    }

    const embeddedRaster = extractEmbeddedRasterPayload(result.svg);
    if (embeddedRaster?.standalone) {
        return {
            buffer: Buffer.from(embeddedRaster.base64Data, "base64"),
            extension: embeddedRaster.extension
        };
    }

    // Mixed raster/vector content stays SVG so layered content is preserved.
    return renderSvgOutput(result.svg, "svg");
}
