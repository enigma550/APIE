package apie.ondevice.drawable.vector;

import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

import java.util.List;

public final class VectorTreeSerializer {
    private VectorTreeSerializer() {
    }

    public static String vectorChildrenToJson(Object group, boolean debugVectorMode) throws Throwable {
        Object rawChildren = ReflectionUtils.getFieldValue(group, "mChildren");
        if (!(rawChildren instanceof List)) {
            return "[]";
        }

        List<?> children = (List<?>) rawChildren;
        StringBuilder builder = new StringBuilder();
        builder.append('[');

        boolean first = true;
        for (Object child : children) {
            String childJson = vectorChildToJson(child, debugVectorMode);
            if (childJson == null) {
                if (debugVectorMode) {
                    childJson = VectorDebugJson.vectorUnknownToJson(child);
                } else {
                    throw new UnsupportedOperationException(
                        "Unsupported vector child: " + child.getClass().getName()
                    );
                }
            }
            if (childJson == null) {
                throw new UnsupportedOperationException(
                    "Unsupported vector child after debug fallback: " + child.getClass().getName()
                );
            }

            if (!first) {
                builder.append(',');
            }
            first = false;
            builder.append(childJson);
        }

        builder.append(']');
        return builder.toString();
    }

    public static String vectorGroupToJson(Object group, boolean debugVectorMode) throws Throwable {
        float rotate = ReflectionUtils.getFloatFieldOrMethods(group, "mRotate", 0f, "getRotation", "getRotate");
        float pivotX = ReflectionUtils.getFloatFieldOrMethods(group, "mPivotX", 0f, "getPivotX");
        float pivotY = ReflectionUtils.getFloatFieldOrMethods(group, "mPivotY", 0f, "getPivotY");
        float scaleX = ReflectionUtils.getFloatFieldOrMethods(group, "mScaleX", 1f, "getScaleX");
        float scaleY = ReflectionUtils.getFloatFieldOrMethods(group, "mScaleY", 1f, "getScaleY");
        float translateX = ReflectionUtils.getFloatFieldOrMethods(group, "mTranslateX", 0f, "getTranslateX");
        float translateY = ReflectionUtils.getFloatFieldOrMethods(group, "mTranslateY", 0f, "getTranslateY");

        StringBuilder builder = new StringBuilder();
        builder.append("{\"kind\":\"group\",\"rotate\":")
            .append(JsonUtils.formatNumber(rotate))
            .append(",\"pivotX\":")
            .append(JsonUtils.formatNumber(pivotX))
            .append(",\"pivotY\":")
            .append(JsonUtils.formatNumber(pivotY))
            .append(",\"scaleX\":")
            .append(JsonUtils.formatNumber(scaleX))
            .append(",\"scaleY\":")
            .append(JsonUtils.formatNumber(scaleY))
            .append(",\"translateX\":")
            .append(JsonUtils.formatNumber(translateX))
            .append(",\"translateY\":")
            .append(JsonUtils.formatNumber(translateY))
            .append(",\"children\":")
            .append(vectorChildrenToJson(group, debugVectorMode));

        if (debugVectorMode) {
            builder.append(",\"debug\":{")
                .append("\"class\":\"").append(JsonUtils.jsonEscape(group.getClass().getName())).append("\"")
                .append(",\"fields\":").append(ReflectionUtils.fieldSummariesToJson(group))
                .append("}");
        }

        builder.append("}");
        return builder.toString();
    }

    private static String vectorChildToJson(Object child, boolean debugVectorMode) throws Throwable {
        if (child == null) {
            return null;
        }

        String className = child.getClass().getName();

        if (ReflectionUtils.findField(child.getClass(), "mPathData") != null) {
            if (className.endsWith("VFullPath")) {
                return VectorPathSerializer.vectorFullPathToJson(child, debugVectorMode);
            }
            if (className.endsWith("VClipPath")) {
                return VectorPathSerializer.vectorClipPathToJson(child, debugVectorMode);
            }

            if (ReflectionUtils.findField(child.getClass(), "mFillColors") != null
                || ReflectionUtils.findField(child.getClass(), "mFillColor") != null
                || ReflectionUtils.findField(child.getClass(), "mStrokeColors") != null
                || ReflectionUtils.findField(child.getClass(), "mStrokeColor") != null
                || ReflectionUtils.findNoArgMethod(child.getClass(), "getFillColor") != null
                || ReflectionUtils.findNoArgMethod(child.getClass(), "getStrokeColor") != null) {
                return VectorPathSerializer.vectorFullPathToJson(child, debugVectorMode);
            }
            return VectorPathSerializer.vectorClipPathToJson(child, debugVectorMode);
        }

        if (ReflectionUtils.findField(child.getClass(), "mChildren") != null) {
            return vectorGroupToJson(child, debugVectorMode);
        }

        if (className.endsWith("VFullPath")) {
            return VectorPathSerializer.vectorFullPathToJson(child, debugVectorMode);
        }
        if (className.endsWith("VClipPath")) {
            return VectorPathSerializer.vectorClipPathToJson(child, debugVectorMode);
        }
        return null;
    }
}
