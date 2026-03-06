package apie.ondevice.support.reflection;

public final class ReflectionNumberReaders {
    private ReflectionNumberReaders() {
    }

    public static float[] getFloatArrayField(Object target, String fieldName) throws Throwable {
        Object value = ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
        if (value instanceof float[]) {
            return (float[]) value;
        }
        return null;
    }

    public static float getFloatField(Object target, String fieldName, float fallback) throws Throwable {
        Object value = ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
        if (value instanceof Number) {
            return ((Number) value).floatValue();
        }
        return fallback;
    }

    public static float getFloatFieldOrMethod(Object target, String fieldName, float fallback, String methodName)
        throws Throwable {
        Object value = ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
        if (value instanceof Number) {
            return ((Number) value).floatValue();
        }

        Float methodValue = ReflectionInvoker.tryInvokeFloatNoArg(target, methodName);
        if (methodValue != null) {
            return methodValue.floatValue();
        }

        return fallback;
    }

    public static float getFloatFieldOrMethods(Object target, String fieldName, float fallback, String... methodNames)
        throws Throwable {
        Object value = ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
        if (value instanceof Number) {
            return ((Number) value).floatValue();
        }

        if (methodNames != null) {
            for (String methodName : methodNames) {
                Float methodValue = ReflectionInvoker.tryInvokeFloatNoArg(target, methodName);
                if (methodValue != null) {
                    return methodValue.floatValue();
                }
            }
        }

        return fallback;
    }

    public static int getIntField(Object target, String fieldName, int fallback) throws Throwable {
        Object value = ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return fallback;
    }

    public static int getIntFieldOrMethod(Object target, String fieldName, int fallback, String... methodNames)
        throws Throwable {
        Object value = ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }

        if (methodNames != null) {
            for (String methodName : methodNames) {
                Integer methodValue = ReflectionInvoker.tryInvokeIntNoArg(target, methodName);
                if (methodValue != null) {
                    return methodValue.intValue();
                }
            }
        }

        return fallback;
    }

    public static int[] getIntArrayFieldQuiet(Object target, String fieldName) {
        try {
            Object value = ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
            if (value instanceof int[]) {
                return (int[]) value;
            }
        } catch (Throwable ignored) {
        }
        return null;
    }

    public static float[] getFloatArrayFieldQuiet(Object target, String fieldName) {
        try {
            Object value = ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
            if (value instanceof float[]) {
                return (float[]) value;
            }
        } catch (Throwable ignored) {
        }
        return null;
    }

    public static Integer getIntFieldQuiet(Object target, String fieldName) {
        try {
            Object value = ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
            if (value instanceof Number) {
                return Integer.valueOf(((Number) value).intValue());
            }
        } catch (Throwable ignored) {
        }
        return null;
    }

    public static Boolean getBooleanFieldQuiet(Object target, String fieldName) {
        try {
            Object value = ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
            if (value instanceof Boolean) {
                return (Boolean) value;
            }
        } catch (Throwable ignored) {
        }
        return null;
    }

    public static float getFloatFieldQuiet(Object target, String fieldName, float fallback) {
        try {
            Object value = ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
            if (value instanceof Number) {
                return ((Number) value).floatValue();
            }
        } catch (Throwable ignored) {
        }
        return fallback;
    }
}
