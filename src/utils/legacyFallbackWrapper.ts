import sharp from "sharp";

export class LegacyFallbackWrapper {
    /**
     * Re-processes a pre-scaled legacy PNG buffer (108x108) by appending
     * an opaque background if it has transparent corners (e.g., floating logos or circles).
     * Light/white icons (luminance > 200) get a black bg; everything else gets a white bg.
     */
    public static async applyBackgroundPaddingIfSmall(
        imageBuffer: Buffer,
        targetMask: string,
        packageName: string = ""
    ): Promise<Buffer> {
        if (targetMask !== "square") return imageBuffer;

        try {
            const { data, info: rawInfo } = await sharp(imageBuffer)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            const channels = rawInfo.channels;
            if (channels >= 4 && rawInfo.width && rawInfo.height) {
                // Use bounding box logic to determine the true visible area of the icon
                let minX = rawInfo.width, minY = rawInfo.height, maxX = 0, maxY = 0;
                for (let y = 0; y < rawInfo.height; y++) {
                    for (let x = 0; x < rawInfo.width; x++) {
                        const alpha = data[(y * rawInfo.width + x) * channels + 3] ?? 255;
                        if (alpha > 50) {
                            if (x < minX) minX = x;
                            if (y < minY) minY = y;
                            if (x > maxX) maxX = x;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                if (minX > maxX) return imageBuffer; // Blank image

                const visWidth = maxX - minX + 1;
                const visHeight = maxY - minY + 1;
                const visAreaPct = (visWidth * visHeight) / (rawInfo.width * rawInfo.height);

                let hasTransparentCorners = true;

                // CRITICAL FIX: Adaptive icons safe zone is 72x72 out of 108x108 (which is ~44.4%). 
                // Threshold lowered to 0.3 (30%) to catch safe-zone squares.
                if (visAreaPct > 0.3) {
                    // Inset by 5% to bypass rounded corners and anti-aliasing
                    const edgeInset = Math.max(2, Math.floor(visWidth / 20));
                    const topY = minY + edgeInset;
                    const bottomY = maxY - edgeInset;
                    const leftX = minX + edgeInset;
                    const rightX = maxX - edgeInset;

                    // Sample the 4 corners of the true bounding box
                    const tlA = data[(topY * rawInfo.width + leftX) * channels + 3] ?? 255;
                    const trA = data[(topY * rawInfo.width + rightX) * channels + 3] ?? 255;
                    const blA = data[(bottomY * rawInfo.width + leftX) * channels + 3] ?? 255;
                    const brA = data[(bottomY * rawInfo.width + rightX) * channels + 3] ?? 255;

                    if (tlA > 200 && trA > 200 && blA > 200 && brA > 200) {
                        hasTransparentCorners = false; // It's a solid square block!
                    }
                }

                if (hasTransparentCorners) {
                    let bgHex = await this.getContrastBackground(imageBuffer);
                    return await sharp({
                        create: { width: 108, height: 108, channels: 4, background: bgHex }
                    }).composite([
                        { input: imageBuffer, blend: "over" }
                    ]).png().toBuffer();
                }
            }
        } catch (e) {
            console.debug("[WARN] LegacyFallbackWrapper failed to compute alpha footprint padding", e);
        }

        return imageBuffer;
    }

    /**
     * Determines contrast background: light/white icons (luminance > 200) → black, else white.
     */
    private static async getContrastBackground(imageBuffer: Buffer): Promise<string> {
        try {
            const colorInfo = await this.getAverageColor(imageBuffer);
            if (colorInfo && colorInfo.luminance > 195) {
                return "#000000";
            }
        } catch (e) { }
        return "#FFFFFF";
    }

    /**
     * Returns the raw average visible color of an image as a hex string.
     * Also extracts the center color, the bounding edge color, and determines if the image is a solid block.
     * Returns the color as-is with NO contrast inversion.
     */
    public static async getAverageColor(imageBuffer: Buffer): Promise<{ hex: string; centerHex: string; edgeHex: string; luminance: number; isSolidEdge: boolean } | null> {
        try {
            const { data, info } = await sharp(imageBuffer)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            if (!info || !info.channels) return null;

            // Extract center pixel
            let centerHex = "#FFFFFF";
            const cx = Math.floor(info.width / 2);
            const cy = Math.floor(info.height / 2);
            const centerIdx = (cy * info.width + cx) * info.channels;
            if (centerIdx + 2 < data.length) {
                const cr = data[centerIdx] ?? 255;
                const cg = data[centerIdx + 1] ?? 255;
                const cb = data[centerIdx + 2] ?? 255;
                centerHex = "#" + (1 << 24 | cr << 16 | cg << 8 | cb).toString(16).slice(1).toUpperCase();
            }

            // Bounding box logic to find true visible area (ignoring transparent baked padding)
            let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
            for (let y = 0; y < info.height; y++) {
                for (let x = 0; x < info.width; x++) {
                    const alpha = data[(y * info.width + x) * info.channels + 3] ?? 255;
                    if (alpha > 50) {
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (minX > maxX) {
                minX = 0; minY = 0; maxX = info.width - 1; maxY = info.height - 1;
            }

            const visWidth = maxX - minX + 1;
            const visHeight = maxY - minY + 1;
            const visAreaPct = (visWidth * visHeight) / (info.width * info.height);

            let edgeHex = "#FFFFFF";
            let isSolidEdge = false;

            // Threshold lowered to 0.3 for the same 44.4% safe-zone reason
            if (visAreaPct > 0.3) {
                // Inset by 5% to safely read the color inside the true shape (past any border-radius)
                const edgeInset = Math.max(2, Math.floor(visWidth / 20));
                const topY = minY + edgeInset;
                const bottomY = maxY - edgeInset;
                const leftX = minX + edgeInset;
                const rightX = maxX - edgeInset;

                const tlIdx = (topY * info.width + leftX) * info.channels;
                const trIdx = (topY * info.width + rightX) * info.channels;
                const blIdx = (bottomY * info.width + leftX) * info.channels;
                const brIdx = (bottomY * info.width + rightX) * info.channels;

                const tlA = data[tlIdx + 3] ?? 255;
                const trA = data[trIdx + 3] ?? 255;
                const blA = data[blIdx + 3] ?? 255;
                const brA = data[brIdx + 3] ?? 255;

                // If all 4 corners of the true bounding box are highly opaque, it's a full-bleed square!
                if (tlA > 200 && trA > 200 && blA > 200 && brA > 200) {
                    isSolidEdge = true;
                    const er = data[tlIdx] ?? 255;
                    const eg = data[tlIdx + 1] ?? 255;
                    const eb = data[tlIdx + 2] ?? 255;
                    edgeHex = "#" + (1 << 24 | er << 16 | eg << 8 | eb).toString(16).slice(1).toUpperCase();
                }
            }

            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            const channels = info.channels;

            for (let i = 0; i < data.length; i += channels) {
                if (channels === 4 && (data[i + 3] ?? 255) < 128) continue; // Skip mostly transparent pixels
                // Skip nearly white pixels to avoid background bias on some icons
                if ((data[i] ?? 0) > 245 && (data[i + 1] ?? 0) > 245 && (data[i + 2] ?? 0) > 245) continue;

                rSum += data[i] ?? 0;
                gSum += data[i + 1] ?? 0;
                bSum += data[i + 2] ?? 0;
                count++;
            }

            if (count === 0) return { hex: centerHex, centerHex, edgeHex, luminance: 255, isSolidEdge };

            const r = Math.round(rSum / count);
            const g = Math.round(gSum / count);
            const b = Math.round(bSum / count);

            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            const hex = "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();

            return { hex, centerHex, edgeHex, luminance, isSolidEdge };
        } catch (e) { }
        return null;
    }
}