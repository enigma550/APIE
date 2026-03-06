package apie.ondevice.drawable.gradient;

import apie.ondevice.drawable.gradient.paint.PaintGradientResolver;
import apie.ondevice.drawable.gradient.paint.PaintResolution;
import apie.ondevice.drawable.gradient.paint.PaintValueResolver;

public final class GradientJsonSerializer {
    private GradientJsonSerializer() {
    }

    public static String resolveColor(Object target, String... fieldNames) throws Throwable {
        return PaintValueResolver.resolveColor(target, fieldNames);
    }

    public static PaintResolution resolvePathPaint(Object target, String[] fieldNames, String methodName) throws Throwable {
        return PaintValueResolver.resolvePathPaint(target, fieldNames, methodName);
    }

    public static String resolveColorFromPaintValue(Object value) {
        return PaintValueResolver.resolveColorFromPaintValue(value);
    }

    public static String resolveGradientFromPaintValue(Object value) {
        return PaintGradientResolver.resolveGradientFromPaintValue(value);
    }
}
