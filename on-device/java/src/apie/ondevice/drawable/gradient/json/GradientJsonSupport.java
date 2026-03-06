package apie.ondevice.drawable.gradient.json;

import apie.ondevice.support.JsonUtils;

public final class GradientJsonSupport {
    private GradientJsonSupport() {
    }

    public static boolean isMeaningfulGradientPalette(int[] colors) {
        if (colors == null || colors.length < 2) {
            return false;
        }

        boolean anyVisible = false;
        boolean hasDifferentColor = false;
        int first = colors[0];

        for (int color : colors) {
            int alpha = (color >>> 24) & 0xff;
            if (alpha > 0) {
                anyVisible = true;
            }
            if (color != first) {
                hasDifferentColor = true;
            }
        }

        if (!anyVisible) {
            return false;
        }

        return hasDifferentColor;
    }

    public static void appendColorsAndPositions(StringBuilder builder, int[] colors, float[] positions) {
        builder.append(",\"colors\":");
        JsonUtils.appendColorArrayJson(builder, colors);

        if (positions != null && positions.length == colors.length) {
            builder.append(",\"positions\":");
            JsonUtils.appendFloatArrayJson(builder, positions);
        }
    }
}
