import { Aapt2Service } from "../services/cliServices";
import { ColorUtil } from "../utils/helpers";
import type { ResourceResolution, FileScore } from "../types";

/**
 * Resolves resources recursively by tracking hex references across the APKs.
 */
export class IconResolver {
    constructor(private readonly aapt2Service: Aapt2Service) { }

    public async resolveResource(apkFiles: string[], hexId: string, packageName: string, depth = 0): Promise<ResourceResolution | null> {
        if (depth > 5) return null;

        let bestFile: FileScore | null = null;
        let bestColor: { color: string, score: number } | null = null;
        let bestRef: { hex: string, score: number } | null = null;

        for (const apk of apkFiles) {
            try {
                const dumpLines = await this.aapt2Service.dumpResourcesLines(apk);

                for (let i = 0; i < dumpLines.length; i++) {
                    const currentLine = dumpLines[i];
                    if (!currentLine || !currentLine.includes(hexId)) continue;

                    const blockLines: string[] = [];
                    for (let j = i; j < Math.min(i + 15, dumpLines.length); j++) {
                        const peekLine = dumpLines[j];
                        if (!peekLine || (j > i && (peekLine.includes("resource 0x") || peekLine.startsWith("  type ")))) break;
                        blockLines.push(peekLine);
                    }

                    for (const line of blockLines) {
                        let score = 1;
                        if (line.includes("v26")) score += 100;
                        if (line.includes("anydpi-")) score += 50;
                        if (line.includes("anydpi")) score += 50;
                        if (line.includes("xxxhdpi")) score += 40;
                        else if (line.includes("xxhdpi")) score += 30;
                        else if (line.includes("xhdpi")) score += 20;
                        else if (line.includes("hdpi")) score += 10;

                        if (line.includes("(file)")) {
                            const pathMatch = line.match(/(res\/[^\s]+)/);
                            if (pathMatch?.[1] && (!bestFile || score > bestFile.score)) {
                                bestFile = { path: pathMatch[1].trim(), score, apk };
                            }
                        } else if (line.includes("t=0x1c") || line.includes("t=0x1d") || line.includes("v=") || line.match(/\([^)]*\)\s+#/)) {
                            const colorMatch = line.match(/d=(0x[0-9a-fA-F]+)|v=(#?[0-9a-fA-F]+)|\([^)]*\)\s+(#[0-9a-fA-F]+)/);
                            if (colorMatch) {
                                const colorObj = ColorUtil.normalizeColor(colorMatch[1] || colorMatch[2] || colorMatch[3] || "");
                                if (colorObj.color && (!bestColor || score > bestColor.score)) {
                                    bestColor = { color: colorObj.color, score };
                                }
                            }
                        } else if (line.includes("ref=0x") || line.match(/\(\)\s+@/)) {
                            const refMatch = line.match(/(0x[0-9a-fA-F]+)|\(\)\s+@([A-Za-z0-9_.]+\/[A-Za-z0-9_.]+)/);
                            const target = refMatch?.[1] || refMatch?.[2];
                            if (target && target !== hexId && (!bestRef || score > bestRef.score)) {
                                bestRef = { hex: target, score };
                            }
                        }
                    }
                }
            } catch {
                // Ignore and check next APK
            }
        }

        if (bestFile) {
            if (bestFile.path.endsWith(".xml")) {
                try {
                    const xmlText = await this.aapt2Service.dumpXmlTree(bestFile.apk, bestFile.path);
                    const aliasMatch = xmlText.match(/android:src=@(?:ref\/)?(0x[0-9a-f]+)|android:drawable=@(?:ref\/)?(0x[0-9a-f]+)/);
                    if (aliasMatch) return await this.resolveResource(apkFiles, aliasMatch[1] || aliasMatch[2] || "", packageName, depth + 1);
                } catch { }
            }
            return { path: bestFile.path };
        }

        if (bestColor) return { color: bestColor.color };
        if (bestRef) return await this.resolveResource(apkFiles, bestRef.hex, packageName, depth + 1);

        return null;
    }
}