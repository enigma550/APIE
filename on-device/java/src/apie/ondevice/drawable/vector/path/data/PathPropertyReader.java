package apie.ondevice.drawable.vector.path.data;

import apie.ondevice.support.ReflectionUtils;

public final class PathPropertyReader {
    private PathPropertyReader() {
    }

    public static String readPathPropertyDataHex(Object path) {
        try {
            Object value = ReflectionUtils.getOptionalFieldValue(path, "mPropertyData");
            if (!(value instanceof byte[])) {
                return "";
            }

            byte[] bytes = (byte[]) value;
            StringBuilder builder = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                int unsigned = b & 0xff;
                if (unsigned < 16) {
                    builder.append('0');
                }
                builder.append(Integer.toHexString(unsigned));
            }
            return builder.toString();
        } catch (Throwable ignored) {
            return "";
        }
    }

    public static Long readNativePathDataPtr(Object pathData) {
        if (pathData == null) {
            return null;
        }
        try {
            Object value = ReflectionUtils.tryInvokeObjectNoArg(pathData, "getNativePtr");
            if (value instanceof Number) {
                return Long.valueOf(((Number) value).longValue());
            }
        } catch (Throwable ignored) {
        }
        try {
            Object value = ReflectionUtils.getOptionalFieldValue(pathData, "mNativePathData");
            if (value instanceof Number) {
                return Long.valueOf(((Number) value).longValue());
            }
        } catch (Throwable ignored) {
        }
        return null;
    }
}
