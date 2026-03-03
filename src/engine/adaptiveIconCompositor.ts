import sharp from "sharp";
import { Aapt2Service, UnzipService } from "../services/cliServices";
import { VectorDrawableParser } from "../resolvers/vectorDrawableParser";
import { MaskHelper } from "../utils/maskHelper";
import { LegacyFallbackWrapper } from "../utils/legacyFallbackWrapper";
import type { IconResult, MaskShape, ResourceResolution } from "../types";

/**
 * Composites resolved foreground and background layers into a final styled SVG/PNG.
 */
export class AdaptiveIconCompositor {
    constructor(
        private readonly aapt2Service: Aapt2Service,
        private readonly unzipService: UnzipService,
        private readonly vectorParser: VectorDrawableParser,
        private readonly maskShape: MaskShape
    ) { }

    public async compose(
        packageName: string,
        localApks: string[],
        resolvedForeground: ResourceResolution | null,
        resolvedBackground: ResourceResolution | null,
        fgScale: number, fgTranslate: number,
        bgScale: number, bgTranslate: number
    ): Promise<IconResult | null> {

        let finalBackgroundMarkup = "";
        let finalForegroundMarkup = "";
        let finalBackgroundColor = resolvedBackground?.color || "#FFFFFF";
        let shouldAbortSvg = false;

        // Process Background
        if (resolvedBackground?.path?.endsWith(".xml")) {
            for (const currentApk of localApks) {
                try {
                    const xmlText = await this.aapt2Service.dumpXmlTree(currentApk, resolvedBackground.path);
                    const extractedLayer = await this.vectorParser.parse(localApks, xmlText, packageName);
                    if (!extractedLayer) { shouldAbortSvg = true; break; }
                    if (extractedLayer.solidColor) finalBackgroundColor = extractedLayer.solidColor;
                    else finalBackgroundMarkup = extractedLayer.svg;
                    break;
                } catch { }
            }
        } else if (resolvedBackground?.path) {
            const base64Image = await this.unzipService.getImageAsBase64(localApks, resolvedBackground.path);
            if (base64Image) {
                let isSolidWhiteImage = false;
                try {
                    let bgBuffer: ArrayBuffer | null = null;
                    for (const apk of localApks) {
                        try {
                            const foundBuffer = await this.unzipService.extractFile(apk, resolvedBackground.path);
                            if (foundBuffer && foundBuffer.byteLength > 0) {
                                bgBuffer = foundBuffer;
                                break;
                            }
                        } catch { }
                    }
                    if (bgBuffer && bgBuffer.byteLength > 0) {
                        const center = await sharp(Buffer.from(bgBuffer)).extract({ left: 36, top: 36, width: 1, height: 1 }).raw().toBuffer();
                        if (center.length >= 3) {
                            const hex = "#" + center.slice(0, 3).reduce((acc: string, val: number) => acc + val.toString(16).padStart(2, "0"), "");
                            if (hex.toUpperCase() === "#FFFFFF") isSolidWhiteImage = true;
                            if (bgScale !== 1 && !resolvedBackground.color) finalBackgroundColor = hex;
                        }
                    }
                } catch (e) { console.debug("[DEBUG] Failed to extract bg image properties:", e); }

                if (!(this.maskShape === "square" && isSolidWhiteImage)) {
                    finalBackgroundMarkup = `<image width="108" height="108" href="${base64Image}" />`;
                } else {
                    finalBackgroundColor = "#FFFFFF";
                }
            }
        }

        // Process Foreground
        if (!shouldAbortSvg && resolvedForeground?.path?.endsWith(".xml")) {
            for (const currentApk of localApks) {
                try {
                    const xmlText = await this.aapt2Service.dumpXmlTree(currentApk, resolvedForeground.path);
                    const extractedLayer = await this.vectorParser.parse(localApks, xmlText, packageName);
                    if (!extractedLayer) { shouldAbortSvg = true; break; }
                    finalForegroundMarkup = extractedLayer.svg;
                    break;
                } catch { }
            }
        } else if (!shouldAbortSvg && resolvedForeground?.path) {
            const base64Image = await this.unzipService.getImageAsBase64(localApks, resolvedForeground.path);
            if (base64Image) {
                if (fgScale !== 1) {
                    try {
                        let fgBuffer: ArrayBuffer | null = null;
                        for (const apk of localApks) {
                            try {
                                const foundBuffer = await this.unzipService.extractFile(apk, resolvedForeground.path);
                                if (foundBuffer && foundBuffer.byteLength > 0) { fgBuffer = foundBuffer; break; }
                            } catch { }
                        }

                        if (fgBuffer) {
                            const raw = await sharp(fgBuffer).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
                            if (raw.length >= 3) {
                                finalBackgroundColor = "#" + raw.slice(0, 3).reduce((acc: string, val: number) => acc + val.toString(16).padStart(2, "0"), "");
                            }
                        }
                    } catch (e) { }
                }
                finalForegroundMarkup = `<image x="0" y="0" width="108" height="108" preserveAspectRatio="none" href="${base64Image}" />`;
            }
        }

        // Apply scale/translate transforms
        if (finalBackgroundMarkup && (bgScale !== 1 || bgTranslate !== 0)) {
            finalBackgroundMarkup = `<g transform="translate(${Math.round(bgTranslate * 1000) / 1000}, ${Math.round(bgTranslate * 1000) / 1000}) scale(${Math.round(bgScale * 1000) / 1000})">${finalBackgroundMarkup}</g>`;
        }
        if (finalForegroundMarkup && (fgScale !== 1 || fgTranslate !== 0)) {
            finalForegroundMarkup = `<g transform="translate(${Math.round(fgTranslate * 1000) / 1000}, ${Math.round(fgTranslate * 1000) / 1000}) scale(${Math.round(fgScale * 1000) / 1000})">${finalForegroundMarkup}</g>`;
        }

        // Contrast analysis & generation
        let foregroundColorInfo: { hex: string; centerHex: string; edgeHex: string; luminance: number; isSolidEdge: boolean } | null = null;

        if (finalForegroundMarkup && this.maskShape === "square") {
            try {
                let imgBuffer: Buffer | null = null;
                const base64Match = finalForegroundMarkup.match(/href="data:image\/([^;]+);base64,([^"]+)"/);

                if (base64Match && base64Match[2]) {
                    imgBuffer = Buffer.from(base64Match[2], "base64");
                } else {
                    let svgToRender = finalForegroundMarkup;
                    if (!svgToRender.trim().startsWith("<svg")) {
                        svgToRender = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">${finalForegroundMarkup}</svg>`;
                    }
                    imgBuffer = Buffer.from(svgToRender);
                }

                if (imgBuffer && finalBackgroundColor.toUpperCase() === "#FFFFFF") {
                    foregroundColorInfo = await LegacyFallbackWrapper.getAverageColor(imgBuffer);
                }
            } catch (e) { }
        }

        const hasWhiteForeground = !finalForegroundMarkup ||
            ((finalForegroundMarkup.includes('fill="#ffffff"') || finalForegroundMarkup.includes('fill="#FFFFFF"')) && (!finalForegroundMarkup.includes('fill="#') || finalForegroundMarkup.split('fill="#').length <= 2)) ||
            (finalForegroundMarkup.includes('fill="#ffffff"') && finalForegroundMarkup.includes('0,0h108v108H0z'));

        let hasWhiteBackground = false;
        if (!finalBackgroundMarkup) hasWhiteBackground = true;
        else if (finalBackgroundMarkup.includes('fill="url(#')) hasWhiteBackground = false;
        else if (!finalBackgroundMarkup.includes('fill="#') || finalBackgroundMarkup.includes('fill="#ffffff"')) hasWhiteBackground = true;

        if (finalBackgroundColor.toUpperCase() === "#FFFFFF" && hasWhiteForeground && hasWhiteBackground) {
            if (finalForegroundMarkup && finalForegroundMarkup.trim().length > 50) {
                finalBackgroundColor = "#000000";
                finalBackgroundMarkup = "";
                if (finalForegroundMarkup) {
                    finalForegroundMarkup = finalForegroundMarkup.replace(/<path\s+d="M0,0h108v108H0z"\s+fill="#ffffff"\s*[^/]*\/>/gi, "");
                }
            } else {
                shouldAbortSvg = true;
            }
        }

        if (!shouldAbortSvg && (finalForegroundMarkup || finalBackgroundMarkup || resolvedBackground?.color)) {
            let defsMarkup = "";
            let groupOpenMarkup = "<g>";
            let groupCloseMarkup = "</g>";

            if (this.maskShape !== "square") {
                const maskPathMarkup = MaskHelper.getMaskPath(this.maskShape, 108);
                if (maskPathMarkup) {
                    defsMarkup = `<defs><clipPath id="shapeMask">${maskPathMarkup}</clipPath></defs>`;
                    groupOpenMarkup = `<g clip-path="url(#shapeMask)">`;
                }
            }

            const isWhiteBackground = finalBackgroundColor.toUpperCase() === "#FFFFFF";
            let usePaddingColor = finalBackgroundColor;

            if (isWhiteBackground && this.maskShape === "square" && foregroundColorInfo) {
                if (foregroundColorInfo.luminance > 240 && hasWhiteBackground && !foregroundColorInfo.isSolidEdge) {
                    usePaddingColor = "#000000";
                } else if (foregroundColorInfo.isSolidEdge) {
                    usePaddingColor = foregroundColorInfo.edgeHex;
                }
            }

            const fillRectMarkup = `<rect width="108" height="108" fill="${usePaddingColor}" />`;

            const finalSvgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
                ${defsMarkup}
                ${groupOpenMarkup}
                    ${fillRectMarkup}
                    ${finalBackgroundMarkup}
                    ${finalForegroundMarkup}
                ${groupCloseMarkup}
            </svg>`;

            return {
                buffer: Buffer.from(finalSvgMarkup, "utf-8"),
                mimeType: "image/svg+xml"
            };
        }

        return null;
    }
}