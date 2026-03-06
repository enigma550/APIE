import { access } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { IconBatchSummary } from "../../application/icons/reporting";
import type { OutputFormat, SvgExtractionResult } from "../../core";
import type { OutputStorePort } from "../../ports";
import { sanitizeFilename } from "../../shared";
import { normalizeSvgOutputFormat, renderExtractionOutput } from "./outputRenderer";

export class FilesystemOutputStore implements OutputStorePort {
    public async findCachedPackages(
        packageNames: string[],
        outputDirectory: string,
        outputFormat: OutputFormat
    ): Promise<Set<string>> {
        const cached = new Set<string>();
        const targetExtensions: Array<"svg" | "png" | "webp"> = outputFormat === "auto"
            ? ["svg", "png", "webp"]
            : [normalizeSvgOutputFormat(outputFormat)];

        await Promise.all(packageNames.map(async packageName => {
            const fileName = sanitizeFilename(packageName);
            for (const extension of targetExtensions) {
                const outputPath = join(outputDirectory, `${fileName}.${extension}`);
                try {
                    await access(outputPath);
                    cached.add(packageName);
                    return;
                } catch {
                    // Try next candidate extension.
                }
            }
        }));

        return cached;
    }

    public async writeResult(input: {
        outputDirectory: string;
        writeToDisk: boolean;
        packageName: string;
        result: SvgExtractionResult;
        summary: IconBatchSummary;
        outputFormat: OutputFormat;
    }): Promise<void> {
        if (!input.writeToDisk) {
            return;
        }

        const fileName = sanitizeFilename(input.result.packageName || input.packageName);
        const rendered = await renderExtractionOutput(input.result, input.outputFormat);
        await Bun.write(join(input.outputDirectory, `${fileName}.${rendered.extension}`), rendered.buffer);
        input.summary.written++;
    }

    public async writeRasterReport(input: {
        reportPath: string;
        summary: IconBatchSummary;
        entries: SvgExtractionResult[];
    }): Promise<string> {
        const reportEntries = input.entries.map(createRasterFallbackEntry);
        await mkdir(dirname(input.reportPath), { recursive: true });
        await Bun.write(
            input.reportPath,
            JSON.stringify(
                {
                    generatedAt: new Date().toISOString(),
                    summary: input.summary,
                    entries: reportEntries
                },
                null,
                2
            )
        );
        return input.reportPath;
    }
}

interface RasterFallbackReportEntry {
    packageName: string;
    sourcePath: string;
    rasterSourceClasses: string[];
    vectorFailureReason?: string;
    reason: string;
}

function createRasterFallbackEntry(result: SvgExtractionResult): RasterFallbackReportEntry {
    const rasterSourceClasses = result.rasterSourceClasses ?? [];
    const vectorFailureReason = result.vectorFailureReason;
    return {
        packageName: result.packageName,
        sourcePath: result.sourcePath,
        rasterSourceClasses,
        vectorFailureReason,
        reason: describeRasterReason(result.sourcePath, rasterSourceClasses, vectorFailureReason)
    };
}

function describeRasterReason(
    sourcePath: string,
    rasterSourceClasses: string[],
    vectorFailureReason?: string
): string {
    if (vectorFailureReason) {
        return `Device vector model rejected: ${vectorFailureReason}`;
    }
    if (sourcePath.startsWith("device-rendered-adaptive")) {
        return "Adaptive icon was rendered through raster fallback on-device.";
    }
    if (sourcePath.startsWith("device-rendered-icon")) {
        return "App icon was rendered through raster fallback on-device.";
    }
    if (rasterSourceClasses.some(sourceClass => sourceClass.includes("BitmapDrawable"))) {
        return "Drawable resolved to bitmap content (BitmapDrawable).";
    }
    if (rasterSourceClasses.some(sourceClass => sourceClass.includes("GradientDrawable"))) {
        return "Drawable resolved to a GradientDrawable variant not fully mapped to vector output.";
    }
    if (rasterSourceClasses.length > 0) {
        return `Drawable resolved to raster source classes: ${rasterSourceClasses.join(", ")}.`;
    }
    return "Drawable model contains raster image nodes.";
}
