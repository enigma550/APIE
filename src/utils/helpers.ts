import { MaskShape, type ColorData } from "../types";

// Color manipulation utilities
export class ColorUtil {
    public static normalizeColor(colorValue: string): ColorData {
        if (!colorValue) return { color: "", alpha: 1 };

        const cleanColor = colorValue.trim().replace(/'/g, "");

        if ((cleanColor.startsWith("#") || cleanColor.startsWith("0x")) && (cleanColor.length === 9 || cleanColor.length === 10)) {
            const hexPart = cleanColor.startsWith("0x") ? cleanColor.substring(2) : cleanColor.substring(1);
            const alpha = parseInt(hexPart.substring(0, 2), 16) / 255;
            return {
                color: "#" + hexPart.substring(2, 8),
                alpha: Math.round(alpha * 1000) / 1000
            };
        }

        return cleanColor.startsWith("#") ? { color: cleanColor, alpha: 1 } : { color: "", alpha: 1 };
    }
}

// File scoring utilities
export class FileUtil {
    public static calculatePngScore(filePath: string, maskShape: MaskShape = MaskShape.Square): number {
        const lowerPath = filePath.toLowerCase();
        const isPng = lowerPath.endsWith(".png");
        const isWebp = lowerPath.endsWith(".webp");

        if (!isPng && !isWebp) return -1;
        if (!lowerPath.startsWith("res/")) return -1;

        const fileName = lowerPath.split("/").pop()?.replace(".png", "").replace(".webp", "") || "";
        let currentScore = 50;

        if (isWebp) currentScore -= 5;

        const isMipmap = lowerPath.includes("/mipmap");
        const isDrawable = lowerPath.includes("/drawable");

        if (isMipmap) {
            currentScore += 500;
        } else if (isDrawable) {
            const validRegex = /(icon|launcher|logo|app|brand)/;
            const startsWithLauncher = fileName.startsWith("ic_launcher") || fileName.startsWith("app_icon");
            if (startsWithLauncher) currentScore += 100;
            else if (validRegex.test(fileName)) currentScore += 50;
            else currentScore += 10;
        } else {
            return -1;
        }

        if (lowerPath.includes("xxxhdpi")) currentScore += 40;
        else if (lowerPath.includes("xxhdpi")) currentScore += 30;
        else if (lowerPath.includes("xhdpi")) currentScore += 20;
        else if (lowerPath.includes("hdpi")) currentScore += 10;

        if (lowerPath.includes("foreground") || lowerPath.includes("background")) currentScore -= 200;

        const isRound = lowerPath.includes("round") || lowerPath.includes("circle");
        const wantsRound = maskShape === MaskShape.Circle;

        if (isRound === wantsRound) currentScore += 15;

        return currentScore;
    }
}