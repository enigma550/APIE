import { chmod, mkdir, rm } from "node:fs/promises";
import { platform } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { unzip } from "unzipit";
import { compareVersionsDescending, getManagedSdkRoot, getSdkRoot, resolveSdkManagerExecutable } from "./androidSdk";
import { createLogger } from "./logger";
import { runCapture } from "./process";

const logger = createLogger("BUILD");

export async function ensureBuildToolsAvailableInteractively(): Promise<{ sdkRoot: string | null; reason: "installed" | "declined" | "non-interactive" }> {
    const sdkRoot = getSdkRoot() ?? getManagedSdkRoot();
    const confirmed = await promptYesNo(
        `Android build-tools (d8/dx) were not found. Download Android command-line tools and install the latest build-tools to ${sdkRoot}? [y/N] `
    );

    if (!confirmed) {
        return {
            sdkRoot: null,
            reason: process.stdin.isTTY && process.stdout.isTTY ? "declined" : "non-interactive"
        };
    }

    await installBuildTools(sdkRoot);
    return { sdkRoot, reason: "installed" };
}

async function installBuildTools(sdkRoot: string): Promise<void> {
    await mkdir(sdkRoot, { recursive: true });

    let sdkManager = await resolveSdkManagerExecutable(sdkRoot);
    if (!sdkManager) {
        logger.info("Downloading Android command-line tools...");
        await installCommandLineTools(sdkRoot);
        sdkManager = await resolveSdkManagerExecutable(sdkRoot);
    }

    if (!sdkManager) {
        throw new Error("sdkmanager is still unavailable after command-line tools installation.");
    }

    logger.debug(`Using sdkmanager: ${sdkManager}`);
    const buildToolsVersion = await resolveLatestBuildToolsVersion(sdkManager, sdkRoot);
    if (!buildToolsVersion) {
        throw new Error("Failed to determine latest Android build-tools version via sdkmanager --list.");
    }

    logger.info(`Installing build-tools;${buildToolsVersion}...`);
    runCapture(
        sdkManager,
        ["--sdk_root=" + sdkRoot, "--licenses"],
        {
            allowFailure: true,
            stdinText: "y\n".repeat(64)
        }
    );

    const installResult = runCapture(
        sdkManager,
        ["--sdk_root=" + sdkRoot, "--install", `build-tools;${buildToolsVersion}`],
        {
            allowFailure: true,
            stdinText: "y\n".repeat(64)
        }
    );

    process.stdout.write(installResult.stdout);
    process.stderr.write(installResult.stderr);

    if (installResult.exitCode !== 0) {
        throw new Error(`sdkmanager failed to install build-tools;${buildToolsVersion}.`);
    }
}

async function installCommandLineTools(sdkRoot: string): Promise<void> {
    const archiveName = await resolveCommandLineToolsArchiveName();
    const downloadUrl = `https://dl.google.com/android/repository/${archiveName}`;
    logger.debug(`Fetching ${downloadUrl}`);

    const response = await fetch(downloadUrl);
    if (!response.ok) {
        throw new Error(`Failed to download Android command-line tools (${response.status} ${response.statusText}).`);
    }

    const archiveBytes = new Uint8Array(await response.arrayBuffer());
    const { entries } = await unzip(archiveBytes.buffer);
    const targetRoot = join(sdkRoot, "cmdline-tools", "latest");

    await rm(targetRoot, { recursive: true, force: true });
    await mkdir(targetRoot, { recursive: true });

    for (const [entryName, entry] of Object.entries(entries)) {
        const normalizedName = entryName.replace(/\\/g, "/");
        if (normalizedName.endsWith("/")) {
            continue;
        }
        const relativeName = normalizedName.startsWith("cmdline-tools/")
            ? normalizedName.slice("cmdline-tools/".length)
            : normalizedName;
        if (!relativeName) {
            continue;
        }
        const outputPath = join(targetRoot, relativeName);
        await mkdir(dirname(outputPath), { recursive: true });
        const content = new Uint8Array(await entry.arrayBuffer());
        await Bun.write(outputPath, content);
        if (shouldBeExecutable(relativeName)) {
            await chmod(outputPath, 0o755).catch(() => {});
        }
    }
}

async function resolveCommandLineToolsArchiveName(): Promise<string> {
    const osKey = platform() === "win32"
        ? "win"
        : platform() === "darwin"
            ? "mac"
            : "linux";

    const pageResponse = await fetch("https://developer.android.com/studio");
    if (!pageResponse.ok) {
        throw new Error(`Failed to fetch Android Studio downloads page (${pageResponse.status}).`);
    }

    const html = await pageResponse.text();
    const match = html.match(new RegExp(`commandlinetools-${osKey}-[0-9]+_latest\\.zip`, "i"));
    if (!match) {
        throw new Error(`Could not locate command-line tools archive for ${osKey} on developer.android.com.`);
    }

    return match[0];
}

async function resolveLatestBuildToolsVersion(sdkManager: string, sdkRoot: string): Promise<string | null> {
    const listResult = runCapture(sdkManager, ["--sdk_root=" + sdkRoot, "--list"], { allowFailure: true });
    const combinedOutput = `${listResult.stdout}\n${listResult.stderr}`;
    const versions = combinedOutput
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.startsWith("build-tools;"))
        .map(line => line.split(/\s+\|/, 1)[0] ?? "")
        .map(packageId => packageId.slice("build-tools;".length))
        .filter(Boolean);

    const uniqueVersions = Array.from(new Set(versions)).sort(compareBuildToolsVersionsDescending);
    return uniqueVersions[0] ?? null;
}

async function promptYesNo(message: string): Promise<boolean> {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        return false;
    }

    const readline = createInterface({ input: process.stdin, output: process.stdout });
    try {
        const answer = (await readline.question(message)).trim().toLowerCase();
        return answer === "y" || answer === "yes";
    } finally {
        readline.close();
    }
}

function shouldBeExecutable(relativeName: string): boolean {
    if (platform() === "win32") {
        return false;
    }

    return relativeName.startsWith("bin/") || relativeName.startsWith("lib/");
}

function compareBuildToolsVersionsDescending(left: string, right: string): number {
    const leftIsPreview = left.includes("-rc");
    const rightIsPreview = right.includes("-rc");
    if (leftIsPreview !== rightIsPreview) {
        return leftIsPreview ? 1 : -1;
    }

    return compareVersionsDescending(left, right);
}
