import { MaskHelper } from "../../../shared/maskHelper";
import { MaskShape } from "../../../core";
import { ICON_SIZE } from "./constants";
import type { DeviceClipPathModel, DeviceDrawableModel } from "./types";
import type { EmitState } from "./emitterTypes";

export function appendMaskClipPath(state: EmitState, maskShape: MaskShape): string | null {
    if (maskShape === MaskShape.Square) {
        return null;
    }

    const baseMask = MaskHelper.getMaskPath(maskShape, 108);
    const scale = ICON_SIZE / 108;
    const id = "apie-mask";
    state.defs.push(`<clipPath id="${id}"><g transform="scale(${trimFloat(scale)})">${baseMask}</g></clipPath>`);
    return id;
}

export function appendClipPaths(state: EmitState, children: DeviceDrawableModel[]): string | null {
    const clipNodes = children.filter((child): child is DeviceClipPathModel => child.kind === "clip-path");
    if (clipNodes.length === 0) {
        return null;
    }

    const id = `apie-clip-${state.nextId++}`;
    state.defs.push(
        `<clipPath id="${id}" clipPathUnits="userSpaceOnUse">${clipNodes.map(node => {
            const clipRule = mapAndroidFillRuleToSvgRule(node.fillRule);
            const clipRuleAttributes = clipRule ? ` clip-rule="${clipRule}" fill-rule="${clipRule}"` : "";
            return `<path d="${escapeXml(node.pathData)}"${clipRuleAttributes} />`;
        }).join("")}</clipPath>`
    );
    return id;
}

export function mapAndroidFillRuleToSvgRule(fillRule: number | undefined): "evenodd" | "nonzero" | null {
    if (fillRule === 0) {
        return "evenodd";
    }

    if (fillRule === 1) {
        return "nonzero";
    }

    return null;
}

export function parseAndroidColor(input: string): {
    color: string;
    opacity: number;
} {
    const normalized = input.trim().toLowerCase();
    if (/^#[0-9a-f]{8}$/.test(normalized)) {
        const alpha = Number.parseInt(normalized.slice(1, 3), 16) / 255;
        return {
            color: `#${normalized.slice(3)}`,
            opacity: alpha
        };
    }

    if (/^#[0-9a-f]{6}$/.test(normalized)) {
        return {
            color: normalized,
            opacity: 1
        };
    }

    return {
        color: "#000000",
        opacity: 1
    };
}

export function trimFloat(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

export function escapeXml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("\"", "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
