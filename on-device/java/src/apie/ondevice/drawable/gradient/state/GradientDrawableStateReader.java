package apie.ondevice.drawable.gradient.state;

import apie.ondevice.support.ReflectionUtils;

import android.graphics.drawable.GradientDrawable;

public final class GradientDrawableStateReader {
    private GradientDrawableStateReader() {
    }

    public static int readGradientShape(GradientDrawable drawable, Object gradientState) throws Throwable {
        Integer methodValue = ReflectionUtils.tryInvokeIntNoArg(drawable, "getShape");
        if (methodValue != null) {
            return methodValue.intValue();
        }
        return ReflectionUtils.getIntField(gradientState, "mShape", GradientDrawable.RECTANGLE);
    }

    public static int readGradientType(GradientDrawable drawable, Object gradientState) throws Throwable {
        Integer methodValue = ReflectionUtils.tryInvokeIntNoArg(drawable, "getGradientType");
        if (methodValue != null) {
            return methodValue.intValue();
        }
        return ReflectionUtils.getIntField(gradientState, "mGradient", GradientDrawable.LINEAR_GRADIENT);
    }

    public static int[] readGradientColors(GradientDrawable drawable, Object gradientState) throws Throwable {
        Object stateColors = ReflectionUtils.getOptionalFieldValue(gradientState, "mColors");
        if (stateColors instanceof int[]) {
            return (int[]) stateColors;
        }

        try {
            java.lang.reflect.Method getColors = drawable.getClass().getMethod("getColors");
            Object value = getColors.invoke(drawable);
            if (value instanceof int[]) {
                return (int[]) value;
            }
        } catch (Throwable ignored) {
        }

        return null;
    }

    public static float[] readGradientPositions(Object gradientState) throws Throwable {
        Object statePositions = ReflectionUtils.getOptionalFieldValue(gradientState, "mPositions");
        if (statePositions instanceof float[]) {
            return (float[]) statePositions;
        }
        return null;
    }
}
