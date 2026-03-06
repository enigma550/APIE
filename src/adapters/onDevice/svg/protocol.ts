import { REMOTE_DEX_PATH } from "./constants";
import type { DeviceDrawableModel, DeviceRenderOptions } from "./types";
import type { InstalledAppInfo } from "../../../core";

export function buildModelRenderCommand(packageNames: string[], options: DeviceRenderOptions): string {
    const extraFlags = [
        options.preferMonochrome ? "--prefer-monochrome" : "",
        options.preferRoundIcon ? "--prefer-round" : ""
    ].filter(Boolean).join(" ");
    const prefixedFlags = extraFlags.length > 0 ? ` ${extraFlags}` : "";
    return packageNames.length > 0
        ? `CLASSPATH=${REMOTE_DEX_PATH} app_process / apie.ondevice.IconExtractor --svg-model${prefixedFlags} ${packageNames.join(" ")}`
        : `CLASSPATH=${REMOTE_DEX_PATH} app_process / apie.ondevice.IconExtractor --svg-model${prefixedFlags}`;
}

export function buildRasterRenderCommand(packageNames: string[], options: DeviceRenderOptions): string {
    const extraFlags = [
        options.preferRoundIcon ? "--prefer-round" : ""
    ].filter(Boolean).join(" ");
    const prefixedFlags = extraFlags.length > 0 ? ` ${extraFlags}` : "";
    return packageNames.length > 0
        ? `CLASSPATH=${REMOTE_DEX_PATH} app_process / apie.ondevice.IconExtractor${prefixedFlags} ${packageNames.join(" ")}`
        : `CLASSPATH=${REMOTE_DEX_PATH} app_process / apie.ondevice.IconExtractor${prefixedFlags}`;
}

export function buildAppListCommand(packageNames: string[]): string {
    return packageNames.length > 0
        ? `CLASSPATH=${REMOTE_DEX_PATH} app_process / apie.ondevice.IconExtractor --list-apps ${packageNames.join(" ")}`
        : `CLASSPATH=${REMOTE_DEX_PATH} app_process / apie.ondevice.IconExtractor --list-apps`;
}

export function parseModelLine(line: string): {
    packageName: string;
    model: DeviceDrawableModel;
} {
    const firstColon = line.indexOf(":");
    const secondColon = line.indexOf(":", firstColon + 1);
    const thirdColon = line.indexOf(":", secondColon + 1);
    if (firstColon === -1 || secondColon === -1 || thirdColon === -1) {
        throw new Error(`Malformed MODEL line: ${line}`);
    }

    const packageName = line.substring(firstColon + 1, secondColon);
    const encodedJson = line.substring(thirdColon + 1);
    const json = Buffer.from(encodedJson, "base64").toString("utf8");
    return {
        packageName,
        model: JSON.parse(json) as DeviceDrawableModel
    };
}

export function readPackageNameFromModelLine(line: string): string | null {
    const firstColon = line.indexOf(":");
    const secondColon = line.indexOf(":", firstColon + 1);
    if (firstColon === -1 || secondColon === -1) {
        return null;
    }
    return line.substring(firstColon + 1, secondColon) || null;
}

export function parseDeviceErrorLine(line: string): {
    packageName: string | null;
    reason: string | null;
} {
    if (line.startsWith("ERROR:")) {
        const firstColon = line.indexOf(":");
        const secondColon = line.indexOf(":", firstColon + 1);
        if (firstColon === -1 || secondColon === -1) {
            return {
                packageName: null,
                reason: line
            };
        }

        const packageName = line.substring(firstColon + 1, secondColon) || null;
        const reasonSuffix = line.substring(secondColon + 1).trim();
        return {
            packageName,
            reason: reasonSuffix.length > 0 ? `Device model ERROR: ${reasonSuffix}` : "Device model ERROR"
        };
    }

    if (line.startsWith("FATAL:")) {
        const reasonSuffix = line.substring("FATAL:".length).trim();
        return {
            packageName: null,
            reason: reasonSuffix.length > 0 ? `Device model FATAL: ${reasonSuffix}` : "Device model FATAL"
        };
    }

    return {
        packageName: null,
        reason: null
    };
}

export function parseAppLine(line: string): InstalledAppInfo {
    const firstColon = line.indexOf(":");
    const secondColon = line.indexOf(":", firstColon + 1);
    if (firstColon === -1 || secondColon === -1) {
        throw new Error(`Malformed APP line: ${line}`);
    }

    return {
        packageName: line.substring(firstColon + 1, secondColon),
        label: line.substring(secondColon + 1)
    };
}
