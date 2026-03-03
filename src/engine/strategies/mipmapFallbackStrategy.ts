import sharp from "sharp";
import { Aapt2Service, UnzipService } from "../../services/cliServices";
import { MaskHelper } from "../../utils/maskHelper";
import { LegacyFallbackWrapper } from "../../utils/legacyFallbackWrapper";
import type { IconStrategy } from "./iconStrategy";
import type { IconResult, MaskShape } from "../../types";

export class MipmapFallbackStrategy implements IconStrategy {
    constructor(
        private readonly aapt2Service: Aapt2Service,
        private readonly unzipService: UnzipService,
        private readonly maskShape: MaskShape
    ) { }

    public async execute(packageName: string, localApks: string[], primaryIconEntry?: string): Promise<IconResult | null> {
        let targetIconName = "";
        if (primaryIconEntry) {
            const fileName = primaryIconEntry.split("/").pop() || "";
            targetIconName = (fileName.split(".")[0] || "").toLowerCase();
        }

        for (const currentApk of localApks) {
            try {
                const dumpLines = await this.aapt2Service.dumpResourcesLines(currentApk);

                let bestMatchedPath = "";
                let bestDensityScore = -1;
                let bestMatchedApk = "";

                const densityMap: Record<string, number> = { "xxxhdpi": 4, "xxhdpi": 3, "xhdpi": 2, "hdpi": 1, "mdpi": 0 };

                let isInsideValidResource = false;
                let currentBlockIsRound = false;

                for (const line of dumpLines) {
                    const trimmedLine = line.trim();

                    if (trimmedLine.startsWith("resource ")) {
                        const lowerLine = trimmedLine.toLowerCase();
                        let isMatch = false;

                        if (targetIconName && lowerLine.includes(`/${targetIconName}`)) {
                            isMatch = true;
                        } else if (!targetIconName && lowerLine.match(/resource\s+0x[0-9a-f]+\s+(?:mipmap|drawable)\/.*(?:icon|launcher).*/)) {
                            isMatch = true;
                        }

                        if (isMatch) {
                            isInsideValidResource = true;
                            currentBlockIsRound = lowerLine.includes("_round") || lowerLine.includes("_circle");
                        } else {
                            isInsideValidResource = false;
                        }
                        continue;
                    }

                    if (isInsideValidResource && trimmedLine.includes("(file)")) {
                        const extractedPath = trimmedLine.match(/(res\/[^\s]+)/)?.[1]?.trim();
                        if (!extractedPath || !extractedPath.match(/\.(png|webp|jpg|jpeg)$/i)) continue;

                        let calculatedDensity = -1;
                        for (const [densityName, densityScore] of Object.entries(densityMap)) {
                            if (trimmedLine.includes(densityName)) { calculatedDensity = densityScore; break; }
                        }
                        if (calculatedDensity < 0) calculatedDensity = 0;

                        const wantsRound = this.maskShape === "circle";
                        const adjustedDensityScore = calculatedDensity + (currentBlockIsRound === wantsRound ? 0.5 : 0);

                        if (adjustedDensityScore > bestDensityScore || !bestMatchedPath) {
                            bestDensityScore = adjustedDensityScore;
                            bestMatchedPath = extractedPath;
                            bestMatchedApk = currentApk;
                        }
                    }
                }

                if (bestMatchedPath && bestMatchedApk) {
                    const rawImageBuffer = await this.unzipService.extractFile(bestMatchedApk, bestMatchedPath);

                    const resizedBuffer = await sharp(rawImageBuffer).resize(108, 108).png().toBuffer();
                    let finalImageBuffer = await MaskHelper.applyMaskToBuffer(resizedBuffer, this.maskShape);
                    finalImageBuffer = await LegacyFallbackWrapper.applyBackgroundPaddingIfSmall(finalImageBuffer, this.maskShape, packageName);

                    return { buffer: finalImageBuffer, mimeType: "image/png" };
                }
            } catch (error) {
                console.debug(`[DEBUG] [${packageName}] Missing resource table in split APK, checking next fallback...`);
            }
        }
        return null;
    }
}