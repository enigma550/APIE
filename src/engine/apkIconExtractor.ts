import { Aapt2Service, UnzipService } from "../services/cliServices";
import { IconResolver } from "../resolvers/iconResolver";
import { VectorDrawableParser } from "../resolvers/vectorDrawableParser";
import { AdaptiveIconCompositor } from "./adaptiveIconCompositor";
import type { IconResult, IconStrategy } from "./strategies/iconStrategy";
import { AdaptiveIconStrategy } from "./strategies/adaptiveIconStrategy";
import { DirectPngStrategy } from "./strategies/directPngStrategy";
import { MipmapFallbackStrategy } from "./strategies/mipmapFallbackStrategy";
import { BestMatchPngStrategy } from "./strategies/bestMatchPngStrategy";
import { MaskShape } from "../types";

/**
 * Initializes and orchestrates the different strategies for extracting Android Icons.
 */
export class ApkIconExtractor {
    private readonly activeExecutionStrategies: IconStrategy[];

    constructor(
        private readonly aapt2Service: Aapt2Service,
        private readonly unzipService: UnzipService,
        private readonly iconResolver: IconResolver,
        maskShape: MaskShape = MaskShape.Square
    ) {
        // Instantiate the new parsed components safely within the extractor domain
        const vectorParser = new VectorDrawableParser(this.aapt2Service, this.iconResolver);
        const compositor = new AdaptiveIconCompositor(this.aapt2Service, this.unzipService, vectorParser, maskShape);

        this.activeExecutionStrategies = [
            new AdaptiveIconStrategy(this.aapt2Service, this.iconResolver, compositor),
            new DirectPngStrategy(this.unzipService, maskShape),
            new MipmapFallbackStrategy(this.aapt2Service, this.unzipService, maskShape),
            new BestMatchPngStrategy(this.unzipService, maskShape)
        ];
    }

    public async extractIcon(packageName: string, localApkPaths: string[]): Promise<IconResult | null> {
        if (!localApkPaths || localApkPaths.length === 0) return null;

        const baseApkPath = localApkPaths.find((p) => p.endsWith("base.apk")) || localApkPaths[0]!;

        const rawBadgingOutput = await this.aapt2Service.dumpBadging(baseApkPath);
        let primaryIconEntryPath = rawBadgingOutput.match(/application:.*?icon='([^']+)'/)?.[1];

        if (!primaryIconEntryPath) {
            try {
                const manifestXml = await this.aapt2Service.dumpXmlTree(baseApkPath, "AndroidManifest.xml");
                const iconMatch = manifestXml.match(/E: application[\s\S]*?android:icon.*?=@(?:ref\/)?(0x[0-9a-fA-F]+)/);
                if (iconMatch?.[1]) {
                    const resolved = await this.iconResolver.resolveResource(localApkPaths, iconMatch[1], packageName);
                    if (resolved?.path) primaryIconEntryPath = resolved.path;
                }
            } catch { }
        }

        // Run the strategies sequentially until a valid icon is extracted
        for (const strategy of this.activeExecutionStrategies) {
            const result = await strategy.execute(packageName, localApkPaths, primaryIconEntryPath || "");
            if (result) {
                return result; // Found it!
            }
        }

        return null;
    }
}