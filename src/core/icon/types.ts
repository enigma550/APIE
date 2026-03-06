export enum MaskShape {
    Square = "square",
    Circle = "circle",
    Squircle = "squircle",
    Rounded = "rounded"
}

export type OutputFormat = "auto" | "svg" | "png" | "webp";

export interface IconResult {
    buffer: Buffer;
    mimeType: "image/png" | "image/webp";
}

export interface InstalledAppInfo {
    packageName: string;
    label: string;
}

export interface AppEngineConfig {
    maskShape: MaskShape;
    writeToDisk: boolean;
    targetFormat: OutputFormat;
    customOutputDir?: string;
    targetPackage?: string;
    packageFilters?: string[];
    refreshExisting?: boolean;
    preferRoundIcon?: boolean;
    preferMonochrome?: boolean;
    reportRaster?: boolean;
    rasterReportPath?: string;
}

export type SvgFidelity =
    | "exact-vector"
    | "exact-raster"
    | "approximate-vector"
    | "approximate-raster";

export interface SvgExtractionResult {
    packageName: string;
    svg: string;
    iconResourceId: number;
    sourcePath: string;
    rasterSourceClasses?: string[];
    vectorFailureReason?: string;
    containsRasterImages: boolean;
    isPureVector: boolean;
    isExact: boolean;
    fidelity: SvgFidelity;
    approximateReasons: string[];
    inputApkPaths: string[];
}
