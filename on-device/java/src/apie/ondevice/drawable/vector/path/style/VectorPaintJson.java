package apie.ondevice.drawable.vector.path.style;

import apie.ondevice.drawable.gradient.GradientJsonSerializer;
import apie.ondevice.drawable.gradient.paint.PaintResolution;
import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

public final class VectorPaintJson {
    public static final class PaintAppendResult {
        public boolean paintFromMethod;
        public String fillGradient;
        public String fillColor;
        public String strokeGradient;
        public String strokeColor;
    }

    private VectorPaintJson() {
    }

    public static PaintAppendResult appendPaintJson(StringBuilder builder, Object path) throws Throwable {
        PaintAppendResult result = new PaintAppendResult();
        appendFillData(builder, path, result);
        appendStrokeData(builder, path, result);
        return result;
    }

    private static void appendFillData(StringBuilder builder, Object path, PaintAppendResult result) throws Throwable {
        PaintResolution fillPaint = GradientJsonSerializer.resolvePathPaint(
            path,
            new String[] { "mFillColors", "mFillColor" },
            "getFillColor"
        );
        result.fillGradient = fillPaint != null ? GradientJsonSerializer.resolveGradientFromPaintValue(fillPaint.value) : null;
        result.fillColor = fillPaint != null ? GradientJsonSerializer.resolveColorFromPaintValue(fillPaint.value) : null;
        if (fillPaint != null && fillPaint.fromMethod && (result.fillGradient != null || result.fillColor != null)) {
            result.paintFromMethod = true;
        }
        if (result.fillGradient != null) {
            builder.append(",\"fillGradient\":").append(result.fillGradient);
        } else if (result.fillColor != null) {
            float fillAlpha = ReflectionUtils.getFloatFieldOrMethod(path, "mFillAlpha", 1f, "getFillAlpha");
            builder.append(",\"fillColor\":\"").append(result.fillColor).append("\"");
            builder.append(",\"fillAlpha\":").append(JsonUtils.formatNumber(fillAlpha));
        }
    }

    private static void appendStrokeData(StringBuilder builder, Object path, PaintAppendResult result) throws Throwable {
        PaintResolution strokePaint = GradientJsonSerializer.resolvePathPaint(
            path,
            new String[] { "mStrokeColors", "mStrokeColor" },
            "getStrokeColor"
        );
        result.strokeGradient = strokePaint != null
            ? GradientJsonSerializer.resolveGradientFromPaintValue(strokePaint.value)
            : null;
        result.strokeColor = strokePaint != null
            ? GradientJsonSerializer.resolveColorFromPaintValue(strokePaint.value)
            : null;
        if (strokePaint != null && strokePaint.fromMethod && (result.strokeGradient != null || result.strokeColor != null)) {
            result.paintFromMethod = true;
        }
        if (result.strokeGradient != null) {
            float strokeAlpha = ReflectionUtils.getFloatFieldOrMethod(path, "mStrokeAlpha", 1f, "getStrokeAlpha");
            float strokeWidth = ReflectionUtils.getFloatFieldOrMethod(path, "mStrokeWidth", 0f, "getStrokeWidth");
            builder.append(",\"strokeGradient\":").append(result.strokeGradient);
            builder.append(",\"strokeAlpha\":").append(JsonUtils.formatNumber(strokeAlpha));
            builder.append(",\"strokeWidth\":").append(JsonUtils.formatNumber(strokeWidth));
        } else if (result.strokeColor != null) {
            float strokeAlpha = ReflectionUtils.getFloatFieldOrMethod(path, "mStrokeAlpha", 1f, "getStrokeAlpha");
            float strokeWidth = ReflectionUtils.getFloatFieldOrMethod(path, "mStrokeWidth", 0f, "getStrokeWidth");
            builder.append(",\"strokeColor\":\"").append(result.strokeColor).append("\"");
            builder.append(",\"strokeAlpha\":").append(JsonUtils.formatNumber(strokeAlpha));
            builder.append(",\"strokeWidth\":").append(JsonUtils.formatNumber(strokeWidth));
        }

        StrokeStyleJson.appendStrokeStyle(builder, path, result.strokeGradient, result.strokeColor);
    }
}
