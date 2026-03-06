package apie.ondevice.drawable.vector.path.data;

import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

public final class PathNodeStringifier {
    private PathNodeStringifier() {
    }

    public static String pathNodesToString(Object[] nodes) throws Throwable {
        StringBuilder builder = new StringBuilder();

        for (Object node : nodes) {
            if (node == null) {
                continue;
            }

            Object typeValue = ReflectionUtils.getOptionalFieldValue(node, "mType");
            if (!(typeValue instanceof Character)) {
                typeValue = ReflectionUtils.getOptionalFieldValue(node, "type");
            }
            if (!(typeValue instanceof Character) && !(typeValue instanceof Number)) {
                continue;
            }

            char type = typeValue instanceof Character
                ? ((Character) typeValue).charValue()
                : (char) ((Number) typeValue).intValue();
            builder.append(type);

            Object paramsValue = ReflectionUtils.getOptionalFieldValue(node, "mParams");
            if (!(paramsValue instanceof float[])) {
                paramsValue = ReflectionUtils.getOptionalFieldValue(node, "params");
            }
            if (paramsValue instanceof float[]) {
                appendFloatArray(builder, (float[]) paramsValue);
            } else if (paramsValue instanceof double[]) {
                for (double param : (double[]) paramsValue) {
                    appendNumericValue(builder, (float) param);
                }
            } else if (paramsValue instanceof int[]) {
                for (int param : (int[]) paramsValue) {
                    appendNumericValue(builder, (float) param);
                }
            } else if (paramsValue != null && paramsValue.getClass().isArray()) {
                int length = java.lang.reflect.Array.getLength(paramsValue);
                for (int index = 0; index < length; index++) {
                    Object item = java.lang.reflect.Array.get(paramsValue, index);
                    if (item instanceof Number) {
                        appendNumericValue(builder, ((Number) item).floatValue());
                    }
                }
            }
        }

        return builder.toString().trim();
    }

    private static void appendFloatArray(StringBuilder builder, float[] values) {
        for (float value : values) {
            appendNumericValue(builder, value);
        }
    }

    private static void appendNumericValue(StringBuilder builder, float value) {
        builder.append(' ');
        builder.append(JsonUtils.formatNumber(value));
    }
}
