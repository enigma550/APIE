package apie.ondevice.drawable.gradient.json;

import apie.ondevice.drawable.gradient.paint.PaintGradientResolver;
import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

public final class GradientColorJson {
    private GradientColorJson() {
    }

    public static String gradientColorToJson(Object gradientColor) {
        if (!PaintGradientResolver.isGradientColorValue(gradientColor)) {
            return null;
        }

        int[] colors = ReflectionUtils.getIntArrayFieldQuiet(gradientColor, "mItemColors");
        if (colors == null || colors.length < 2) {
            colors = ReflectionUtils.getIntArrayFieldQuiet(gradientColor, "mGradientColors");
        }
        if (colors == null || colors.length < 2) {
            colors = ReflectionUtils.getIntArrayFieldQuiet(gradientColor, "mColors");
        }
        if (colors == null || colors.length < 2) {
            Integer startColor = ReflectionUtils.getIntFieldQuiet(gradientColor, "mStartColor");
            Integer centerColor = ReflectionUtils.getIntFieldQuiet(gradientColor, "mCenterColor");
            Integer endColor = ReflectionUtils.getIntFieldQuiet(gradientColor, "mEndColor");
            if (startColor != null && endColor != null) {
                Boolean hasCenterColor = ReflectionUtils.getBooleanFieldQuiet(gradientColor, "mHasCenterColor");
                if (Boolean.TRUE.equals(hasCenterColor) && centerColor != null) {
                    colors = new int[] { startColor.intValue(), centerColor.intValue(), endColor.intValue() };
                } else {
                    colors = new int[] { startColor.intValue(), endColor.intValue() };
                }
            }
        }
        if (colors == null || colors.length < 2 || !GradientJsonSupport.isMeaningfulGradientPalette(colors)) {
            return null;
        }

        float[] positions = ReflectionUtils.getFloatArrayFieldQuiet(gradientColor, "mItemOffsets");
        if (positions == null || positions.length != colors.length) {
            positions = ReflectionUtils.getFloatArrayFieldQuiet(gradientColor, "mPositions");
        }

        int gradientType = 0;
        Integer gradientTypeValue = ReflectionUtils.getIntFieldQuiet(gradientColor, "mGradientType");
        if (gradientTypeValue != null) {
            gradientType = gradientTypeValue.intValue();
        }

        if (gradientType == 2) {
            return null;
        }

        if (gradientType == 1) {
            float centerX = ReflectionUtils.getFloatFieldQuiet(gradientColor, "mCenterX", 0f);
            float centerY = ReflectionUtils.getFloatFieldQuiet(gradientColor, "mCenterY", 0f);
            float radius = ReflectionUtils.getFloatFieldQuiet(gradientColor, "mGradientRadius", 0f);
            if (radius <= 0f) {
                return null;
            }
            StringBuilder builder = new StringBuilder();
            builder.append("{\"type\":\"radial\"");
            GradientJsonSupport.appendColorsAndPositions(builder, colors, positions);
            builder.append(",\"centerX\":")
                .append(JsonUtils.formatNumber(centerX))
                .append(",\"centerY\":")
                .append(JsonUtils.formatNumber(centerY))
                .append(",\"radius\":")
                .append(JsonUtils.formatNumber(radius))
                .append("}");
            return builder.toString();
        }

        float x1 = ReflectionUtils.getFloatFieldQuiet(gradientColor, "mStartX", 0f);
        float y1 = ReflectionUtils.getFloatFieldQuiet(gradientColor, "mStartY", 0f);
        float x2 = ReflectionUtils.getFloatFieldQuiet(gradientColor, "mEndX", 0f);
        float y2 = ReflectionUtils.getFloatFieldQuiet(gradientColor, "mEndY", 0f);

        StringBuilder builder = new StringBuilder();
        builder.append("{\"type\":\"linear\"");
        GradientJsonSupport.appendColorsAndPositions(builder, colors, positions);
        builder.append(",\"x1\":")
            .append(JsonUtils.formatNumber(x1))
            .append(",\"y1\":")
            .append(JsonUtils.formatNumber(y1))
            .append(",\"x2\":")
            .append(JsonUtils.formatNumber(x2))
            .append(",\"y2\":")
            .append(JsonUtils.formatNumber(y2))
            .append("}");
        return builder.toString();
    }
}
