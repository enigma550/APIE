import type { OutputFormat, SvgExtractionResult } from "../core";
import type { IconBatchSummary } from "../application/icons/reporting";

export interface OutputStorePort {
    findCachedPackages(
        packageNames: string[],
        outputDirectory: string,
        outputFormat: OutputFormat
    ): Promise<Set<string>>;

    writeResult(input: {
        outputDirectory: string;
        writeToDisk: boolean;
        packageName: string;
        result: SvgExtractionResult;
        summary: IconBatchSummary;
        outputFormat: OutputFormat;
    }): Promise<void>;

    writeRasterReport(input: {
        reportPath: string;
        summary: IconBatchSummary;
        entries: SvgExtractionResult[];
    }): Promise<string>;
}
