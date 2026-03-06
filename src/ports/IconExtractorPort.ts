import type { MaskShape, SvgExtractionResult } from "../core";

export interface ExtractIconsOptions {
    preferMonochrome?: boolean;
    preferRoundIcon?: boolean;
}

export interface IconExtractorPort {
    listThirdPartyPackages(): Promise<string[]>;
    extractExactIcons(
        packageNames: string[],
        maskShape: MaskShape,
        options?: ExtractIconsOptions
    ): Promise<Map<string, SvgExtractionResult>>;
}
