// Shared interfaces for the entire project
export interface ColorData {
    color: string;
    alpha: number;
}

export interface ResourceResolution {
    path?: string;
    color?: string;
}

export interface VectorLayerData {
    svg: string;
    solidColor?: string;
}

export interface FileScore {
    path: string;
    score: number;
    apk: string;
}

export interface StackNode {
    tag: string;
    indent: number;
    transforms: string[];
    clipPathId?: string;
}

export enum MaskShape {
    Square = "square",
    Circle = "circle",
    Squircle = "squircle",
    Rounded = "rounded"
}

export type OutputFormat = "native" | "png" | "webp" | "svg";

export interface IconResult {
    buffer: Buffer;
    mimeType: "image/png" | "image/svg+xml" | "image/webp";
}

export interface AppEngineConfig {
    maskShape: MaskShape;
    writeToDisk: boolean;
    targetFormat: OutputFormat;
    customOutputDir?: string;
    maxConcurrentTasks?: number;
}