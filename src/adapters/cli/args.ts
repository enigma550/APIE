import { MaskShape, type OutputFormat } from "../../core";

export interface MainCliOptions {
    showHelp: boolean;
    error?: string;
    batchOptions: {
        packageFilters?: string[];
        writeToDisk: boolean;
        customOutputDir?: string;
        outputFormat: OutputFormat;
        maskShape: MaskShape;
        refreshExisting: boolean;
        preferMonochrome: boolean;
        preferRoundIcon: boolean;
        reportRaster: boolean;
        rasterReportPath?: string;
    };
}

export function parseMainCliArgs(args: string[]): MainCliOptions {
    const hasFlag = (keys: string[]): boolean => args.some(arg => keys.includes(arg));
    const getOptionValue = (keys: string[]): string | undefined => {
        const index = args.findIndex(arg => keys.includes(arg));
        return index !== -1 && args.length > index + 1 ? args[index + 1] : undefined;
    };

    if (hasFlag(["--all", "--svg", "--apk"])) {
        return {
            showHelp: false,
            error: "--all, --svg and --apk are removed. Use default all-app mode or --device-package/-dp.",
            batchOptions: getDefaultBatchOptions()
        };
    }

    const formatRaw = (getOptionValue(["-f", "--format"]) ?? "auto").toLowerCase();
    if (!isOutputFormat(formatRaw)) {
        return {
            showHelp: false,
            error: `Unknown format '${formatRaw}'. Use auto, svg, png or webp.`,
            batchOptions: getDefaultBatchOptions()
        };
    }

    const shapeRaw = (getOptionValue(["-s", "--shape"]) ?? MaskShape.Square).toLowerCase();
    if (!Object.values(MaskShape).includes(shapeRaw as MaskShape)) {
        return {
            showHelp: false,
            error: `Unknown shape '${shapeRaw}'. Use square, circle, squircle or rounded.`,
            batchOptions: getDefaultBatchOptions()
        };
    }

    const devicePackage = getOptionValue(["--device-package", "-dp"]);
    return {
        showHelp: hasFlag(["-h", "--help"]),
        batchOptions: {
            packageFilters: devicePackage ? [devicePackage] : undefined,
            writeToDisk: hasFlag(["-w", "--write"]),
            customOutputDir: getOptionValue(["-o", "--output"]),
            outputFormat: formatRaw,
            maskShape: shapeRaw as MaskShape,
            refreshExisting: hasFlag(["--refresh"]),
            preferMonochrome: hasFlag(["--monochrome"]),
            preferRoundIcon: hasFlag(["--round"]),
            reportRaster: hasFlag(["--report-raster"]),
            rasterReportPath: getOptionValue(["--report-raster-path"])
        }
    };
}

function getDefaultBatchOptions(): MainCliOptions["batchOptions"] {
    return {
        writeToDisk: false,
        outputFormat: "auto",
        maskShape: MaskShape.Square,
        refreshExisting: false,
        preferMonochrome: false,
        preferRoundIcon: false,
        reportRaster: false
    };
}

function isOutputFormat(value: string): value is OutputFormat {
    return value === "auto" || value === "svg" || value === "png" || value === "webp";
}
