import { type DeviceGradientModel, type DevicePathGradientModel } from "./types";
import type { EmitState } from "./emitterTypes";
import { parseAndroidColor, trimFloat } from "./svgHelpers";

export function emitGradientShape(
    node: DeviceGradientModel,
    state: EmitState
): {
    markup: string;
    containsRasterImages: boolean;
    rasterSourceClasses: string[];
} {
    const width = Math.max(0, node.width);
    const height = Math.max(0, node.height);
    if (width === 0 || height === 0) {
        return {
            markup: "",
            containsRasterImages: false,
            rasterSourceClasses: []
        };
    }

    const fillAttributes = buildGradientFillAttributes(node, state);
    const strokeAttributes = buildGradientStrokeAttributes(node);
    const shapeMarkup = buildGradientShapeGeometry(node);
    const attributes = [fillAttributes, strokeAttributes].filter(Boolean).join(" ");

    return {
        markup: shapeMarkup.replace(" />", attributes.length > 0 ? ` ${attributes} />` : " />"),
        containsRasterImages: false,
        rasterSourceClasses: []
    };
}

export function appendPathGradientDefinition(
    gradient: DevicePathGradientModel | undefined,
    state: EmitState
): string | null {
    if (!gradient || gradient.colors.length < 2) {
        return null;
    }

    const id = `apie-gradient-${state.nextId++}`;
    const stops = buildGradientStops(gradient.colors, gradient.positions);
    if (stops.length === 0) {
        return null;
    }

    if (gradient.type === "linear") {
        const x1 = trimFloat(gradient.x1 ?? 0);
        const y1 = trimFloat(gradient.y1 ?? 0);
        const x2 = trimFloat(gradient.x2 ?? 0);
        const y2 = trimFloat(gradient.y2 ?? 0);
        state.defs.push(
            `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.join("")}</linearGradient>`
        );
        return id;
    }

    const centerX = trimFloat(gradient.centerX ?? 0);
    const centerY = trimFloat(gradient.centerY ?? 0);
    const radius = trimFloat(Math.max(0, gradient.radius ?? 0));
    if (radius === "0") {
        return null;
    }

    state.defs.push(
        `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${centerX}" cy="${centerY}" r="${radius}">${stops.join("")}</radialGradient>`
    );
    return id;
}

function buildGradientShapeGeometry(node: DeviceGradientModel): string {
    if (node.shape === "oval") {
        const cx = node.x + node.width / 2;
        const cy = node.y + node.height / 2;
        const rx = Math.max(0, node.width / 2);
        const ry = Math.max(0, node.height / 2);
        return `<ellipse cx="${trimFloat(cx)}" cy="${trimFloat(cy)}" rx="${trimFloat(rx)}" ry="${trimFloat(ry)}" />`;
    }

    const cornerRadii = (node.cornerRadii ?? []).slice(0, 8);
    const usableRadius = node.cornerRadius ?? Math.max(...cornerRadii, 0);
    const rx = Math.max(0, usableRadius);
    const ry = Math.max(0, usableRadius);
    if (rx > 0 || ry > 0) {
        return `<rect x="${trimFloat(node.x)}" y="${trimFloat(node.y)}" width="${trimFloat(node.width)}" height="${trimFloat(node.height)}" rx="${trimFloat(rx)}" ry="${trimFloat(ry)}" />`;
    }
    return `<rect x="${trimFloat(node.x)}" y="${trimFloat(node.y)}" width="${trimFloat(node.width)}" height="${trimFloat(node.height)}" />`;
}

function buildGradientFillAttributes(node: DeviceGradientModel, state: EmitState): string {
    const gradientId = appendGradientDefinition(node, state);
    if (gradientId) {
        return `fill="url(#${gradientId})"`;
    }

    if (node.fillColor) {
        const fill = parseAndroidColor(node.fillColor);
        const fillOpacity = fill.opacity < 1 ? ` fill-opacity="${trimFloat(fill.opacity)}"` : "";
        return `fill="${fill.color}"${fillOpacity}`;
    }

    return `fill="none"`;
}

function buildGradientStrokeAttributes(node: DeviceGradientModel): string {
    if (!node.strokeColor || !node.strokeWidth || node.strokeWidth <= 0) {
        return "";
    }

    const stroke = parseAndroidColor(node.strokeColor);
    const strokeOpacity = stroke.opacity < 1 ? ` stroke-opacity="${trimFloat(stroke.opacity)}"` : "";
    return `stroke="${stroke.color}" stroke-width="${trimFloat(node.strokeWidth)}"${strokeOpacity}`;
}

function appendGradientDefinition(node: DeviceGradientModel, state: EmitState): string | null {
    const gradient = node.gradient;
    if (!gradient || gradient.colors.length < 2) {
        return null;
    }

    const id = `apie-gradient-${state.nextId++}`;
    const stops = buildGradientStops(gradient.colors, gradient.positions);
    if (stops.length === 0) {
        return null;
    }

    if (gradient.type === "linear") {
        const x1 = node.x + node.width * clampUnit(gradient.x1 ?? 0);
        const y1 = node.y + node.height * clampUnit(gradient.y1 ?? 0.5);
        const x2 = node.x + node.width * clampUnit(gradient.x2 ?? 1);
        const y2 = node.y + node.height * clampUnit(gradient.y2 ?? 0.5);
        state.defs.push(
            `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${trimFloat(x1)}" y1="${trimFloat(y1)}" x2="${trimFloat(x2)}" y2="${trimFloat(y2)}">${stops.join("")}</linearGradient>`
        );
        return id;
    }

    const centerX = node.x + node.width * clampUnit(gradient.centerX ?? 0.5);
    const centerY = node.y + node.height * clampUnit(gradient.centerY ?? 0.5);
    const rawRadius = gradient.radius ?? 0.5;
    const resolvedRadius = rawRadius <= 1
        ? Math.max(node.width, node.height) * Math.max(rawRadius, 0)
        : rawRadius;
    state.defs.push(
        `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${trimFloat(centerX)}" cy="${trimFloat(centerY)}" r="${trimFloat(resolvedRadius)}">${stops.join("")}</radialGradient>`
    );
    return id;
}

function buildGradientStops(colors: string[], positions?: number[]): string[] {
    if (colors.length === 0) {
        return [];
    }

    const normalizedPositions = normalizeGradientPositions(positions, colors.length);
    return colors.map((rawColor, index) => {
        const color = parseAndroidColor(rawColor);
        const offset = normalizedPositions[index] ?? 0;
        const opacity = color.opacity < 1 ? ` stop-opacity="${trimFloat(color.opacity)}"` : "";
        return `<stop offset="${trimFloat(offset)}" stop-color="${color.color}"${opacity} />`;
    });
}

function normalizeGradientPositions(positions: number[] | undefined, count: number): number[] {
    if (!positions || positions.length !== count) {
        if (count <= 1) {
            return [0];
        }
        const step = 1 / (count - 1);
        return Array.from({ length: count }, (_, index) => clampUnit(index * step));
    }

    return positions.map(position => clampUnit(position));
}

function clampUnit(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }
    if (value < 0) {
        return 0;
    }
    if (value > 1) {
        return 1;
    }
    return value;
}
