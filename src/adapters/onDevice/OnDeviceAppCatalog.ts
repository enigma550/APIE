import type { InstalledAppInfo } from "../../core";
import { AdbService } from "../adb/AdbService";
import { ensureOnDeviceDexPrepared } from "./deviceRuntime";
import { buildAppListCommand, parseAppLine } from "./svg/protocol";

export interface ListInstalledAppsOptions {
    packageFilters?: string[];
}

export class OnDeviceAppCatalog {
    constructor(private readonly adbService: AdbService) { }

    public async listInstalledApps(options: ListInstalledAppsOptions = {}): Promise<InstalledAppInfo[]> {
        await ensureOnDeviceDexPrepared(this.adbService);

        const stdout = await this.adbService.runShellCommand(buildAppListCommand(options.packageFilters ?? []));
        const lines = stdout.split("\n").map(line => line.trim()).filter(Boolean);
        const apps: InstalledAppInfo[] = [];
        const errors: string[] = [];

        for (const line of lines) {
            if (line.startsWith("APP:")) {
                apps.push(parseAppLine(line));
                continue;
            }

            if (line.startsWith("ERROR:") || line.startsWith("FATAL:")) {
                errors.push(readRuntimeError(line));
            }
        }

        if (apps.length === 0 && errors.length > 0) {
            throw new Error(`App listing failed: ${errors[0]}`);
        }

        return apps;
    }
}

export async function listInstalledApps(options: ListInstalledAppsOptions = {}): Promise<InstalledAppInfo[]> {
    const adbService = new AdbService();
    try {
        return await listInstalledAppsWithService(adbService, options);
    } finally {
        await adbService.close();
    }
}

export async function listInstalledAppsWithService(
    adbService: AdbService,
    options: ListInstalledAppsOptions = {}
): Promise<InstalledAppInfo[]> {
    return new OnDeviceAppCatalog(adbService).listInstalledApps(options);
}

function readRuntimeError(line: string): string {
    if (line.startsWith("FATAL:")) {
        return line;
    }

    const secondColon = line.indexOf(":", line.indexOf(":") + 1);
    return secondColon === -1 ? line : line.substring(secondColon + 1).trim() || line;
}
