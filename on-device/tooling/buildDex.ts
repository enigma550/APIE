import { existsSync } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import {
    BUILD_CLASSES_DIR,
    BUILD_ROOT,
    JAVA_DEV_STUBS_DIR,
    JAVA_SOURCE_DIR,
    OUTPUT_DEX_PATH,
    REMOTE_DEX_PATH
} from "./paths";
import { run, findInPath } from "./process";
import { resolveAdbExecutable, resolveBuildTool } from "./androidSdk";
import { ensureBuildToolsAvailableInteractively } from "./sdkInstaller";
import { resolveAndroidJar } from "./frameworkJar";
import { pushFileViaDeviceBridge, runShellCommandViaDeviceBridge } from "./deviceBridge";
import { createLogger } from "./logger";

const logger = createLogger("BUILD");

export async function buildDex(input: { verifyOnDevice: boolean; compileMode: "auto" | "stubs" | "android-jar" }): Promise<void> {
    let installResult: Awaited<ReturnType<typeof ensureBuildToolsAvailableInteractively>> | undefined;
    const javac = findInPath("javac");
    if (!javac) {
        throw new Error("javac not found. Install JDK 17+ and ensure javac is in PATH.");
    }

    let adb = await resolveAdbExecutable();
    const androidJar = input.compileMode === "stubs" ? null : await resolveAndroidJar(adb);
    let d8 = await resolveBuildTool("d8");
    let dx = d8 ? null : await resolveBuildTool("dx");
    const useDevStubs = input.compileMode === "stubs" || (!androidJar && input.compileMode === "auto");

    if (!d8 && !dx) {
        installResult = await ensureBuildToolsAvailableInteractively();
        if (installResult.sdkRoot) {
            d8 = await resolveBuildTool("d8");
            dx = d8 ? null : await resolveBuildTool("dx");
            adb = await resolveAdbExecutable();
        }
    }
    if (!d8 && !dx) {
        throw new Error(installResultMessage(typeof installResult !== "undefined" ? installResult.reason : "non-interactive"));
    }
    if (input.compileMode === "android-jar" && !androidJar) {
        throw new Error("No android.jar/framework.jar found and compile mode is android-jar.");
    }

    logger.info(`Using javac: ${javac}`);
    if (useDevStubs) {
        logger.info(`Using dev stubs: ${JAVA_DEV_STUBS_DIR}`);
    } else {
        logger.debug(`Using android.jar: ${androidJar}`);
    }
    logger.info(`Using ${d8 ? "d8" : "dx"}: ${d8 ?? dx}`);

    await rm(BUILD_ROOT, { recursive: true, force: true });
    await mkdir(BUILD_CLASSES_DIR, { recursive: true });
    const appSourceFiles = await collectJavaSourceFiles(JAVA_SOURCE_DIR);
    if (appSourceFiles.length === 0) {
        throw new Error(`No Java sources found in ${JAVA_SOURCE_DIR}`);
    }
    const stubSourceFiles = useDevStubs ? await collectJavaSourceFiles(JAVA_DEV_STUBS_DIR) : [];
    if (useDevStubs && stubSourceFiles.length === 0) {
        throw new Error(`No Java dev stubs found in ${JAVA_DEV_STUBS_DIR}`);
    }

    logger.info("Compiling Java source...");
    const javacArgs = [
        "-source", "17",
        "-target", "17",
        "-d", BUILD_CLASSES_DIR,
        "-Xlint:-options",
    ];
    if (androidJar && !useDevStubs) {
        javacArgs.push("-classpath", androidJar);
    }
    javacArgs.push(...appSourceFiles, ...stubSourceFiles);
    run(javac, javacArgs);

    if (d8) {
        const compiledClassFiles = await collectFilesByExtension(BUILD_CLASSES_DIR, ".class");
        if (compiledClassFiles.length === 0) {
            throw new Error(`No compiled .class files found in ${BUILD_CLASSES_DIR}`);
        }

        logger.info("Converting .class -> .dex via d8...");
        run(d8, [
            "--output", BUILD_ROOT,
            "--min-api", "26",
            ...compiledClassFiles
        ]);

        const classesDex = join(BUILD_ROOT, "classes.dex");
        if (!existsSync(classesDex)) {
            throw new Error("d8 completed but classes.dex was not produced.");
        }

        await Bun.write(OUTPUT_DEX_PATH, Bun.file(classesDex));
    } else if (dx) {
        logger.info("Converting .class -> .dex via dx...");
        run(dx, [
            "--dex",
            `--output=${OUTPUT_DEX_PATH}`,
            BUILD_CLASSES_DIR
        ]);
    }

    const dexStats = await stat(OUTPUT_DEX_PATH);
    logger.info(`DEX created: ${OUTPUT_DEX_PATH} (${dexStats.size} bytes)`);

    if (!input.verifyOnDevice) {
        logger.info("Done. Use --verify to push/test on a connected device.");
        return;
    }

    const verifyCommand = `CLASSPATH=${REMOTE_DEX_PATH} app_process / apie.ondevice.IconExtractor com.android.settings`;

    if (adb) {
        try {
            logger.debug("Pushing to device via adb...");
            run(adb, ["push", OUTPUT_DEX_PATH, REMOTE_DEX_PATH]);

            logger.debug("Testing basic load via adb...");
            run(adb, ["shell", verifyCommand], { allowFailure: true });
            logger.info("Verify done.");
            return;
        } catch (error) {
            logger.warn(`adb verify path failed (${String(error)}). Falling back to built-in device bridge...`);
        }
    }

    logger.debug("Pushing to device via built-in device bridge...");
    await pushFileViaDeviceBridge(OUTPUT_DEX_PATH, REMOTE_DEX_PATH);

    logger.debug("Testing basic load via built-in device bridge...");
    await runShellCommandViaDeviceBridge(verifyCommand);

    logger.info("Verify done.");
}

async function collectJavaSourceFiles(rootDir: string): Promise<string[]> {
    return collectFilesByExtension(rootDir, ".java");
}

async function collectFilesByExtension(rootDir: string, extension: string): Promise<string[]> {
    const sourceFiles: string[] = [];

    async function walk(currentDir: string): Promise<void> {
        const entries = await readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await walk(entryPath);
                continue;
            }
            if (entry.isFile() && entry.name.endsWith(extension)) {
                sourceFiles.push(entryPath);
            }
        }
    }

    await walk(rootDir);
    sourceFiles.sort();
    return sourceFiles;
}

function installResultMessage(reason: "installed" | "declined" | "non-interactive"): string {
    if (reason === "declined") {
        return "No d8/dx found. Download was declined. Install Android build-tools and set ANDROID_HOME or ANDROID_SDK_ROOT.";
    }

    if (reason === "non-interactive") {
        return "No d8/dx found. Run build:dex in an interactive terminal to allow auto-download, or install Android build-tools and set ANDROID_HOME or ANDROID_SDK_ROOT.";
    }

    return "No d8/dx found even after attempting installation. Install Android build-tools and set ANDROID_HOME or ANDROID_SDK_ROOT.";
}
