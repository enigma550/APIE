import sharp from "sharp";
import { UnzipService } from "../../services/cliServices";
import { MaskHelper } from "../../utils/maskHelper";
import { LegacyFallbackWrapper } from "../../utils/legacyFallbackWrapper";
import type { IconStrategy } from "./iconStrategy";
import type { IconResult, MaskShape } from "../../types";

export class DirectPngStrategy implements IconStrategy {
    constructor(
        private readonly unzipService: UnzipService,
        private readonly maskShape: MaskShape
    ) { }

    public async execute(packageName: string, localApks: string[], primaryIconEntry?: string): Promise<IconResult | null> {
        if (!primaryIconEntry || !primaryIconEntry.match(/\.(png|webp|jpg|jpeg)$/i)) return null;

        for (const currentApk of localApks) {
            try {
                const rawImageBuffer = await this.unzipService.extractFile(currentApk, primaryIconEntry);

                if (rawImageBuffer && rawImageBuffer.byteLength > 0) {
                    const resizedBuffer = await sharp(rawImageBuffer).resize(108, 108).png().toBuffer();
                    let finalImageBuffer = await MaskHelper.applyMaskToBuffer(resizedBuffer, this.maskShape);
                    finalImageBuffer = await LegacyFallbackWrapper.applyBackgroundPaddingIfSmall(finalImageBuffer, this.maskShape, packageName);

                    return { buffer: finalImageBuffer, mimeType: "image/png" };
                }
            } catch (error) {
                // Silently skip to next split if not found
            }
        }
        return null;
    }
}