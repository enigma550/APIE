package apie.ondevice.drawable.vector;

import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

import android.graphics.Path;

public final class VectorDebugJson {
    private VectorDebugJson() {
    }

    public static String appendVectorDebug(StringBuilder builder, Object pathRenderer, Object rootGroup) {
        builder.append(",\"debug\":{")
            .append("\"rendererClass\":\"").append(JsonUtils.jsonEscape(pathRenderer.getClass().getName())).append("\"")
            .append(",\"rootClass\":\"").append(JsonUtils.jsonEscape(rootGroup.getClass().getName())).append("\"")
            .append(",\"rendererFields\":").append(ReflectionUtils.fieldSummariesToJson(pathRenderer))
            .append(",\"rootFields\":").append(ReflectionUtils.fieldSummariesToJson(rootGroup));
        try {
            Class<?> pathParserClass = Class.forName("android.util.PathParser");
            builder.append(",\"pathParserStaticMethods\":")
                .append(ReflectionUtils.staticMethodSummariesToJson(pathParserClass));
        } catch (Throwable ignored) {
        }
        try {
            Class<?> pathParserClass = Class.forName("android.graphics.PathParser");
            builder.append(",\"graphicsPathParserStaticMethods\":")
                .append(ReflectionUtils.staticMethodSummariesToJson(pathParserClass));
        } catch (Throwable ignored) {
        }
        builder.append(",\"pathInstanceMethods\":")
            .append(ReflectionUtils.methodSummariesToJson(Path.class));
        try {
            Class<?> iteratorClass = Class.forName("android.graphics.PathIterator");
            builder.append(",\"pathIteratorMethods\":")
                .append(ReflectionUtils.methodSummariesToJson(iteratorClass));
        } catch (Throwable ignored) {
        }
        builder.append("}");
        return builder.toString();
    }

    public static String vectorUnknownToJson(Object child) {
        if (child == null) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        builder.append("{\"kind\":\"unknown\",\"class\":\"")
            .append(JsonUtils.jsonEscape(child.getClass().getName()))
            .append("\",\"fields\":")
            .append(ReflectionUtils.fieldSummariesToJson(child))
            .append(",\"methods\":")
            .append(ReflectionUtils.methodSummariesToJson(child.getClass()));

        try {
            Object pathData = ReflectionUtils.getOptionalFieldValue(child, "mPathData");
            if (pathData != null) {
                builder.append(",\"pathDataClass\":\"")
                    .append(JsonUtils.jsonEscape(pathData.getClass().getName()))
                    .append("\",\"pathDataFields\":")
                    .append(ReflectionUtils.fieldSummariesToJson(pathData))
                    .append(",\"pathDataMethods\":")
                    .append(ReflectionUtils.methodSummariesToJson(pathData.getClass()));
            }
        } catch (Throwable ignored) {
        }

        builder.append("}");
        return builder.toString();
    }
}
