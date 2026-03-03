import { Aapt2Service } from "../../services/cliServices";
import { IconResolver } from "../../resolvers/iconResolver";
import { AdaptiveIconCompositor } from "../adaptiveIconCompositor";
import type { IconStrategy } from "./iconStrategy";
import type { IconResult } from "../../types";

/**
 * Extracts adaptive XML properties and relies on the Compositor to build the output.
 */
export class AdaptiveIconStrategy implements IconStrategy {
    constructor(
        private readonly aapt2Service: Aapt2Service,
        private readonly iconResolver: IconResolver,
        private readonly compositor: AdaptiveIconCompositor
    ) { }

    public async execute(packageName: string, localApks: string[], primaryIconEntry?: string): Promise<IconResult | null> {
        if (!primaryIconEntry || !primaryIconEntry.endsWith(".xml")) return null;

        let rootXmlTree = "";
        for (const currentApk of localApks) {
            try {
                rootXmlTree = await this.aapt2Service.dumpXmlTree(currentApk, primaryIconEntry);
                if (rootXmlTree) break;
            } catch { }
        }

        const foregroundBlock = rootXmlTree.match(/E: foreground[\s\S]*?(?=\s*E: (?:background|monochrome|foreground)|\s*$)/)?.[0] || "";
        const foregroundHexRef = foregroundBlock.match(/(?:drawable|src).*?=@(?:ref\/)?(0x[0-9a-f]+)/)?.[1] || foregroundBlock.match(/\(0x0101(?:0199|0119)\)=@(0x[0-9a-f]+)/)?.[1];

        const backgroundBlock = rootXmlTree.match(/E: background[\s\S]*?(?=\s*E: (?:foreground|monochrome|background)|\s*$)/)?.[0] || "";
        const backgroundHexRef = backgroundBlock.match(/(?:drawable|src).*?=@(?:ref\/)?(0x[0-9a-f]+)/)?.[1] || backgroundBlock.match(/\(0x0101(?:0199|0119)\)=@(0x[0-9a-f]+)/)?.[1];

        if (!foregroundHexRef && !rootXmlTree.includes("E: vector")) return null;

        let fgScale = 1, fgTranslate = 0;
        const fgInsetMatch = foregroundBlock.match(/android:inset.*?=([0-9.]+)(dp|dip|%|)/);
        if (fgInsetMatch) {
            let insetVal = parseFloat(fgInsetMatch[1] || "0");
            const unit = fgInsetMatch[2];
            if (unit === "dp" || unit === "dip") insetVal = insetVal / 108;
            else if (unit === "%" || !unit) { if (insetVal >= 1) insetVal /= 100; }
            if (insetVal > 0 && insetVal < 0.5) { fgScale = 1 - (insetVal * 2); fgTranslate = 108 * insetVal; }
        }

        let bgScale = 1, bgTranslate = 0;
        const bgInsetMatch = backgroundBlock.match(/android:inset.*?=([0-9.]+)(dp|dip|%|)/);
        if (bgInsetMatch) {
            let insetVal = parseFloat(bgInsetMatch[1] || "0");
            const unit = bgInsetMatch[2];
            if (unit === "dp" || unit === "dip") insetVal = insetVal / 108;
            else if (unit === "%" || !unit) { if (insetVal >= 1) insetVal /= 100; }
            if (insetVal > 0 && insetVal < 0.5) { bgScale = 1 - (insetVal * 2); bgTranslate = 108 * insetVal; }
        }

        let resolvedForeground = foregroundHexRef ? await this.iconResolver.resolveResource(localApks, foregroundHexRef || "", packageName) : null;
        let resolvedBackground = backgroundHexRef ? await this.iconResolver.resolveResource(localApks, backgroundHexRef || "", packageName) : null;

        if (!foregroundHexRef && rootXmlTree.includes("E: vector")) {
            resolvedForeground = { path: primaryIconEntry };
        }

        const frameworkColors: Record<string, string> = {
            "0x0106000b": "#FFFFFF", "0x0106000c": "#000000", "0x0106000d": "#000000",
            "0x0106000e": "#000000", "0x0106000f": "#FFFFFF", "0x01060000": "#AAAAAA",
        };

        if (!resolvedBackground && backgroundHexRef && frameworkColors[backgroundHexRef]) {
            resolvedBackground = { color: frameworkColors[backgroundHexRef] };
        }

        // Delegate building and composing to the dedicated Compositor
        return await this.compositor.compose(
            packageName,
            localApks,
            resolvedForeground,
            resolvedBackground,
            fgScale, fgTranslate,
            bgScale, bgTranslate
        );
    }
}