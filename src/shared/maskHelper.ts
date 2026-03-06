import sharp from "sharp";
import { MaskShape } from "../core";

export class MaskHelper {
    public static getMaskPath(maskShape: MaskShape, iconSize: number = 108): string {
        if (maskShape === MaskShape.Circle) {
            const radius = iconSize / 2;
            return `<circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/>`;
        } else if (maskShape === MaskShape.Squircle) {
            return `<path d="M 54 0 C 108 0 108 0 108 54 C 108 108 108 108 54 108 C 0 108 0 108 0 54 C 0 0 0 0 54 0 Z" fill="white"/>`;
        } else if (maskShape === MaskShape.Rounded) {
            const cornerRadius = 24;
            return `<rect x="0" y="0" width="${iconSize}" height="${iconSize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>`;
        }
        return ""; // Fallback for square
    }

    public static async applyMaskToBuffer(imageBuffer: Buffer | ArrayBuffer, maskShape: MaskShape): Promise<Buffer> {
        if (!maskShape || maskShape === MaskShape.Square) {
            return Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
        }

        const iconSize = 108;
        const maskPathString = this.getMaskPath(maskShape, iconSize);

        const svgMaskMarkup = `<svg width="${iconSize}" height="${iconSize}">${maskPathString}</svg>`;
        const normalizedBuffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);

        return await sharp(normalizedBuffer)
            .composite([{
                input: Buffer.from(svgMaskMarkup),
                blend: 'dest-in'
            }])
            .png()
            .toBuffer();
    }
}
