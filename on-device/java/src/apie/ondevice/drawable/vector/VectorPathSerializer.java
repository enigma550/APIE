package apie.ondevice.drawable.vector;

import apie.ondevice.drawable.vector.path.PathModelUtils;
import apie.ondevice.drawable.vector.path.json.VectorPathDataJson;
import apie.ondevice.drawable.vector.path.style.VectorPaintJson;
import apie.ondevice.drawable.vector.path.style.VectorPaintJson.PaintAppendResult;
import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

public final class VectorPathSerializer {
    private VectorPathSerializer() {
    }

    public static String vectorFullPathToJson(Object path, boolean debugVectorMode) throws Throwable {
        float trimPathStart = ReflectionUtils.getFloatFieldOrMethod(path, "mTrimPathStart", 0f, "getTrimPathStart");
        float trimPathEnd = ReflectionUtils.getFloatFieldOrMethod(path, "mTrimPathEnd", 1f, "getTrimPathEnd");
        float trimPathOffset = ReflectionUtils.getFloatFieldOrMethod(path, "mTrimPathOffset", 0f, "getTrimPathOffset");
        String pathData = VectorPathDataJson.resolveFullPathData(path, trimPathStart, trimPathEnd, trimPathOffset);

        StringBuilder builder = new StringBuilder();
        builder.append("{\"kind\":\"path\",\"pathData\":\"")
            .append(JsonUtils.jsonEscape(pathData))
            .append("\"");

        PaintAppendResult paintResult = VectorPaintJson.appendPaintJson(builder, path);

        int fillRule = ReflectionUtils.getIntFieldOrMethod(path, "mFillRule", 0, "getFillType");
        builder.append(",\"fillRule\":").append(fillRule);
        builder.append(",\"trimPathStart\":").append(JsonUtils.formatNumber(trimPathStart));
        builder.append(",\"trimPathEnd\":").append(JsonUtils.formatNumber(trimPathEnd));
        builder.append(",\"trimPathOffset\":").append(JsonUtils.formatNumber(trimPathOffset));
        if (paintResult.paintFromMethod) {
            builder.append(",\"paintFromMethod\":true");
        }
        if (debugVectorMode) {
            builder.append(",\"debug\":{")
                .append("\"class\":\"").append(JsonUtils.jsonEscape(path.getClass().getName())).append("\"")
                .append(",\"fields\":").append(ReflectionUtils.fieldSummariesToJson(path))
                .append(",\"methods\":").append(ReflectionUtils.methodSummariesToJson(path.getClass()))
                .append(",\"propertyDataHex\":\"")
                .append(JsonUtils.jsonEscape(PathModelUtils.readPathPropertyDataHex(path)))
                .append("\"}");
        }
        builder.append('}');
        return builder.toString();
    }

    public static String vectorClipPathToJson(Object path, boolean debugVectorMode) throws Throwable {
        return VectorPathDataJson.buildClipPathJson(path, debugVectorMode);
    }
}
