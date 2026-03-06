import { type InstalledAppInfo, MaskShape, type SvgExtractionResult } from "../../core";
import { listInstalledAppsWithService } from "../onDevice/OnDeviceAppCatalog";
import { renderExactDeviceSvg, renderExactDeviceSvgBatch, streamExactDeviceSvgBatch, type DeviceRenderStreamEvent } from "../onDevice/svg/renderer";
import { AdbService } from "./AdbService";

export interface DeviceIconOptions {
    shape?: MaskShape;
    preferMonochrome?: boolean;
    preferRoundIcon?: boolean;
}

export class Device extends AdbService {
    public async listApps(packageNames?: string[]): Promise<InstalledAppInfo[]> {
        return listInstalledAppsWithService(this, {
            packageFilters: packageNames
        });
    }

    public async getIcons(
        packageNames: string[],
        options: DeviceIconOptions = {}
    ): Promise<Map<string, SvgExtractionResult>> {
        return renderExactDeviceSvgBatch(
            this,
            packageNames,
            options.shape ?? MaskShape.Square,
            {
                preferMonochrome: options.preferMonochrome,
                preferRoundIcon: options.preferRoundIcon
            }
        );
    }

    public async streamIcons(
        packageNames: string[],
        options: DeviceIconOptions = {},
        onResult: (event: DeviceRenderStreamEvent) => void | Promise<void>
    ): Promise<void> {
        await streamExactDeviceSvgBatch(
            this,
            packageNames,
            options.shape ?? MaskShape.Square,
            {
                preferMonochrome: options.preferMonochrome,
                preferRoundIcon: options.preferRoundIcon
            },
            onResult
        );
    }

    public async getIcon(
        packageName: string,
        options: DeviceIconOptions = {}
    ): Promise<SvgExtractionResult> {
        return renderExactDeviceSvg(
            this,
            packageName,
            options.shape ?? MaskShape.Square,
            {
                preferMonochrome: options.preferMonochrome,
                preferRoundIcon: options.preferRoundIcon
            }
        );
    }
}
