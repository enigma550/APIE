package apie.ondevice.support;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.List;

public final class ReflectionDebugJson {
    private ReflectionDebugJson() {
    }

    public static String fieldSummariesToJson(Object target) {
        StringBuilder builder = new StringBuilder();
        builder.append('[');
        boolean first = true;

        Class<?> current = target.getClass();
        while (current != null) {
            Field[] fields = current.getDeclaredFields();
            for (Field field : fields) {
                if ((field.getModifiers() & Modifier.STATIC) != 0) {
                    continue;
                }

                field.setAccessible(true);
                String summary;
                try {
                    Object value = field.get(target);
                    summary = summarizeFieldValue(value);
                } catch (Throwable error) {
                    summary = "error:" + error.getClass().getSimpleName();
                }

                if (!first) {
                    builder.append(',');
                }
                first = false;
                builder.append("{\"owner\":\"")
                    .append(JsonUtils.jsonEscape(current.getName()))
                    .append("\",\"name\":\"")
                    .append(JsonUtils.jsonEscape(field.getName()))
                    .append("\",\"type\":\"")
                    .append(JsonUtils.jsonEscape(field.getType().getName()))
                    .append("\",\"summary\":\"")
                    .append(JsonUtils.jsonEscape(summary))
                    .append("\"}");
            }
            current = current.getSuperclass();
        }

        builder.append(']');
        return builder.toString();
    }

    public static String methodSummariesToJson(Class<?> type) {
        return methodSummariesToJson(type, false);
    }

    public static String staticMethodSummariesToJson(Class<?> type) {
        return methodSummariesToJson(type, true);
    }

    private static String methodSummariesToJson(Class<?> type, boolean staticOnly) {
        StringBuilder builder = new StringBuilder();
        builder.append('[');
        boolean first = true;

        Class<?> current = type;
        while (current != null) {
            Method[] methods = current.getDeclaredMethods();
            for (Method method : methods) {
                boolean isStatic = (method.getModifiers() & Modifier.STATIC) != 0;
                if (staticOnly != isStatic) {
                    continue;
                }

                if (!first) {
                    builder.append(',');
                }
                first = false;
                builder.append("{\"owner\":\"")
                    .append(JsonUtils.jsonEscape(current.getName()))
                    .append("\",\"name\":\"")
                    .append(JsonUtils.jsonEscape(method.getName()))
                    .append("\",\"returns\":\"")
                    .append(JsonUtils.jsonEscape(method.getReturnType().getName()))
                    .append("\",\"argCount\":")
                    .append(method.getParameterCount())
                    .append(",\"argTypes\":")
                    .append(parameterTypesToJson(method))
                    .append("}");
            }
            current = current.getSuperclass();
        }

        builder.append(']');
        return builder.toString();
    }

    private static String summarizeFieldValue(Object value) {
        if (value == null) {
            return "null";
        }

        Class<?> valueClass = value.getClass();
        if (value instanceof Number || value instanceof Boolean || value instanceof Character) {
            return String.valueOf(value);
        }
        if (value instanceof String) {
            String text = (String) value;
            if (text.length() > 40) {
                return text.substring(0, 40) + "...";
            }
            return text;
        }
        if (value instanceof List) {
            List<?> list = (List<?>) value;
            String firstType = list.isEmpty() || list.get(0) == null ? "null" : list.get(0).getClass().getName();
            return "list:size=" + list.size() + ",first=" + firstType;
        }
        if (valueClass.isArray()) {
            return "array:length=" + java.lang.reflect.Array.getLength(value);
        }
        return valueClass.getName();
    }

    private static String parameterTypesToJson(Method method) {
        Class<?>[] parameterTypes = method.getParameterTypes();
        StringBuilder builder = new StringBuilder();
        builder.append('[');
        for (int index = 0; index < parameterTypes.length; index++) {
            if (index > 0) {
                builder.append(',');
            }
            builder.append('"')
                .append(JsonUtils.jsonEscape(parameterTypes[index].getName()))
                .append('"');
        }
        builder.append(']');
        return builder.toString();
    }
}
