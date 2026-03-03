import sharp from "sharp";
import { UnzipService } from "../../services/cliServices";
import { FileUtil } from "../../utils/helpers";
import { MaskHelper } from "../../utils/maskHelper";
import { LegacyFallbackWrapper } from "../../utils/legacyFallbackWrapper";
import type { IconStrategy } from "./iconStrategy";
import type { IconResult, MaskShape } from "../../types";

export class BestMatchPngStrategy implements IconStrategy {
    constructor(
        private readonly unzipService: UnzipService,
        private readonly maskShape: MaskShape
    ) { }

    public async execute(packageName: string, localApks: string[], primaryIconEntry?: string): Promise<IconResult | null> {
        let bestMatchedFile = "";
        let maxFileScore = -9999;
        let targetApkPath = "";

        let targetIconName = "";
        if (primaryIconEntry) {
            const fileName = primaryIconEntry.split("/").pop() || "";
            targetIconName = (fileName.split(".")[0] || "").toLowerCase();
        }

        for (const currentApk of localApks) {
            try {
                const fileList = await this.unzipService.listFiles(currentApk);
                for (const fileEntry of fileList) {
                    let currentScore = FileUtil.calculatePngScore(fileEntry, this.maskShape);

                    if (currentScore < 0) continue;

                    if (targetIconName && fileEntry.toLowerCase().includes(`/${targetIconName}`)) {
                        currentScore += 2000;
                    }

                    if (currentScore > maxFileScore) {
                        maxFileScore = currentScore;
                        bestMatchedFile = fileEntry;
                        targetApkPath = currentApk;
                    }
                }
            } catch (error) {
                console.debug(`[DEBUG] [${packageName}] No valid files found in split APK, checking next...`);
            }
        }

        if (bestMatchedFile) {
            try {
                const rawImageBuffer = await this.unzipService.extractFile(targetApkPath, bestMatchedFile);

                if (!rawImageBuffer || rawImageBuffer.byteLength === 0) {
                    throw new Error("Extracted image buffer is empty (0 bytes).");
                }

                const resizedBuffer = await sharp(rawImageBuffer).resize(108, 108).png().toBuffer();
                let finalImageBuffer = await MaskHelper.applyMaskToBuffer(resizedBuffer, this.maskShape);
                finalImageBuffer = await LegacyFallbackWrapper.applyBackgroundPaddingIfSmall(finalImageBuffer, this.maskShape, packageName);

                return { buffer: finalImageBuffer, mimeType: "image/png" };
            } catch (error) {
                console.debug(`[DEBUG] [${packageName}] BestMatchPngStrategy failed on ${bestMatchedFile}: ${error}`);
                return null;
            }
        }

        return null;
    }
}