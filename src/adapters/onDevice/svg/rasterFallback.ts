import sharp from "sharp";
import { type AdbService } from "../../adb/AdbService";
import { MaskHelper } from "../../../shared";
import { type MaskShape, type SvgExtractionResult } from "../../../core";
import { ICON_SIZE } from "./constants";
import { buildRasterRenderCommand } from "./protocol";
import { type DeviceRenderOptions } from "./types";

export async function renderLegacyRasterSvgBatch(
    adbService: AdbService,
    packageNames: string[],
    maskShape: MaskShape,
    options: DeviceRenderOptions
): Promise<Map<string, SvgExtractionResult>> {
    const results = new Map<string, SvgExtractionResult>();
    await streamLegacyRasterSvgBatch(adbService, packageNames, maskShape, options, async (packageName, result) => {
        results.set(packageName, result);
    });
    return results;
}

export async function streamLegacyRasterSvgBatch(
    adbService: AdbService,
    packageNames: string[],
    maskShape: MaskShape,
    options: DeviceRenderOptions,
    onResult: (packageName: string, result: SvgExtractionResult) => void | Promise<void>
): Promise<void> {
    const command = buildRasterRenderCommand(packageNames, options);
    const errors: string[] = [];

    await adbService.runShellCommandStreaming(command, async line => {
        if (line.startsWith("ADAPTIVE:")) {
            const packageName = readPackageName(line);
            const buffer = await renderAdaptiveLine(line, maskShape);
            await onResult(
                packageName,
                await bufferToRasterSvgResult(
                    buffer,
                    packageName,
                    "device-rendered-adaptive",
                    "android.graphics.drawable.AdaptiveIconDrawable"
                )
            );
            return;
        }

        if (line.startsWith("ICON:")) {
            const packageName = readPackageName(line);
            const buffer = await renderIconLine(line, maskShape);
            await onResult(
                packageName,
                await bufferToRasterSvgResult(
                    buffer,
                    packageName,
                    "device-rendered-icon",
                    "android.graphics.drawable.Drawable"
                )
            );
            return;
        }

        if (line.startsWith("ERROR:") || line.startsWith("FATAL:")) {
            errors.push(line);
        }
    });

    if (errors.length > 0) {
        throw new Error(`Device render fallback failed: ${errors[0]}`);
    }
}

async function renderAdaptiveLine(line: string, maskShape: MaskShape): Promise<Buffer> {
    const firstColon = line.indexOf(":");
    const secondColon = line.indexOf(":", firstColon + 1);
    const thirdColon = line.indexOf(":", secondColon + 1);
    const fourthColon = line.indexOf(":", thirdColon + 1);

    const fgBase64 = line.substring(thirdColon + 1, fourthColon);
    const bgBase64 = line.substring(fourthColon + 1);
    const fgBuffer = Buffer.from(fgBase64, "base64");
    const bgBuffer = Buffer.from(bgBase64, "base64");

    const composited = await sharp(bgBuffer)
        .resize(ICON_SIZE, ICON_SIZE)
        .composite([{ input: await sharp(fgBuffer).resize(ICON_SIZE, ICON_SIZE).toBuffer(), top: 0, left: 0 }])
        .png()
        .toBuffer();

    return MaskHelper.applyMaskToBuffer(composited, maskShape);
}

async function renderIconLine(line: string, maskShape: MaskShape): Promise<Buffer> {
    const firstColon = line.indexOf(":");
    const secondColon = line.indexOf(":", firstColon + 1);
    const thirdColon = line.indexOf(":", secondColon + 1);
    const base64 = line.substring(thirdColon + 1);
    const pngBuffer = Buffer.from(base64, "base64");
    return MaskHelper.applyMaskToBuffer(pngBuffer, maskShape);
}

function readPackageName(line: string): string {
    const firstColon = line.indexOf(":");
    const secondColon = line.indexOf(":", firstColon + 1);
    return line.substring(firstColon + 1, secondColon);
}

async function bufferToRasterSvgResult(
    buffer: Buffer,
    packageName: string,
    sourcePath: string,
    sourceClass: string
): Promise<SvgExtractionResult> {
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width ?? ICON_SIZE;
    const height = metadata.height ?? ICON_SIZE;
    const base64Data = buffer.toString("base64");

    return {
        packageName,
        svg: buildRasterSvg(base64Data, width, height),
        iconResourceId: 0,
        sourcePath,
        rasterSourceClasses: [sourceClass],
        containsRasterImages: true,
        isPureVector: false,
        isExact: true,
        fidelity: "exact-raster",
        approximateReasons: [],
        inputApkPaths: []
    };
}

function buildRasterSvg(base64Data: string, width: number, height: number): string {
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
        `<image x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" href="data:image/png;base64,${base64Data}" />`,
        `</svg>`
    ].join("");
}
