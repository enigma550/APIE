import { type AppEngineConfig } from "../../core";
import { type IconBatchRunResult, runIconBatch } from "./runBatch";
import { AdbService } from "../../adapters/adb";
import { FilesystemOutputStore } from "../../adapters/filesystem";
import { OnDeviceIconExtractor } from "../../adapters/onDevice";
import { createLogger } from "../../shared";

/**
 * Primary engine that extracts icons using on-device model rendering and writes the requested output format.
 */
export class AppEngine {
    private readonly logger = createLogger("AppEngine");
    private readonly config: AppEngineConfig;

    constructor(
        private readonly adbService: AdbService,
        config: AppEngineConfig
    ) {
        this.config = config;
    }

    public async start(): Promise<IconBatchRunResult> {
        this.logger.debug(`Starting extraction [Mask: ${this.config.maskShape}]`);

        const tTotal = performance.now();
        const result = await runIconBatch(
            new OnDeviceIconExtractor(this.adbService),
            new FilesystemOutputStore(),
            {
                packageFilters: this.config.targetPackage
                    ? [this.config.targetPackage]
                    : this.config.packageFilters,
                writeToDisk: this.config.writeToDisk,
                customOutputDir: this.config.customOutputDir,
                maskShape: this.config.maskShape,
                refreshExisting: this.config.refreshExisting,
                preferRoundIcon: this.config.preferRoundIcon,
                preferMonochrome: this.config.preferMonochrome,
                outputFormat: this.config.targetFormat,
                reportRaster: this.config.reportRaster,
                rasterReportPath: this.config.rasterReportPath
            }
        );
        const totalMs = performance.now() - tTotal;

        this.logger.debug(`Total: ${totalMs.toFixed(0)}ms`);
        this.logger.info(
            `Done: ${result.summary.exactVector + result.summary.exactRasterFallback} icons extracted, ${result.summary.failed} errors.`
        );
        return result;
    }
}
