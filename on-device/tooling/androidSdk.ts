import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";
import { executableVariants, findInPath } from "./process";

export function getManagedSdkRoot(): string {
    const override = process.env.APIE_ANDROID_SDK_ROOT;
    if (override) {
        return resolve(override);
    }

    if (platform() === "win32") {
        const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
        return resolve(localAppData, "apie", "android-sdk");
    }

    if (platform() === "darwin") {
        return resolve(homedir(), "Library", "Caches", "apie", "android-sdk");
    }

    const xdgCacheHome = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
    return resolve(xdgCacheHome, "apie", "android-sdk");
}

export function getSdkRoot(): string | null {
    const configuredRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
    if (configuredRoot) {
        return resolve(configuredRoot);
    }

    const managedRoot = getManagedSdkRoot();
    return existsSync(managedRoot) ? managedRoot : null;
}

export async function resolveBuildTool(baseName: "d8" | "dx"): Promise<string | null> {
    const fromPath = findInPath(baseName);
    if (fromPath) {
        return fromPath;
    }

    const sdkRoot = getSdkRoot();
    if (!sdkRoot) {
        return null;
    }

    const buildToolsDir = join(sdkRoot, "build-tools");
    if (!existsSync(buildToolsDir)) {
        return null;
    }

    const versions = (await listDirectories(buildToolsDir)).sort(compareVersionsDescending);
    for (const version of versions) {
        for (const variant of executableVariants(baseName)) {
            const candidate = join(buildToolsDir, version, variant);
            if (existsSync(candidate)) {
                return candidate;
            }
        }
    }

    return null;
}

export async function resolveSdkManagerExecutable(sdkRootOverride?: string | null): Promise<string | null> {
    const fromPath = findInPath("sdkmanager");
    if (fromPath) {
        return fromPath;
    }

    const sdkRoot = sdkRootOverride ?? getSdkRoot();
    if (!sdkRoot) {
        return null;
    }

    for (const variant of executableVariants("sdkmanager")) {
        const candidate = join(sdkRoot, "cmdline-tools", "latest", "bin", variant);
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

export async function resolveAdbExecutable(): Promise<string | null> {
    const fromPath = findInPath("adb");
    if (fromPath) {
        return fromPath;
    }

    const sdkRoot = getSdkRoot();
    if (!sdkRoot) {
        return null;
    }

    for (const variant of executableVariants("adb")) {
        const candidate = join(sdkRoot, "platform-tools", variant);
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

export function compareVersionsDescending(left: string, right: string): number {
    const leftParts = left.split(/[.-]/).map(part => Number.parseInt(part, 10)).filter(Number.isFinite);
    const rightParts = right.split(/[.-]/).map(part => Number.parseInt(part, 10)).filter(Number.isFinite);
    const length = Math.max(leftParts.length, rightParts.length);
    for (let index = 0; index < length; index++) {
        const leftValue = leftParts[index] ?? 0;
        const rightValue = rightParts[index] ?? 0;
        if (leftValue !== rightValue) {
            return rightValue - leftValue;
        }
    }

    return right.localeCompare(left);
}

async function listDirectories(path: string): Promise<string[]> {
    if (!existsSync(path)) {
        return [];
    }

    const entries = await readdir(path, { withFileTypes: true });
    return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
}
