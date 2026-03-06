import { AdbService } from "../../adb/AdbService";
import { type MaskShape, type SvgExtractionResult } from "../../../core";
import {
    buildModelRenderCommand,
    parseDeviceErrorLine,
    parseModelLine,
    readPackageNameFromModelLine
} from "./protocol";
import { ensureOnDeviceDexPrepared } from "../deviceRuntime";
import { renderLegacyRasterSvgBatch, streamLegacyRasterSvgBatch } from "./rasterFallback";
import { emitModelSvg, getUnusableDeviceModelReason } from "./svgModelEmitter";
import { type DeviceRenderOptions } from "./types";

const modelSupportByService = new WeakMap<AdbService, boolean>();

interface DeviceModelBatchOutcome {
    results: Map<string, SvgExtractionResult>;
    modelFailureReasons: Map<string, string>;
}

export interface DeviceRenderStreamEvent {
    packageName: string;
    result: SvgExtractionResult;
}

export async function renderExactDeviceSvg(
    adbService: AdbService,
    packageName: string,
    maskShape: MaskShape,
    options: DeviceRenderOptions = {}
): Promise<SvgExtractionResult> {
    const results = await renderExactDeviceSvgBatch(adbService, [packageName], maskShape, options);
    const result = results.get(packageName);
    if (!result) {
        throw new Error(`Device render fallback did not return icon data for package '${packageName}'.`);
    }
    return result;
}

export async function renderExactDeviceSvgBatch(
    adbService: AdbService,
    packageNames: string[],
    maskShape: MaskShape,
    options: DeviceRenderOptions = {}
): Promise<Map<string, SvgExtractionResult>> {
    const results = new Map<string, SvgExtractionResult>();
    await streamExactDeviceSvgBatch(adbService, packageNames, maskShape, options, event => {
        results.set(event.packageName, event.result);
    });
    return results;
}

export async function streamExactDeviceSvgBatch(
    adbService: AdbService,
    packageNames: string[],
    maskShape: MaskShape,
    options: DeviceRenderOptions = {},
    onResult: (event: DeviceRenderStreamEvent) => void | Promise<void>
): Promise<void> {
    await ensureDeviceRendererPrepared(adbService);

    const allResults = new Map<string, SvgExtractionResult>();
    let modelResults = new Map<string, SvgExtractionResult>();
    let modelFailureReasons = new Map<string, string>();
    const shouldTryModel = modelSupportByService.get(adbService) !== false;

    const emitResult = async (packageName: string, result: SvgExtractionResult) => {
        allResults.set(packageName, result);
        await onResult({ packageName, result });
    };

    if (shouldTryModel) {
        try {
            const modelOutcome = await streamDeviceModelSvgBatch(adbService, packageNames, maskShape, options, emitResult);
            modelResults = modelOutcome.results;
            modelFailureReasons = modelOutcome.modelFailureReasons;
            modelSupportByService.set(adbService, true);
        } catch {
            modelSupportByService.set(adbService, false);
        }
    }

    const missingPackages = packageNames.filter(packageName => !modelResults.has(packageName));
    if (missingPackages.length === 0) {
        return;
    }

    const shouldAnnotateModelFailure = modelFailureReasons.size > 0;
    if (!shouldAnnotateModelFailure) {
        await streamLegacyRasterSvgBatch(adbService, missingPackages, maskShape, options, emitResult);
        return;
    }

    const rasterResults = await renderLegacyRasterSvgBatch(adbService, missingPackages, maskShape, options);
    for (const [packageName, result] of rasterResults) {
        const modelFailureReason = modelFailureReasons.get(packageName);
        const annotatedResult = modelFailureReason
            ? {
                ...result,
                vectorFailureReason: modelFailureReason
            }
            : result;
        await emitResult(packageName, annotatedResult);
    }
}

export async function renderLegacyDeviceSvgBatch(
    adbService: AdbService,
    packageNames: string[],
    maskShape: MaskShape,
    options: DeviceRenderOptions = {}
): Promise<Map<string, SvgExtractionResult>> {
    await ensureDeviceRendererPrepared(adbService);
    return renderLegacyRasterSvgBatch(adbService, packageNames, maskShape, options);
}

async function ensureDeviceRendererPrepared(adbService: AdbService): Promise<void> {
    await ensureOnDeviceDexPrepared(adbService);
}

async function streamDeviceModelSvgBatch(
    adbService: AdbService,
    packageNames: string[],
    maskShape: MaskShape,
    options: DeviceRenderOptions,
    onResult: (packageName: string, result: SvgExtractionResult) => void | Promise<void>
): Promise<DeviceModelBatchOutcome> {
    const command = buildModelRenderCommand(packageNames, options);
    const results = new Map<string, SvgExtractionResult>();
    const modelFailureReasons = new Map<string, string>();
    const errors: string[] = [];

    await adbService.runShellCommandStreaming(command, async line => {
        if (line.startsWith("MODEL:")) {
            try {
                const parsed = parseModelLine(line);
                const unusableReason = getUnusableDeviceModelReason(parsed.model);
                if (unusableReason) {
                    modelFailureReasons.set(parsed.packageName, unusableReason);
                    return;
                }

                const emitted = emitModelSvg(parsed.model, maskShape);
                const result: SvgExtractionResult = {
                    packageName: parsed.packageName,
                    svg: emitted.svg,
                    iconResourceId: 0,
                    sourcePath: "device-model",
                    rasterSourceClasses: emitted.rasterSourceClasses,
                    containsRasterImages: emitted.containsRasterImages,
                    isPureVector: !emitted.containsRasterImages,
                    isExact: true,
                    fidelity: emitted.containsRasterImages ? "exact-raster" : "exact-vector",
                    approximateReasons: [],
                    inputApkPaths: []
                };
                results.set(parsed.packageName, result);
                await onResult(parsed.packageName, result);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push(message);
                const packageName = readPackageNameFromModelLine(line);
                if (packageName) {
                    modelFailureReasons.set(packageName, `MODEL parse error: ${message}`);
                }
            }
            return;
        }

        if (line.startsWith("ERROR:") || line.startsWith("FATAL:")) {
            errors.push(line);
            const parsed = parseDeviceErrorLine(line);
            if (parsed.packageName && parsed.reason) {
                modelFailureReasons.set(parsed.packageName, parsed.reason);
            }
        }
    });

    if (results.size === 0 && errors.length > 0) {
        throw new Error(`Device model render failed: ${errors[0]}`);
    }

    return {
        results,
        modelFailureReasons
    };
}
