import { MaskShape } from "../../../core";
import { ICON_SIZE } from "./constants";
import { type EmittedNode, type EmitState } from "./emitterTypes";
import { appendPathGradientDefinition, emitGradientShape } from "./gradients";
import { buildGroupTransform } from "./transforms";
import { appendClipPaths, appendMaskClipPath, escapeXml, mapAndroidFillRuleToSvgRule, parseAndroidColor, trimFloat } from "./svgHelpers";
export { getUnusableDeviceModelReason } from "./validation";
import type {
    DeviceDrawableModel,
    DevicePathModel
} from "./types";

export function emitModelSvg(
    model: DeviceDrawableModel,
    maskShape: MaskShape
): {
    svg: string;
    containsRasterImages: boolean;
    rasterSourceClasses: string[];
} {
    const state: EmitState = {
        nextId: 0,
        defs: []
    };
    const body = emitModelNode(model, state);
    const maskClipPathId = appendMaskClipPath(state, maskShape);
    const defsMarkup = state.defs.length > 0 ? `<defs>${state.defs.join("")}</defs>` : "";
    const content = maskClipPathId
        ? `<g clip-path="url(#${maskClipPathId})">${body.markup}</g>`
        : body.markup;

    return {
        svg: [
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}" width="${ICON_SIZE}" height="${ICON_SIZE}">`,
            defsMarkup,
            content,
            `</svg>`
        ].join(""),
        containsRasterImages: body.containsRasterImages,
        rasterSourceClasses: body.rasterSourceClasses
    };
}

function emitModelNode(
    node: DeviceDrawableModel,
    state: EmitState
): EmittedNode {
    switch (node.kind) {
        case "vector": {
            const viewportWidth = node.viewportWidth > 0 ? node.viewportWidth : ICON_SIZE;
            const viewportHeight = node.viewportHeight > 0 ? node.viewportHeight : ICON_SIZE;
            const scaleX = ICON_SIZE / viewportWidth;
            const scaleY = ICON_SIZE / viewportHeight;
            const clipPathId = appendClipPaths(state, node.children);
            const emitted = emitChildren(node.children.filter(child => child.kind !== "clip-path"), state);
            const transform = `scale(${trimFloat(scaleX)} ${trimFloat(scaleY)})`;
            const opacity = node.alpha !== undefined && node.alpha < 1 ? ` opacity="${trimFloat(node.alpha)}"` : "";
            const clipAttribute = clipPathId ? ` clip-path="url(#${clipPathId})"` : "";
            return {
                markup: `<g transform="${transform}"${opacity}${clipAttribute}>${emitted.markup}</g>`,
                containsRasterImages: emitted.containsRasterImages,
                rasterSourceClasses: emitted.rasterSourceClasses
            };
        }
        case "group": {
            const clipPathId = appendClipPaths(state, node.children);
            const emitted = emitChildren(node.children.filter(child => child.kind !== "clip-path"), state);
            const transform = buildGroupTransform(node);
            const attributes = [
                transform ? ` transform="${transform}"` : "",
                clipPathId ? ` clip-path="url(#${clipPathId})"` : ""
            ].join("");
            return {
                markup: attributes ? `<g${attributes}>${emitted.markup}</g>` : emitted.markup,
                containsRasterImages: emitted.containsRasterImages,
                rasterSourceClasses: emitted.rasterSourceClasses
            };
        }
        case "solid": {
            const fill = parseAndroidColor(node.color);
            const opacity = fill.opacity < 1 ? ` fill-opacity="${trimFloat(fill.opacity)}"` : "";
            return {
                markup: `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="${fill.color}"${opacity} />`,
                containsRasterImages: false,
                rasterSourceClasses: []
            };
        }
        case "gradient-shape":
            return emitGradientShape(node, state);
        case "path": {
            return emitPathNode(node, state);
        }
        case "clip-path":
            return {
                markup: "",
                containsRasterImages: false,
                rasterSourceClasses: []
            };
        case "image":
        default:
            return {
                markup: `<image x="0" y="0" width="${node.width}" height="${node.height}" preserveAspectRatio="none" href="data:${node.mime};base64,${node.data}" />`,
                containsRasterImages: true,
                rasterSourceClasses: node.sourceClass ? [node.sourceClass] : []
            };
    }
}

function emitChildren(
    children: DeviceDrawableModel[],
    state: EmitState
): EmittedNode {
    let containsRasterImages = false;
    const rasterSourceClasses = new Set<string>();
    const markup = children.map(child => {
        const emitted = emitModelNode(child, state);
        if (emitted.containsRasterImages) {
            containsRasterImages = true;
        }
        for (const sourceClass of emitted.rasterSourceClasses) {
            rasterSourceClasses.add(sourceClass);
        }
        return emitted.markup;
    }).join("");

    return {
        markup,
        containsRasterImages,
        rasterSourceClasses: [...rasterSourceClasses]
    };
}

function emitPathNode(node: DevicePathModel, state: EmitState): EmittedNode {
    const attributes: string[] = [`d="${escapeXml(node.pathData)}"`];
    let hasExplicitFill = false;
    const fillGradientId = appendPathGradientDefinition(node.fillGradient, state);

    if (fillGradientId) {
        const fillAlpha = node.fillAlpha ?? 1;
        if (fillAlpha <= 0) {
            attributes.push(`fill="none"`);
        } else {
            attributes.push(`fill="url(#${fillGradientId})"`);
            if (fillAlpha < 1) {
                attributes.push(`fill-opacity="${trimFloat(fillAlpha)}"`);
            }
        }
        hasExplicitFill = true;
    } else if (node.fillColor) {
        const fill = parseAndroidColor(node.fillColor);
        const opacity = fill.opacity * (node.fillAlpha ?? 1);
        if (opacity <= 0) {
            attributes.push(`fill="none"`);
        } else {
            attributes.push(`fill="${fill.color}"`);
            if (opacity < 1) {
                attributes.push(`fill-opacity="${trimFloat(opacity)}"`);
            }
        }
        hasExplicitFill = true;
    } else {
        attributes.push(`fill="#000000"`);
    }

    const strokeGradientId = appendPathGradientDefinition(node.strokeGradient, state);
    const strokeWidth = node.strokeWidth ?? 0;
    if (strokeGradientId) {
        const opacity = node.strokeAlpha ?? 1;
        if (opacity > 0 && strokeWidth > 0) {
            attributes.push(`stroke="url(#${strokeGradientId})"`);
            if (opacity < 1) {
                attributes.push(`stroke-opacity="${trimFloat(opacity)}"`);
            }
            attributes.push(`stroke-width="${trimFloat(strokeWidth)}"`);
            if (node.strokeLineCap) {
                attributes.push(`stroke-linecap="${node.strokeLineCap}"`);
            }
            if (node.strokeLineJoin) {
                attributes.push(`stroke-linejoin="${node.strokeLineJoin}"`);
            }
            if (node.strokeMiterLimit !== undefined) {
                attributes.push(`stroke-miterlimit="${trimFloat(node.strokeMiterLimit)}"`);
            }
        }
    } else if (node.strokeColor) {
        const stroke = parseAndroidColor(node.strokeColor);
        const opacity = stroke.opacity * (node.strokeAlpha ?? 1);
        if (opacity > 0 && strokeWidth > 0) {
            attributes.push(`stroke="${stroke.color}"`);
            if (opacity < 1) {
                attributes.push(`stroke-opacity="${trimFloat(opacity)}"`);
            }
            attributes.push(`stroke-width="${trimFloat(strokeWidth)}"`);
            if (node.strokeLineCap) {
                attributes.push(`stroke-linecap="${node.strokeLineCap}"`);
            }
            if (node.strokeLineJoin) {
                attributes.push(`stroke-linejoin="${node.strokeLineJoin}"`);
            }
            if (node.strokeMiterLimit !== undefined) {
                attributes.push(`stroke-miterlimit="${trimFloat(node.strokeMiterLimit)}"`);
            }
        }
    }

    if (!hasExplicitFill && node.fillAlpha !== undefined && node.fillAlpha < 1) {
        attributes.push(`fill-opacity="${trimFloat(node.fillAlpha)}"`);
    }

    const fillRule = mapAndroidFillRuleToSvgRule(node.fillRule);
    if (fillRule) {
        attributes.push(`fill-rule="${fillRule}"`);
    }

    return {
        markup: `<path ${attributes.join(" ")} />`,
        containsRasterImages: false,
        rasterSourceClasses: []
    };
}
