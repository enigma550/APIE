package apie.ondevice.drawable.gradient.paint;

import apie.ondevice.support.IconExtractorSupport;
import apie.ondevice.support.ReflectionUtils;

public final class PaintValueResolver {
    private PaintValueResolver() {
    }

    public static String resolveColor(Object target, String... fieldNames) throws Throwable {
        if (target == null) {
            return null;
        }
        for (String fieldName : fieldNames) {
            java.lang.reflect.Field field = ReflectionUtils.findField(target.getClass(), fieldName);
            if (field == null) {
                continue;
            }

            field.setAccessible(true);
            Object value = field.get(target);
            if (value == null) {
                continue;
            }

            if (value instanceof Integer) {
                return String.format("#%08x", ((Integer) value).intValue());
            }
            if (value instanceof Number) {
                return String.format("#%08x", ((Number) value).intValue());
            }

            try {
                java.lang.reflect.Method getDefaultColor = value.getClass().getMethod("getDefaultColor");
                Object color = getDefaultColor.invoke(value);
                if (color instanceof Number) {
                    return String.format("#%08x", ((Number) color).intValue());
                }
            } catch (Throwable ignored) {
            }
        }

        return null;
    }

    public static PaintResolution resolvePathPaint(Object target, String[] fieldNames, String methodName) throws Throwable {
        PaintResolution methodResolution = resolvePaintValue(target, null, methodName);
        PaintResolution fieldResolution = resolvePaintValue(target, fieldNames, null);

        if (fieldResolution != null) {
            String fieldGradient = PaintGradientResolver.resolveGradientFromPaintValue(fieldResolution.value);
            if (fieldGradient != null) {
                return fieldResolution;
            }
        }

        if (methodResolution != null && resolveColorFromPaintValue(methodResolution.value) != null) {
            return methodResolution;
        }

        if (fieldResolution != null) {
            return fieldResolution;
        }
        return methodResolution;
    }

    public static String resolveColorFromPaintValue(Object value) {
        if (value == null) {
            return null;
        }
        if (PaintGradientResolver.isGradientColorValue(value)) {
            return null;
        }

        if (value instanceof Integer) {
            return String.format("#%08x", ((Integer) value).intValue());
        }
        if (value instanceof Number) {
            return String.format("#%08x", ((Number) value).intValue());
        }

        try {
            java.lang.reflect.Method getDefaultColor = value.getClass().getMethod("getDefaultColor");
            getDefaultColor.setAccessible(true);
            Object defaultColor = getDefaultColor.invoke(value);
            if (defaultColor instanceof Number) {
                int fallback = ((Number) defaultColor).intValue();
                try {
                    java.lang.reflect.Method getColorForState = value.getClass().getMethod(
                        "getColorForState",
                        int[].class,
                        int.class
                    );
                    getColorForState.setAccessible(true);
                    Object resolved = getColorForState.invoke(
                        value,
                        IconExtractorSupport.ENABLED_STATE_SET,
                        Integer.valueOf(fallback)
                    );
                    if (resolved instanceof Number) {
                        return String.format("#%08x", ((Number) resolved).intValue());
                    }
                } catch (Throwable ignored) {
                }
                return String.format("#%08x", fallback);
            }
        } catch (Throwable ignored) {
        }

        return null;
    }

    private static PaintResolution resolvePaintValue(Object target, String[] fieldNames, String methodName) throws Throwable {
        if (target == null) {
            return null;
        }

        if (fieldNames != null) {
            for (String fieldName : fieldNames) {
                java.lang.reflect.Field field = ReflectionUtils.findField(target.getClass(), fieldName);
                if (field == null) {
                    continue;
                }
                field.setAccessible(true);
                Object value = field.get(target);
                if (value != null) {
                    PaintResolution resolution = new PaintResolution();
                    resolution.value = value;
                    resolution.fromMethod = false;
                    return resolution;
                }
            }
        }

        if (methodName != null) {
            Object value = ReflectionUtils.tryInvokeObjectNoArg(target, methodName);
            if (value != null) {
                PaintResolution resolution = new PaintResolution();
                resolution.value = value;
                resolution.fromMethod = true;
                return resolution;
            }
        }

        return null;
    }
}
