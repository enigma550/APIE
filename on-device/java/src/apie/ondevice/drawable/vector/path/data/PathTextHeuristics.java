package apie.ondevice.drawable.vector.path.data;

public final class PathTextHeuristics {
    private PathTextHeuristics() {
    }

    public static String tryExtractPathDataFromToString(Object pathData) {
        if (pathData == null) {
            return null;
        }

        String value = String.valueOf(pathData).trim();
        if (value.isEmpty()) {
            return null;
        }
        if (value.contains("@") && value.indexOf(' ') < 0) {
            return null;
        }

        boolean hasCommand = false;
        boolean hasNumeric = false;
        for (int index = 0; index < value.length(); index++) {
            char ch = value.charAt(index);
            if ((ch >= '0' && ch <= '9') || ch == '-' || ch == '.') {
                hasNumeric = true;
                continue;
            }
            if ("MmZzLlHhVvCcSsQqTtAa".indexOf(ch) >= 0) {
                hasCommand = true;
            }
        }

        if (!hasCommand || !hasNumeric) {
            return null;
        }
        return value;
    }
}
