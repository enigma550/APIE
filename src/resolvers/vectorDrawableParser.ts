import { Aapt2Service } from "../services/cliServices";
import { IconResolver } from "./iconResolver";
import { ColorUtil } from "../utils/helpers";
import type { VectorLayerData, StackNode } from "../types";

/**
 * Parses Android Vector Drawable XML files and converts them to SVG markup.
 * Extracts paths, layers, shapes, and gradients.
 */
export class VectorDrawableParser {
    constructor(
        private readonly aapt2Service: Aapt2Service,
        private readonly iconResolver: IconResolver
    ) { }

    public async parse(apkFiles: string[], xmlContent: string, packageName: string): Promise<VectorLayerData | null> {
        // Abort on isolated gradients unless part of a shape or layer-list
        if (xmlContent.includes("E: gradient") && !xmlContent.includes("E: path") && !xmlContent.includes("E: layer-list") && !xmlContent.includes("E: shape")) {
            console.log(`[WARN] [${packageName}] Complex XML detected (gradient), aborting SVG generation.`);
            return null;
        }

        // Catch other unsupported complex XML types
        if (xmlContent.includes("E: animated-vector") || xmlContent.includes("E: selector") || xmlContent.includes("E: bitmap") || xmlContent.includes("E: mask")) {
            console.log(`[WARN] [${packageName}] Unsupported complex XML detected (animated-vector/selector/bitmap/mask).`);
            return null;
        }

        // Shape gradient support
        if (xmlContent.includes("E: shape") && xmlContent.includes("E: gradient")) {
            let startColor = "#000000";
            let endColor = "#FFFFFF";
            let angle = 0;
            let type = "0";

            const lines = xmlContent.split("\n");
            for (const line of lines) {
                if (line.includes("startColor")) {
                    const match = line.match(/=(#[0-9a-fA-F]+)/i);
                    if (match) startColor = ColorUtil.normalizeColor(match[1]).color || startColor;
                }
                if (line.includes("endColor")) {
                    const match = line.match(/=(#[0-9a-fA-F]+)/i);
                    if (match) endColor = ColorUtil.normalizeColor(match[1]).color || endColor;
                }
                if (line.includes("angle")) {
                    const match = line.match(/=([0-9]+)/);
                    if (match) angle = parseInt(match[1], 10);
                }
                if (line.includes("type")) {
                    const match = line.match(/=([0-9]+)/);
                    if (match) type = match[1];
                }
            }

            let x1 = "0%", y1 = "0%", x2 = "100%", y2 = "0%";
            switch (angle) {
                case 0: x1 = "0%"; y1 = "0%"; x2 = "100%"; y2 = "0%"; break;
                case 45: x1 = "0%"; y1 = "100%"; x2 = "100%"; y2 = "0%"; break;
                case 90: x1 = "0%"; y1 = "100%"; x2 = "0%"; y2 = "0%"; break;
                case 135: x1 = "100%"; y1 = "100%"; x2 = "0%"; y2 = "0%"; break;
                case 180: x1 = "100%"; y1 = "0%"; x2 = "0%"; y2 = "0%"; break;
                case 225: x1 = "100%"; y1 = "0%"; x2 = "0%"; y2 = "100%"; break;
                case 270: x1 = "0%"; y1 = "0%"; x2 = "0%"; y2 = "100%"; break;
                case 315: x1 = "0%"; y1 = "0%"; x2 = "100%"; y2 = "100%"; break;
            }

            const gradId = `shape_grad_${Math.random().toString(36).substring(2, 7)}`;
            let defs = type === "1"
                ? `<radialGradient id="${gradId}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${startColor}" /><stop offset="100%" stop-color="${endColor}" /></radialGradient>`
                : `<linearGradient id="${gradId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0%" stop-color="${startColor}" /><stop offset="100%" stop-color="${endColor}" /></linearGradient>`;

            return {
                svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108" preserveAspectRatio="none"><defs>${defs}</defs><rect width="108" height="108" fill="url(#${gradId})" /></svg>`
            };
        }

        // Layer-list support
        if (xmlContent.includes("E: layer-list")) {
            let combinedSvg = "";
            let baseSolidColor = "";

            const regex = /drawable.*?=@(?:ref\/)?(0x[0-9a-f]+)|\(0x01010199\)=@(0x[0-9a-f]+)/g;
            const matches = [...xmlContent.matchAll(regex)];

            for (const match of matches) {
                const hexRef = match[1] || match[2];
                if (!hexRef) continue;

                const resolved = await this.iconResolver.resolveResource(apkFiles, hexRef, packageName);

                if (resolved?.color) {
                    combinedSvg += `<rect width="108" height="108" fill="${resolved.color}" />\n`;
                    if (!baseSolidColor) baseSolidColor = resolved.color;
                } else if (resolved?.path?.endsWith(".xml")) {
                    for (const apk of apkFiles) {
                        try {
                            const innerXml = await this.aapt2Service.dumpXmlTree(apk, resolved.path);
                            if (innerXml) {
                                // Recursive call to parse inner layer
                                const innerLayer = await this.parse(apkFiles, innerXml, packageName);
                                if (innerLayer) {
                                    if (innerLayer.solidColor && !innerLayer.svg) {
                                        combinedSvg += `<rect width="108" height="108" fill="${innerLayer.solidColor}" />\n`;
                                    } else if (innerLayer.svg) {
                                        combinedSvg += innerLayer.svg + "\n";
                                    }
                                    break;
                                }
                            }
                        } catch { }
                    }
                }
            }

            if (combinedSvg) {
                return {
                    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108" preserveAspectRatio="none">\n${combinedSvg}</svg>`,
                    solidColor: baseSolidColor || undefined
                };
            }
            return null;
        }

        // Inset support
        if (xmlContent.includes("E: inset")) {
            const innerDrawableHex = xmlContent.match(/drawable.*?=@(?:ref\/)?(0x[0-9a-f]+)/s)?.[1] || xmlContent.match(/\(0x01010199\)=@(0x[0-9a-f]+)/)?.[1];
            if (innerDrawableHex) {
                const innerRes = await this.iconResolver.resolveResource(apkFiles, innerDrawableHex, packageName);
                if (innerRes?.path?.endsWith(".xml")) {
                    for (const apk of apkFiles) {
                        try {
                            const innerXml = await this.aapt2Service.dumpXmlTree(apk, innerRes.path);
                            if (innerXml) return await this.parse(apkFiles, innerXml, packageName);
                        } catch { }
                    }
                }
            }
            return null;
        }

        // Solid color vector support
        const colorMatch = xmlContent.match(/android:color.*?=@(?:ref\/)?(0x[0-9a-f]+)|android:color.*?=(#?[0-9a-fA-F]+)/) || xmlContent.match(/android:fillColor.*?=@(?:ref\/)?(0x[0-9a-f]+)|android:fillColor.*?=(#?[0-9a-fA-F]+)/);
        if (colorMatch && !xmlContent.includes("E: path") && !xmlContent.includes("E: group")) {
            if (colorMatch[1]) {
                const resolvedColor = await this.iconResolver.resolveResource(apkFiles, colorMatch[1], packageName);
                if (resolvedColor?.color) return { svg: "", solidColor: resolvedColor.color };
                return null;
            }
            return { svg: "", solidColor: ColorUtil.normalizeColor(colorMatch[2] || "").color };
        }

        const viewportWidth = xmlContent.match(/viewportWidth.*?=([0-9.]+)/)?.[1] || "108";
        const viewportHeight = xmlContent.match(/viewportHeight.*?=([0-9.]+)/)?.[1] || "108";

        const documentLines = xmlContent.split("\n");
        let svgMarkup = "";
        let pathsExtracted = 0;

        const stackNodes: StackNode[] = [];
        let clipPathCounter = 0;
        let gradientPathCount = 0;
        const layerHash = Math.random().toString(36).substring(2, 7);
        const defBlocks: string[] = [];

        for (let i = 0; i < documentLines.length; i++) {
            const line = documentLines[i];
            if (!line || (!line.trim().startsWith("E: ") && !line.trim().startsWith("A: "))) continue;

            const indentMatch = line.match(/^(\s*)/);
            const indentLevel = indentMatch?.[1]?.length || 0;

            while (stackNodes.length > 0 && (stackNodes[stackNodes.length - 1]?.indent || 0) >= indentLevel) {
                const poppedNode = stackNodes.pop();
                if (poppedNode?.tag === "group" || poppedNode?.tag === "clip-path") {
                    svgMarkup += `</g>\n`;
                }
            }

            if (line.trim().startsWith("E: ")) {
                const tagElement = line.trim().substring(3).split(" ")[0];

                if (tagElement === "group") {
                    let translateX = "0", translateY = "0", scaleX = "1", scaleY = "1", pivotX = "0", pivotY = "0", rotation = "0";
                    for (let j = i + 1; j < documentLines.length; j++) {
                        const attrLine = documentLines[j];
                        if (!attrLine) continue;
                        const attrIndentMatch = attrLine.match(/^(\s*)/);
                        if ((attrIndentMatch?.[1]?.length || 0) <= indentLevel || attrLine.trim().startsWith("E: ")) break;

                        if (attrLine.includes("translateX")) translateX = attrLine.match(/=(.*)/)?.[1] || "0";
                        if (attrLine.includes("translateY")) translateY = attrLine.match(/=(.*)/)?.[1] || "0";
                        if (attrLine.includes("scaleX")) scaleX = attrLine.match(/=(.*)/)?.[1] || "1";
                        if (attrLine.includes("scaleY")) scaleY = attrLine.match(/=(.*)/)?.[1] || "1";
                        if (attrLine.includes("pivotX")) pivotX = attrLine.match(/=(.*)/)?.[1] || "0";
                        if (attrLine.includes("pivotY")) pivotY = attrLine.match(/=(.*)/)?.[1] || "0";
                        if (attrLine.includes("rotation")) rotation = attrLine.match(/=(.*)/)?.[1] || "0";
                    }
                    const activeTransforms = [];
                    if (translateX !== "0" || translateY !== "0") activeTransforms.push(`translate(${translateX}, ${translateY})`);
                    if (pivotX !== "0" || pivotY !== "0") activeTransforms.push(`translate(${pivotX}, ${pivotY})`);
                    if (rotation !== "0") activeTransforms.push(`rotate(${rotation})`);
                    if (scaleX !== "1" || scaleY !== "1") activeTransforms.push(`scale(${scaleX}, ${scaleY})`);
                    if (pivotX !== "0" || pivotY !== "0") activeTransforms.push(`translate(${-parseFloat(pivotX)}, ${-parseFloat(pivotY)})`);

                    const transformStr = activeTransforms.length > 0 ? ` transform="${activeTransforms.join(" ")}"` : "";
                    svgMarkup += `<g${transformStr}>\n`;
                    stackNodes.push({ tag: tagElement, indent: indentLevel, transforms: activeTransforms });
                } else if (tagElement === "clip-path") {
                    clipPathCounter++;
                    const clipId = `clip_${layerHash}_${clipPathCounter}`;
                    let pathDataInfo = "";
                    for (let j = i + 1; j < documentLines.length; j++) {
                        const attrLine = documentLines[j];
                        if (!attrLine) continue;
                        const attrIndentMatch = attrLine.match(/^(\s*)/);
                        if ((attrIndentMatch?.[1]?.length || 0) <= indentLevel || attrLine.trim().startsWith("E: ")) break;
                        if (attrLine.includes("pathData")) pathDataInfo = attrLine.match(/pathData.*?="([^"]+)"/)?.[1] || "";
                    }
                    if (pathDataInfo) {
                        defBlocks.push(`<clipPath id="${clipId}"><path d="${pathDataInfo}"/></clipPath>`);
                        svgMarkup += `<g clip-path="url(#${clipId})">\n`;
                        stackNodes.push({ tag: tagElement, indent: indentLevel - 1, transforms: [], clipPathId: clipId });
                    } else {
                        svgMarkup += `<g>\n`;
                        stackNodes.push({ tag: tagElement, indent: indentLevel - 1, transforms: [] });
                    }
                } else if (tagElement === "path") {
                    pathsExtracted++;
                    let pathDataInfo = "", fillColorStr = "none", fillAlphaStr = "1", fillColorAlphaValue = 1;
                    let strokeColorStr = "none", strokeColorAlphaValue = 1, strokeWidthStr = "0", strokeLineCapStr = "butt", fillTypeStr = "nonzero";

                    for (let j = i + 1; j < documentLines.length; j++) {
                        const attrLine = documentLines[j];
                        if (!attrLine) continue;
                        const attrIndentMatch = attrLine.match(/^(\s*)/);
                        if ((attrIndentMatch?.[1]?.length || 0) <= indentLevel || attrLine.trim().startsWith("E: ")) break;

                        if (attrLine.includes("pathData")) pathDataInfo = attrLine.match(/pathData.*?="([^"]+)"/)?.[1] || "";
                        if (attrLine.includes("fillAlpha")) fillAlphaStr = attrLine.match(/=(.*)/)?.[1] || "1";
                        if (attrLine.includes("strokeWidth")) strokeWidthStr = attrLine.match(/=(.*)/)?.[1] || "0";
                        if (attrLine.includes("strokeLineCap")) {
                            const capInt = attrLine.match(/=(.*)/)?.[1] || "0";
                            if (capInt === "1") strokeLineCapStr = "round";
                            if (capInt === "2") strokeLineCapStr = "square";
                        }
                        if (attrLine.includes("fillType")) {
                            const typeInt = attrLine.match(/=(.*)/)?.[1] || "0";
                            if (typeInt === "1") fillTypeStr = "evenodd";
                        }

                        const fillMatchStr = attrLine.match(/fillColor.*?=@(?:ref\/)?([^\s"]+)|fillColor.*?=(#?[A-Fa-f0-9]+)/);
                        if (fillMatchStr) {
                            if (fillMatchStr[1]) {
                                if (fillMatchStr[1].startsWith("0x01")) {
                                    if (fillMatchStr[1] === "0x0106000b") fillColorStr = "#ffffff";
                                    else if (fillMatchStr[1] === "0x0106000c") fillColorStr = "#000000";
                                    else fillColorStr = "none";
                                } else {
                                    const resolvedFillHex = await this.iconResolver.resolveResource(apkFiles, fillMatchStr[1], packageName);
                                    if (resolvedFillHex?.path) {
                                        gradientPathCount++;
                                        const gradId = `grad_${layerHash}_${gradientPathCount}`;
                                        try {
                                            let gradXmlText = "";
                                            for (const apk of apkFiles) {
                                                try { gradXmlText = await this.aapt2Service.dumpXmlTree(apk, resolvedFillHex.path); if (gradXmlText) break; } catch { }
                                            }
                                            if (gradXmlText.includes("E: gradient")) {
                                                let gradType = "0";
                                                let startX = 0, startY = 0, endX = 0, endY = 0, centerX = 50, centerY = 50, gradientRadius = 50;
                                                const stops: { color: string; offset: number; alpha: number }[] = [];

                                                let startColor: { color: string, alpha: number } | null = null;
                                                let centerColor: { color: string, alpha: number } | null = null;
                                                let endColor: { color: string, alpha: number } | null = null;

                                                const lines = gradXmlText.split("\n");
                                                for (const line of lines) {
                                                    if (line.includes("android:type")) gradType = line.split("=")[1]?.[0] || "0";
                                                    if (line.includes("android:startX")) startX = parseFloat((line.split("=")[1] || "0").replace("F:", ""));
                                                    if (line.includes("android:startY")) startY = parseFloat((line.split("=")[1] || "0").replace("F:", ""));
                                                    if (line.includes("android:endX")) endX = parseFloat((line.split("=")[1] || "0").replace("F:", ""));
                                                    if (line.includes("android:endY")) endY = parseFloat((line.split("=")[1] || "0").replace("F:", ""));
                                                    if (line.includes("android:centerX")) centerX = parseFloat((line.split("=")[1] || "50").replace("F:", ""));
                                                    if (line.includes("android:centerY")) centerY = parseFloat((line.split("=")[1] || "50").replace("F:", ""));
                                                    if (line.includes("android:gradientRadius")) gradientRadius = parseFloat((line.split("=")[1] || "50").replace("F:", ""));

                                                    if (line.includes("android:startColor")) {
                                                        const cm = line.match(/=@(?:ref\/)?([^\s"]+)|=(#[A-Fa-f0-9]+)/);
                                                        if (cm) {
                                                            let cval = cm[2];
                                                            if (cm[1]) {
                                                                const resColor = (await this.iconResolver.resolveResource(apkFiles, cm[1], packageName))?.color;
                                                                if (resColor) cval = resColor;
                                                            }
                                                            if (cval) {
                                                                const n = ColorUtil.normalizeColor(cval);
                                                                startColor = { color: n.color || "#000000", alpha: n.alpha !== undefined ? n.alpha : 1 };
                                                            }
                                                        }
                                                    }
                                                    if (line.includes("android:centerColor")) {
                                                        const cm = line.match(/=@(?:ref\/)?([^\s"]+)|=(#[A-Fa-f0-9]+)/);
                                                        if (cm) {
                                                            let cval = cm[2];
                                                            if (cm[1]) {
                                                                const resColor = (await this.iconResolver.resolveResource(apkFiles, cm[1], packageName))?.color;
                                                                if (resColor) cval = resColor;
                                                            }
                                                            if (cval) {
                                                                const n = ColorUtil.normalizeColor(cval);
                                                                centerColor = { color: n.color || "#000000", alpha: n.alpha !== undefined ? n.alpha : 1 };
                                                            }
                                                        }
                                                    }
                                                    if (line.includes("android:endColor")) {
                                                        const cm = line.match(/=@(?:ref\/)?([^\s"]+)|=(#[A-Fa-f0-9]+)/);
                                                        if (cm) {
                                                            let cval = cm[2];
                                                            if (cm[1]) {
                                                                const resColor = (await this.iconResolver.resolveResource(apkFiles, cm[1], packageName))?.color;
                                                                if (resColor) cval = resColor;
                                                            }
                                                            if (cval) {
                                                                const n = ColorUtil.normalizeColor(cval);
                                                                endColor = { color: n.color || "#000000", alpha: n.alpha !== undefined ? n.alpha : 1 };
                                                            }
                                                        }
                                                    }

                                                    if (line.includes("E: item")) stops.push({ color: "#000000", offset: 0, alpha: 1 });
                                                    if (line.includes("android:color") && stops.length > 0) {
                                                        const cm = line.match(/=@(?:ref\/)?([^\s"]+)|=(#[A-Fa-f0-9]+)/);
                                                        const lastStop = stops[stops.length - 1];
                                                        if (cm && lastStop) {
                                                            let cval = cm[2];
                                                            if (cm[1]) {
                                                                const resColor = (await this.iconResolver.resolveResource(apkFiles, cm[1], packageName))?.color;
                                                                if (resColor) cval = resColor;
                                                            }
                                                            if (cval) {
                                                                const norm = ColorUtil.normalizeColor(cval);
                                                                lastStop.color = norm.color || "#000000";
                                                                lastStop.alpha = norm.alpha !== undefined ? norm.alpha : 1;
                                                            }
                                                        }
                                                    }
                                                    if (line.includes("android:offset") && stops.length > 0) {
                                                        const lastStop = stops[stops.length - 1];
                                                        if (lastStop) lastStop.offset = parseFloat((line.split("=")[1] || "0").replace("F:", ""));
                                                    }
                                                }

                                                const allZero = stops.every(s => s.offset === 0);
                                                if (allZero && stops.length > 1) {
                                                    for (let i = 0; i < stops.length; i++) {
                                                        const stopItem = stops[i];
                                                        if (stopItem) stopItem.offset = i / (stops.length - 1);
                                                    }
                                                }

                                                if (stops.length === 0) {
                                                    if (startColor) stops.push({ color: startColor.color, offset: 0, alpha: startColor.alpha });
                                                    if (centerColor) stops.push({ color: centerColor.color, offset: 0.5, alpha: centerColor.alpha });
                                                    if (endColor) stops.push({ color: endColor.color, offset: 1.0, alpha: endColor.alpha });
                                                }

                                                let stopMarkup = "";
                                                for (const stop of stops) {
                                                    let opAttr = stop.alpha < 0.99 ? ` stop-opacity="${stop.alpha}"` : "";
                                                    stopMarkup += `<stop offset="${stop.offset}" stop-color="${stop.color}"${opAttr} />`;
                                                }

                                                if (gradType === "1") {
                                                    defBlocks.push(`<radialGradient id="${gradId}" cx="${centerX}" cy="${centerY}" r="${gradientRadius}" gradientUnits="userSpaceOnUse">${stopMarkup}</radialGradient>`);
                                                } else {
                                                    defBlocks.push(`<linearGradient id="${gradId}" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" gradientUnits="userSpaceOnUse">${stopMarkup}</linearGradient>`);
                                                }
                                                fillColorStr = `url(#${gradId})`;
                                                fillColorAlphaValue = 1;
                                            } else {
                                                const itemMatch = gradXmlText.match(/android:color.*?=(#?[0-9a-fA-F]+)/);
                                                if (itemMatch) {
                                                    const normalizedObj = ColorUtil.normalizeColor(itemMatch[1] || "none");
                                                    fillColorStr = normalizedObj.color || "none";
                                                    fillColorAlphaValue = normalizedObj.alpha;
                                                } else fillColorStr = "none";
                                            }
                                        } catch { fillColorStr = "none"; }
                                    } else {
                                        fillColorStr = resolvedFillHex?.color || "none";
                                    }
                                }
                            } else {
                                const normalizedObj = ColorUtil.normalizeColor(fillMatchStr[2] || "");
                                fillColorStr = normalizedObj.color || "none";
                                fillColorAlphaValue = normalizedObj.alpha;
                            }
                        }

                        const strokeMatchStr = attrLine.match(/strokeColor.*?=@(?:ref\/)?(0x[0-9a-fA-F]+)|strokeColor.*?=(#?[A-Fa-f0-9]+)/);
                        if (strokeMatchStr) {
                            if (strokeMatchStr[1]) {
                                const resolvedStrokeHex = await this.iconResolver.resolveResource(apkFiles, strokeMatchStr[1], packageName);
                                if (resolvedStrokeHex?.path) return null; // Unsupported gradient stroke
                                strokeColorStr = resolvedStrokeHex?.color || "";
                            } else if (strokeMatchStr[2]) {
                                const normalizedObj = ColorUtil.normalizeColor(strokeMatchStr[2]);
                                strokeColorStr = normalizedObj.color || "none";
                                strokeColorAlphaValue = normalizedObj.alpha;
                            }
                        }
                    }
                    if (pathDataInfo) {
                        const effectiveFillOpacityValue = parseFloat(fillAlphaStr) * fillColorAlphaValue;
                        let pathString = `<path d="${pathDataInfo}" fill="${fillColorStr}" fill-rule="${fillTypeStr}"`;
                        if (effectiveFillOpacityValue < 0.999) pathString += ` fill-opacity="${Math.round(effectiveFillOpacityValue * 1000000) / 1000000}"`;
                        if (strokeColorStr && strokeWidthStr !== "0") {
                            pathString += ` stroke="${strokeColorStr}" stroke-width="${strokeWidthStr}" stroke-linecap="${strokeLineCapStr}"`;
                            if (strokeColorAlphaValue < 0.999) pathString += ` stroke-opacity="${Math.round(strokeColorAlphaValue * 1000000) / 1000000}"`;
                        }
                        pathString += ` />\n`;
                        svgMarkup += pathString;
                    }
                    stackNodes.push({ tag: tagElement, indent: indentLevel, transforms: [] });
                }
            }
        }

        while (stackNodes.length > 0) {
            const poppedNode = stackNodes.pop();
            if (poppedNode?.tag === "group" || poppedNode?.tag === "clip-path") {
                svgMarkup += `</g>\n`;
            }
        }

        if (pathsExtracted === 0 && !colorMatch && !xmlContent.includes("E: layer-list") && !xmlContent.includes("E: shape")) {
            return null;
        }

        const defsMarkupString = defBlocks.length > 0 ? `<defs>\n${defBlocks.join("\n")}\n</defs>\n` : "";
        return {
            svg: `<svg x="0" y="0" width="108" height="108" viewBox="0 0 ${viewportWidth} ${viewportHeight}" preserveAspectRatio="none">\n${defsMarkupString}${svgMarkup}</svg>`
        };
    }
}