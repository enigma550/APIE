import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { type OutputFormat, type SvgExtractionResult, MaskShape } from "../../core";
import type { IconExtractorPort, OutputStorePort } from "../../ports";
import {
    type IconBatchRunResult,
    type IconBatchSummary,
    recordExactResult
} from "./reporting";
export type { IconBatchRunResult, IconBatchSummary } from "./reporting";

export interface RunIconBatchOptions {
    packageFilters?: string[];
    writeToDisk?: boolean;
    customOutputDir?: string;
    maskShape?: MaskShape;
    refreshExisting?: boolean;
    preferRoundIcon?: boolean;
    preferMonochrome?: boolean;
    outputFormat?: OutputFormat;
    reportRaster?: boolean;
    rasterReportPath?: string;
}

export async function runIconBatch(
    extractor: IconExtractorPort,
    outputStore: OutputStorePort,
    options: RunIconBatchOptions = {}
): Promise<IconBatchRunResult> {
    const writeToDisk = options.writeToDisk ?? false;
    const outputFormat = options.outputFormat ?? "auto";
    const shouldReportRaster = options.reportRaster === true;
    const outputDirectory = options.customOutputDir
        ? resolve(process.cwd(), options.customOutputDir)
        : join(process.cwd(), "output");

    const allPackages = await extractor.listThirdPartyPackages();
    const packages = options.packageFilters?.length
        ? allPackages.filter(packageName => options.packageFilters!.includes(packageName))
        : allPackages;
    const canReuseExisting = writeToDisk && options.refreshExisting !== true && !shouldReportRaster;

    const cachedPackages = canReuseExisting
        ? await outputStore.findCachedPackages(packages, outputDirectory, outputFormat)
        : new Set<string>();
    const pendingPackages = packages.filter(packageName => !cachedPackages.has(packageName));

    if (writeToDisk) {
        await mkdir(outputDirectory, { recursive: true });
    }

    const summary: IconBatchSummary = {
        total: packages.length,
        skippedCached: cachedPackages.size,
        exactVector: 0,
        exactRasterFallback: 0,
        failed: 0,
        written: 0
    };

    const failureCounts = new Map<string, number>();
    const rasterFallbackEntries: SvgExtractionResult[] = [];
    if (pendingPackages.length > 0) {
        const baseResults = await extractor.extractExactIcons(
            pendingPackages,
            options.maskShape ?? MaskShape.Square,
            {
                preferMonochrome: options.preferMonochrome,
                preferRoundIcon: options.preferRoundIcon
            }
        );

        for (const packageName of pendingPackages) {
            const result = baseResults.get(packageName);
            if (!result) {
                summary.failed++;
                const error = "Device render did not return icon data for package.";
                failureCounts.set(error, (failureCounts.get(error) ?? 0) + 1);
                continue;
            }

            recordExactResult(summary, result);
            if (result.fidelity === "exact-raster") {
                rasterFallbackEntries.push(result);
            }
            await outputStore.writeResult({
                outputDirectory,
                writeToDisk,
                packageName,
                result,
                summary,
                outputFormat
            });
        }
    }

    const topFailures = [...failureCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 10)
        .map(([error, count]) => ({ error, count }));

    const rasterReportPath = shouldReportRaster
        ? await outputStore.writeRasterReport({
            reportPath: options.rasterReportPath
                ? resolve(process.cwd(), options.rasterReportPath)
                : join(writeToDisk ? outputDirectory : process.cwd(), "raster-report.json"),
            summary,
            entries: rasterFallbackEntries
        })
        : undefined;

    return {
        summary,
        topFailures,
        outputDirectory: writeToDisk ? outputDirectory : undefined,
        rasterReportPath
    };
}
