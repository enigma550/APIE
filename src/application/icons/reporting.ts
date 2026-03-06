import type { SvgExtractionResult } from "../../core";

export interface IconBatchSummary {
    total: number;
    skippedCached: number;
    exactVector: number;
    exactRasterFallback: number;
    failed: number;
    written: number;
}

export interface IconBatchRunResult {
    summary: IconBatchSummary;
    topFailures: Array<{
        error: string;
        count: number;
    }>;
    outputDirectory?: string;
    rasterReportPath?: string;
}

export function recordExactResult(summary: IconBatchSummary, result: SvgExtractionResult): void {
    if (result.fidelity === "exact-vector") {
        summary.exactVector++;
        return;
    }

    summary.exactRasterFallback++;
}
