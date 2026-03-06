package apie.ondevice.support.reflection;

import java.lang.reflect.Field;

public final class ReflectionFieldAccess {
    private ReflectionFieldAccess() {
    }

    public static Object getOptionalFieldValue(Object target, String fieldName) throws Throwable {
        if (target == null) {
            return null;
        }

        Field field = findField(target.getClass(), fieldName);
        if (field == null) {
            return null;
        }

        field.setAccessible(true);
        return field.get(target);
    }

    public static Object getFieldValue(Object target, String fieldName) throws Throwable {
        Field field = findField(target.getClass(), fieldName);
        if (field == null) {
            throw new NoSuchFieldException(fieldName);
        }

        field.setAccessible(true);
        return field.get(target);
    }

    public static Field findField(Class<?> type, String fieldName) {
        Class<?> current = type;
        while (current != null) {
            try {
                return current.getDeclaredField(fieldName);
            } catch (NoSuchFieldException ignored) {
                current = current.getSuperclass();
            }
        }
        return null;
    }

    public static int getStaticIntField(Class<?> type, String fieldName, int fallback) {
        try {
            Field field = type.getDeclaredField(fieldName);
            field.setAccessible(true);
            Object value = field.get(null);
            if (value instanceof Number) {
                return ((Number) value).intValue();
            }
        } catch (Throwable ignored) {
        }
        return fallback;
    }
}
