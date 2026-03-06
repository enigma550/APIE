package apie.ondevice.drawable.gradient.json;

import apie.ondevice.drawable.gradient.state.GradientDrawableStateReader;
import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

import android.graphics.Rect;
import android.graphics.drawable.GradientDrawable;

public final class GradientDrawableFillJson {
    private GradientDrawableFillJson() {
    }

    public static String buildGradientJson(
        GradientDrawable drawable,
        Object gradientState,
        int[] colors,
        float[] positions,
        Rect bounds
    ) throws Throwable {
        int gradientType = GradientDrawableStateReader.readGradientType(drawable, gradientState);
        if (gradientType == GradientDrawable.SWEEP_GRADIENT) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        if (gradientType == GradientDrawable.RADIAL_GRADIENT) {
            float centerX = ReflectionUtils.getFloatField(gradientState, "mCenterX", 0.5f);
            float centerY = ReflectionUtils.getFloatField(gradientState, "mCenterY", 0.5f);
            Float methodRadius = ReflectionUtils.tryInvokeFloatNoArg(drawable, "getGradientRadius");
            float radius = methodRadius != null
                ? methodRadius.floatValue()
                : ReflectionUtils.getFloatField(gradientState, "mGradientRadius", 0f);
            if (radius <= 0f) {
                radius = 0.5f;
            }

            builder.append("{\"type\":\"radial\"");
            appendColorsAndPositions(builder, colors, positions);
            builder.append(",\"centerX\":")
                .append(JsonUtils.formatNumber(centerX))
                .append(",\"centerY\":")
                .append(JsonUtils.formatNumber(centerY))
                .append(",\"radius\":")
                .append(JsonUtils.formatNumber(radius))
                .append("}");
            return builder.toString();
        }

        float[] coords = resolveLinearGradientCoords(gradientState);
        builder.append("{\"type\":\"linear\"");
        appendColorsAndPositions(builder, colors, positions);
        builder.append(",\"x1\":")
            .append(JsonUtils.formatNumber(coords[0]))
            .append(",\"y1\":")
            .append(JsonUtils.formatNumber(coords[1]))
            .append(",\"x2\":")
            .append(JsonUtils.formatNumber(coords[2]))
            .append(",\"y2\":")
            .append(JsonUtils.formatNumber(coords[3]))
            .append("}");
        return builder.toString();
    }

    public static boolean hasVisibleRadii(float[] radii) {
        if (radii == null || radii.length == 0) {
            return false;
        }
        for (float radius : radii) {
            if (radius > 0f) {
                return true;
            }
        }
        return false;
    }

    private static void appendColorsAndPositions(StringBuilder builder, int[] colors, float[] positions) {
        builder.append(",\"colors\":");
        JsonUtils.appendColorArrayJson(builder, colors);

        if (positions != null && positions.length == colors.length) {
            builder.append(",\"positions\":");
            JsonUtils.appendFloatArrayJson(builder, positions);
        }
    }

    private static float[] resolveLinearGradientCoords(Object gradientState) throws Throwable {
        Object orientation = ReflectionUtils.getOptionalFieldValue(gradientState, "mOrientation");
        String orientationName = orientation != null ? orientation.toString() : "LEFT_RIGHT";
        if ("TOP_BOTTOM".equals(orientationName)) {
            return new float[] { 0.5f, 0f, 0.5f, 1f };
        }
        if ("TR_BL".equals(orientationName)) {
            return new float[] { 1f, 0f, 0f, 1f };
        }
        if ("RIGHT_LEFT".equals(orientationName)) {
            return new float[] { 1f, 0.5f, 0f, 0.5f };
        }
        if ("BR_TL".equals(orientationName)) {
            return new float[] { 1f, 1f, 0f, 0f };
        }
        if ("BOTTOM_TOP".equals(orientationName)) {
            return new float[] { 0.5f, 1f, 0.5f, 0f };
        }
        if ("BL_TR".equals(orientationName)) {
            return new float[] { 0f, 1f, 1f, 0f };
        }
        if ("TL_BR".equals(orientationName)) {
            return new float[] { 0f, 0f, 1f, 1f };
        }
        return new float[] { 0f, 0.5f, 1f, 0.5f };
    }
}
