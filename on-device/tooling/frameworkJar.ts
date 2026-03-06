import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { unzip } from "unzipit";
import { CACHE_ROOT, FRAMEWORK_CACHE_JAR } from "./paths";
import { pullFileViaDeviceBridge } from "./deviceBridge";
import { run } from "./process";
import { getSdkRoot } from "./androidSdk";
import { createLogger } from "./logger";

const logger = createLogger("BUILD");

export async function resolveAndroidJar(adbExecutable: string | null): Promise<string | null> {
    const explicitJar = process.env.ANDROID_JAR;
    if (explicitJar && existsSync(explicitJar)) {
        return (await isUsableAndroidCompileJar(explicitJar)) ? resolve(explicitJar) : null;
    }

    const sdkRoot = getSdkRoot();
    if (sdkRoot) {
        const platformsDir = join(sdkRoot, "platforms");
        if (existsSync(platformsDir)) {
            const platforms = await listDirectories(platformsDir);
            const candidates = platforms
                .filter(name => name.startsWith("android-"))
                .sort(compareVersionsDescending)
                .map(name => join(platformsDir, name, "android.jar"))
                .filter(candidate => existsSync(candidate));
            if (candidates.length > 0) {
                return candidates[0]!;
            }
        }
    }

    if (existsSync(FRAMEWORK_CACHE_JAR)) {
        if (await isUsableAndroidCompileJar(FRAMEWORK_CACHE_JAR)) {
            return FRAMEWORK_CACHE_JAR;
        }
        logger.debug("Cached framework.jar is not a usable host-side compile jar. Falling back to dev stubs.");
        return null;
    }

    logger.debug("No Android SDK platform jar found. Trying on-device bridge pull...");
    if (await pullFrameworkJarViaDeviceBridge(FRAMEWORK_CACHE_JAR)) {
        return FRAMEWORK_CACHE_JAR;
    }

    if (!adbExecutable) {
        return null;
    }

    logger.debug("Device bridge pull failed, falling back to adb binary pull...");
    await mkdir(CACHE_ROOT, { recursive: true });
    run(adbExecutable, ["pull", "/system/framework/framework.jar", FRAMEWORK_CACHE_JAR], {
        allowFailure: true
    });

    if (!existsSync(FRAMEWORK_CACHE_JAR)) {
        return null;
    }

    if (await isUsableAndroidCompileJar(FRAMEWORK_CACHE_JAR)) {
        return FRAMEWORK_CACHE_JAR;
    }

    logger.debug("Pulled framework.jar is not a usable host-side compile jar. Falling back to dev stubs.");
    return null;
}

function compareVersionsDescending(left: string, right: string): number {
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

async function pullFrameworkJarViaDeviceBridge(targetPath: string): Promise<boolean> {
    try {
        const bytes = await pullFileViaDeviceBridge("/system/framework/framework.jar");
        await Bun.write(targetPath, bytes);
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.debug(`Device bridge framework pull failed: ${message}`);
        return false;
    }
}

async function isUsableAndroidCompileJar(jarPath: string): Promise<boolean> {
    try {
        const archive = await unzip(await Bun.file(jarPath).arrayBuffer());
        return Boolean(
            archive.entries["android/content/Context.class"] &&
            archive.entries["android/content/pm/PackageManager.class"] &&
            archive.entries["android/graphics/drawable/Drawable.class"]
        );
    } catch {
        return false;
    }
}
