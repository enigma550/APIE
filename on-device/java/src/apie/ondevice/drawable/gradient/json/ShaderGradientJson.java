package apie.ondevice.drawable.gradient.json;

import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

public final class ShaderGradientJson {
    private ShaderGradientJson() {
    }

    public static String shaderToGradientJson(Object shader) {
        if (shader == null) {
            return null;
        }

        String className = shader.getClass().getName();

        int[] colors = ReflectionUtils.getIntArrayFieldQuiet(shader, "mColors");
        float[] positions = ReflectionUtils.getFloatArrayFieldQuiet(shader, "mPositions");
        if (colors == null || colors.length < 2) {
            Integer color0 = ReflectionUtils.getIntFieldQuiet(shader, "mColor0");
            Integer color1 = ReflectionUtils.getIntFieldQuiet(shader, "mColor1");
            if (color0 != null && color1 != null) {
                colors = new int[] { color0.intValue(), color1.intValue() };
            }
        }
        if (colors == null || colors.length < 2) {
            return null;
        }
        if (!GradientJsonSupport.isMeaningfulGradientPalette(colors)) {
            return null;
        }

        if (className.contains("LinearGradient")) {
            float x1 = ReflectionUtils.getFloatFieldQuiet(shader, "mX0", 0f);
            float y1 = ReflectionUtils.getFloatFieldQuiet(shader, "mY0", 0f);
            float x2 = ReflectionUtils.getFloatFieldQuiet(shader, "mX1", 0f);
            float y2 = ReflectionUtils.getFloatFieldQuiet(shader, "mY1", 0f);
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

        if (className.contains("RadialGradient")) {
            float centerX = ReflectionUtils.getFloatFieldQuiet(shader, "mX", 0f);
            float centerY = ReflectionUtils.getFloatFieldQuiet(shader, "mY", 0f);
            float radius = ReflectionUtils.getFloatFieldQuiet(shader, "mRadius", 0f);
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

        return null;
    }
}
