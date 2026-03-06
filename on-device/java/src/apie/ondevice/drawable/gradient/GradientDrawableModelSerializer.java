package apie.ondevice.drawable.gradient;

import apie.ondevice.drawable.gradient.json.GradientDrawableFillJson;
import apie.ondevice.drawable.gradient.state.GradientDrawableStateReader;
import apie.ondevice.support.IconExtractorSupport;
import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

import android.graphics.Rect;
import android.graphics.drawable.GradientDrawable;

public final class GradientDrawableModelSerializer {
    private GradientDrawableModelSerializer() {
    }

    public static String gradientDrawableToModelJson(GradientDrawable drawable) throws Throwable {
        Object gradientState = ReflectionUtils.getOptionalFieldValue(drawable, "mGradientState");
        Rect bounds = drawable.getBounds();
        if (bounds == null || bounds.isEmpty()) {
            bounds = new Rect(0, 0, IconExtractorSupport.ICON_SIZE, IconExtractorSupport.ICON_SIZE);
        }

        int shape = GradientDrawableStateReader.readGradientShape(drawable, gradientState);
        if (shape == GradientDrawable.LINE || shape == GradientDrawable.RING) {
            throw new UnsupportedOperationException("Unsupported GradientDrawable shape: " + shape);
        }
        String shapeName = shape == GradientDrawable.OVAL ? "oval" : "rect";

        int[] colors = GradientDrawableStateReader.readGradientColors(drawable, gradientState);
        float[] positions = GradientDrawableStateReader.readGradientPositions(gradientState);
        String solidColor = GradientJsonSerializer.resolveColor(gradientState, "mSolidColors", "mSolidColor");
        String gradientJson = colors != null && colors.length >= 2
            ? GradientDrawableFillJson.buildGradientJson(drawable, gradientState, colors, positions, bounds)
            : null;

        if (gradientJson == null && solidColor == null) {
            throw new IllegalStateException("GradientDrawable has no resolvable fill data");
        }

        float cornerRadius = ReflectionUtils.getFloatField(gradientState, "mRadius", 0f);
        float[] cornerRadii = ReflectionUtils.getFloatArrayField(gradientState, "mRadiusArray");
        String strokeColor = GradientJsonSerializer.resolveColor(
            gradientState,
            "mStrokeColors",
            "mStrokeColorStateList",
            "mStrokeColor"
        );
        int strokeWidth = ReflectionUtils.getIntField(gradientState, "mStrokeWidth", 0);

        StringBuilder builder = new StringBuilder();
        builder.append("{\"kind\":\"gradient-shape\",\"shape\":\"")
            .append(shapeName)
            .append("\",\"x\":")
            .append(bounds.left)
            .append(",\"y\":")
            .append(bounds.top)
            .append(",\"width\":")
            .append(Math.max(0, bounds.width()))
            .append(",\"height\":")
            .append(Math.max(0, bounds.height()));

        if (gradientJson != null) {
            builder.append(",\"gradient\":").append(gradientJson);
        } else {
            builder.append(",\"fillColor\":\"").append(solidColor).append("\"");
        }

        if (shape == GradientDrawable.RECTANGLE) {
            if (GradientDrawableFillJson.hasVisibleRadii(cornerRadii)) {
                builder.append(",\"cornerRadii\":");
                JsonUtils.appendFloatArrayJson(builder, cornerRadii);
            } else if (cornerRadius > 0f) {
                builder.append(",\"cornerRadius\":").append(JsonUtils.formatNumber(cornerRadius));
            }
        }

        if (strokeColor != null && strokeWidth > 0) {
            builder.append(",\"strokeColor\":\"")
                .append(strokeColor)
                .append("\",\"strokeWidth\":")
                .append(strokeWidth);
        }

        builder.append("}");
        return builder.toString();
    }
}
