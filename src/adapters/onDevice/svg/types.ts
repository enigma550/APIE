export interface DeviceGroupModel {
    kind: "group";
    children: DeviceDrawableModel[];
    rotate?: number;
    pivotX?: number;
    pivotY?: number;
    scaleX?: number;
    scaleY?: number;
    translateX?: number;
    translateY?: number;
}

export interface DeviceSolidModel {
    kind: "solid";
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

export interface DeviceVectorModel {
    kind: "vector";
    viewportWidth: number;
    viewportHeight: number;
    alpha?: number;
    children: DeviceDrawableModel[];
}

export interface DevicePathModel {
    kind: "path";
    pathData: string;
    fillColor?: string;
    fillGradient?: DevicePathGradientModel;
    fillAlpha?: number;
    strokeColor?: string;
    strokeGradient?: DevicePathGradientModel;
    strokeAlpha?: number;
    strokeWidth?: number;
    strokeLineCap?: "butt" | "round" | "square";
    strokeLineJoin?: "miter" | "round" | "bevel";
    strokeMiterLimit?: number;
    fillRule?: number;
    trimPathStart?: number;
    trimPathEnd?: number;
    trimPathOffset?: number;
    paintFromMethod?: boolean;
}

export interface DeviceClipPathModel {
    kind: "clip-path";
    pathData: string;
    fillRule?: number;
}

export interface DevicePathGradientModel {
    type: "linear" | "radial";
    colors: string[];
    positions?: number[];
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    centerX?: number;
    centerY?: number;
    radius?: number;
}

export interface DeviceImageModel {
    kind: "image";
    mime: string;
    width: number;
    height: number;
    data: string;
    sourceClass?: string;
    vectorError?: string;
}

export interface DeviceGradientModel {
    kind: "gradient-shape";
    shape: "rect" | "oval";
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor?: string;
    cornerRadius?: number;
    cornerRadii?: number[];
    strokeColor?: string;
    strokeWidth?: number;
    gradient?: {
        type: "linear" | "radial";
        colors: string[];
        positions?: number[];
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
        centerX?: number;
        centerY?: number;
        radius?: number;
    };
}

export type Matrix = [number, number, number, number, number, number];

export interface DeviceRenderOptions {
    preferMonochrome?: boolean;
    preferRoundIcon?: boolean;
}

export type DeviceDrawableModel =
    | DeviceGroupModel
    | DeviceSolidModel
    | DeviceVectorModel
    | DevicePathModel
    | DeviceClipPathModel
    | DeviceImageModel
    | DeviceGradientModel;
