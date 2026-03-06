package apie.ondevice.support;

public final class JsonUtils {
    private JsonUtils() {
    }

    public static String formatNumber(float value) {
        if (Float.isNaN(value) || Float.isInfinite(value)) {
            return "0";
        }

        if (Math.abs(value - Math.round(value)) < 0.0001f) {
            return String.valueOf(Math.round(value));
        }

        String valueString = String.valueOf(value);
        if (valueString.indexOf('E') >= 0 || valueString.indexOf('e') >= 0) {
            return String.format(java.util.Locale.US, "%.4f", value)
                .replaceAll("0+$", "")
                .replaceAll("\\.$", "");
        }
        return valueString;
    }

    public static String jsonEscape(String input) {
        return input
            .replace("\\", "\\\\")
            .replace("\"", "\\\"");
    }

    public static void appendColorArrayJson(StringBuilder builder, int[] colors) {
        builder.append('[');
        for (int index = 0; index < colors.length; index++) {
            if (index > 0) {
                builder.append(',');
            }
            builder.append('"')
                .append(String.format("#%08x", colors[index]))
                .append('"');
        }
        builder.append(']');
    }

    public static void appendFloatArrayJson(StringBuilder builder, float[] values) {
        builder.append('[');
        for (int index = 0; index < values.length; index++) {
            if (index > 0) {
                builder.append(',');
            }
            builder.append(formatNumber(values[index]));
        }
        builder.append(']');
    }
}
