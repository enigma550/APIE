package apie.ondevice.support.reflection;

import java.lang.reflect.Method;

public final class ReflectionInvoker {
    private ReflectionInvoker() {
    }

    public static Integer tryInvokeIntNoArg(Object target, String methodName) {
        if (target == null) {
            return null;
        }
        try {
            Method method = findNoArgMethod(target.getClass(), methodName);
            if (method == null) {
                return null;
            }
            method.setAccessible(true);
            Object value = method.invoke(target);
            if (value instanceof Number) {
                return Integer.valueOf(((Number) value).intValue());
            }
        } catch (Throwable ignored) {
        }
        return null;
    }

    public static Float tryInvokeFloatNoArg(Object target, String methodName) {
        if (target == null) {
            return null;
        }
        try {
            Method method = findNoArgMethod(target.getClass(), methodName);
            if (method == null) {
                return null;
            }
            method.setAccessible(true);
            Object value = method.invoke(target);
            if (value instanceof Number) {
                return Float.valueOf(((Number) value).floatValue());
            }
        } catch (Throwable ignored) {
        }
        return null;
    }

    public static Object tryInvokeObjectNoArg(Object target, String methodName) {
        if (target == null) {
            return null;
        }
        try {
            Method method = findNoArgMethod(target.getClass(), methodName);
            if (method == null) {
                return null;
            }
            method.setAccessible(true);
            return method.invoke(target);
        } catch (Throwable error) {
            if (error instanceof UnsupportedOperationException) {
                throw (UnsupportedOperationException) error;
            }
            return null;
        }
    }

    public static Method findNoArgMethod(Class<?> type, String methodName) {
        Class<?> current = type;
        while (current != null) {
            try {
                return current.getDeclaredMethod(methodName);
            } catch (NoSuchMethodException ignored) {
                current = current.getSuperclass();
            }
        }
        return null;
    }
}
