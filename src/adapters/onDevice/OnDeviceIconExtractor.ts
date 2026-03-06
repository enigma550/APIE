import type { MaskShape } from "../../core";
import type { ExtractIconsOptions, IconExtractorPort } from "../../ports";
import { AdbService } from "../adb/AdbService";
import { renderExactDeviceSvgBatch } from "./svg";

export class OnDeviceIconExtractor implements IconExtractorPort {
    constructor(private readonly adbService: AdbService) { }

    public async listThirdPartyPackages(): Promise<string[]> {
        return this.adbService.listPackages(true);
    }

    public async extractExactIcons(
        packageNames: string[],
        maskShape: MaskShape,
        options: ExtractIconsOptions = {}
    ) {
        return renderExactDeviceSvgBatch(this.adbService, packageNames, maskShape, options);
    }
}
