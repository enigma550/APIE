import { join, resolve } from "node:path";
import { mkdir, rm } from "node:fs/promises";
import sharp from "sharp";
import { tmpdir } from "node:os";
import { AdbService, Aapt2Service, UnzipService } from "../services/cliServices";
import { ApkIconExtractor } from "./apkIconExtractor";
import type { AppEngineConfig } from "../types";

export class AppEngine {
    private readonly outputDirectoryPath: string;
    private readonly tempDirectoryPath: string;
    private readonly maxConcurrentTasksLimit: number;
    private readonly config: AppEngineConfig;

    constructor(
        private readonly adbService: AdbService,
        private readonly aapt2Service: Aapt2Service,
        private readonly unzipService: UnzipService,
        private readonly extractor: ApkIconExtractor,
        config: AppEngineConfig
    ) {
        this.config = config;
        this.maxConcurrentTasksLimit = this.config.maxConcurrentTasks || 8;

        this.outputDirectoryPath = this.config.customOutputDir
            ? resolve(process.cwd(), this.config.customOutputDir)
            : join(process.cwd(), "output");

        this.tempDirectoryPath = join(tmpdir(), "apie-temp");
    }

    public async start(): Promise<void> {
        if (this.config.writeToDisk) {
            await mkdir(this.outputDirectoryPath, { recursive: true });
        }
        await mkdir(this.tempDirectoryPath, { recursive: true });

        console.log("======================================");
        console.log(`ANDROID ADAPTIVE ICON EXTRACTOR [Mask: ${this.config.maskShape}]`);
        console.log("======================================");

        const thirdPartyPackageList = await this.adbService.getThirdPartyPackages();

        // Continuous Task Pool instead of Chunked Batching
        // Keeps exactly maxConcurrentTasksLimit running at all times.
        const activeTasks = new Set<Promise<void>>();

        for (const pkg of thirdPartyPackageList) {
            if (activeTasks.size >= this.maxConcurrentTasksLimit) {
                // Wait for at least one task in the pool to finish before adding another
                await Promise.race(activeTasks);
            }

            // Create the task and ensure it removes itself from the active pool when done
            const task = this.processPackageSafe(pkg).finally(() => {
                activeTasks.delete(task);
            });

            activeTasks.add(task);
        }

        // Wait for the remaining tasks to complete
        await Promise.all(activeTasks);
    }

    private async processPackageSafe(packageName: string): Promise<void> {
        try {
            await this.processPackage(packageName);
        } catch (error) {
            console.error(`[ERROR] [${packageName}] ${String(error)}`);
        }
    }

    private async processPackage(packageName: string): Promise<void> {
        console.log(`\n[INFO] [${packageName}] --- Processing ---`);

        const resolvedDevicePaths = await this.adbService.getDevicePaths(packageName);
        const baseApkDevicePath = resolvedDevicePaths.find((pathEntry) => pathEntry.endsWith("base.apk"));
        if (!baseApkDevicePath) return;

        const pulledLocalApks: string[] = [];
        const pullPromises: Promise<void>[] = [];

        const baseLocalApkFile = join(this.tempDirectoryPath, `${packageName}_base.apk`);

        try {
            // Push directly to array to preserve exact order, then download asynchronously
            pulledLocalApks.push(baseLocalApkFile);
            pullPromises.push(this.adbService.pullFile(baseApkDevicePath, baseLocalApkFile));

            for (const splitPathEntry of resolvedDevicePaths.filter((pathEntry) => pathEntry.includes("split"))) {
                // Safer filtering: Exclude ABI architecture splits to save massive amounts of time.
                // These splits are huge (20-100MB) and never contain icons or colors.
                if (splitPathEntry.match(/(arm64_v8a|armeabi_v7a|x86|x86_64|mips)/i)) {
                    continue;
                }

                const splitLocalFile = join(this.tempDirectoryPath, `${packageName}_${splitPathEntry.split('/').pop()}`);

                // Push synchronously to maintain index order
                pulledLocalApks.push(splitLocalFile);
                pullPromises.push(this.adbService.pullFile(splitPathEntry, splitLocalFile));
            }

            // Wait for base and all splits to download simultaneously
            await Promise.all(pullPromises);

            const iconResult = await this.extractor.extractIcon(packageName, pulledLocalApks);

            if (iconResult) {
                let appName = packageName;
                const safeAppName = await this.aapt2Service.getAppLabel(baseLocalApkFile, true) || packageName;
                // Keep appName clean for logs, but safeAppName for the file path
                const label = await this.aapt2Service.getAppLabel(baseLocalApkFile);
                if (label) {
                    appName = label;
                }

                let finalBuffer = iconResult.buffer;
                let ext = iconResult.mimeType === "image/svg+xml" ? "svg" : "png";

                // Format conversion (e.g., if the user requires webp, but got png/svg)
                if (this.config.targetFormat === "png" && ext !== "png") {
                    finalBuffer = await sharp(finalBuffer).png().toBuffer();
                    ext = "png";
                } else if (this.config.targetFormat === "webp" && ext !== "webp") {
                    finalBuffer = await sharp(finalBuffer).webp().toBuffer();
                    ext = "webp";
                }

                console.log(`[DONE] [${appName}] Extracted successfully (Format: ${ext.toUpperCase()})`);

                if (this.config.writeToDisk) {
                    const finalPath = join(this.outputDirectoryPath, `${safeAppName}.${ext}`);
                    await Bun.write(finalPath, finalBuffer);
                    console.log(`[FILE] [${appName}] Written to disk: ${finalPath}`);
                }
            } else {
                console.log(`[FAIL] [${packageName}] Could not resolve icon.`);
            }

        } finally {
            for (const currentApkFile of pulledLocalApks) {
                this.aapt2Service.clearCacheForApk(currentApkFile);
                this.unzipService.clearCacheForApk(currentApkFile);
                await rm(currentApkFile, { force: true }).catch(() => { });
            }
        }
    }
}