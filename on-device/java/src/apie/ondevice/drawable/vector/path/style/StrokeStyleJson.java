package apie.ondevice.drawable.vector.path.style;

import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

public final class StrokeStyleJson {
    private StrokeStyleJson() {
    }

    public static void appendStrokeStyle(StringBuilder builder, Object path, String strokeGradient, String strokeColor)
        throws Throwable {
        if (strokeGradient == null && strokeColor == null) {
            return;
        }

        String strokeLineCap = resolveStrokeLineCap(path);
        if (strokeLineCap != null) {
            builder.append(",\"strokeLineCap\":\"").append(strokeLineCap).append("\"");
        }

        String strokeLineJoin = resolveStrokeLineJoin(path);
        if (strokeLineJoin != null) {
            builder.append(",\"strokeLineJoin\":\"").append(strokeLineJoin).append("\"");
        }

        float strokeMiterLimit = ReflectionUtils.getFloatFieldOrMethods(
            path,
            "mStrokeMiterlimit",
            4f,
            "getStrokeMiterlimit",
            "getStrokeMiterLimit"
        );
        builder.append(",\"strokeMiterLimit\":").append(JsonUtils.formatNumber(strokeMiterLimit));
    }

    private static String resolveStrokeLineCap(Object path) throws Throwable {
        Object value = ReflectionUtils.getOptionalFieldValue(path, "mStrokeLineCap");
        if (value == null) {
            value = ReflectionUtils.tryInvokeObjectNoArg(path, "getStrokeLineCap");
        }
        return mapStrokeLineCap(value);
    }

    private static String resolveStrokeLineJoin(Object path) throws Throwable {
        Object value = ReflectionUtils.getOptionalFieldValue(path, "mStrokeLineJoin");
        if (value == null) {
            value = ReflectionUtils.tryInvokeObjectNoArg(path, "getStrokeLineJoin");
        }
        return mapStrokeLineJoin(value);
    }

    private static String mapStrokeLineCap(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number) {
            int numeric = ((Number) value).intValue();
            if (numeric == 0) {
                return "butt";
            }
            if (numeric == 1) {
                return "round";
            }
            if (numeric == 2) {
                return "square";
            }
        }

        String raw = value.toString().toLowerCase(java.util.Locale.US);
        if (raw.contains("butt")) {
            return "butt";
        }
        if (raw.contains("round")) {
            return "round";
        }
        if (raw.contains("square")) {
            return "square";
        }
        return null;
    }

    private static String mapStrokeLineJoin(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number) {
            int numeric = ((Number) value).intValue();
            if (numeric == 0) {
                return "miter";
            }
            if (numeric == 1) {
                return "round";
            }
            if (numeric == 2) {
                return "bevel";
            }
        }

        String raw = value.toString().toLowerCase(java.util.Locale.US);
        if (raw.contains("miter")) {
            return "miter";
        }
        if (raw.contains("round")) {
            return "round";
        }
        if (raw.contains("bevel")) {
            return "bevel";
        }
        return null;
    }
}
