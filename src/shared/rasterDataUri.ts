export interface EmbeddedRasterPayload {
    mimeType: "image/png" | "image/webp";
    extension: "png" | "webp";
    base64Data: string;
    standalone: boolean;
}

const IMAGE_DATA_URI_REGEX = /<image\b[^>]*(?:href|xlink:href)=["']data:(image\/(?:png|webp));base64,([^"']+)["'][^>]*>/gi;
const VISUAL_ELEMENT_REGEX = /<(?:path|rect|circle|ellipse|line|polyline|polygon|text|use|g)\b/i;

export function extractEmbeddedRasterPayload(svg: string): EmbeddedRasterPayload | null {
    const matches = [...svg.matchAll(IMAGE_DATA_URI_REGEX)];
    if (matches.length !== 1) {
        return null;
    }

    const match = matches[0];
    if (!match) {
        return null;
    }

    const mimeType = match[1] === "image/webp" ? "image/webp" : "image/png";
    const extension = mimeType === "image/webp" ? "webp" : "png";
    const imageTag = match[0];
    const base64Data = match[2];
    if (!base64Data) {
        return null;
    }

    const remainder = svg
        .replace(imageTag, "")
        .replace(/<svg\b[^>]*>/gi, "")
        .replace(/<\/svg>/gi, "")
        .replace(/<defs\b[\s\S]*?<\/defs>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .trim();
    const standalone = !VISUAL_ELEMENT_REGEX.test(remainder);

    return {
        mimeType,
        extension,
        base64Data,
        standalone
    };
}
