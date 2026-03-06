package apie.ondevice.drawable.gradient.paint;

import apie.ondevice.drawable.gradient.json.GradientColorJson;
import apie.ondevice.drawable.gradient.json.ShaderGradientJson;
import apie.ondevice.support.ReflectionUtils;

public final class PaintGradientResolver {
    private PaintGradientResolver() {
    }

    public static String resolveGradientFromPaintValue(Object value) {
        if (value == null || value instanceof Number) {
            return null;
        }

        Object shader = ReflectionUtils.tryInvokeObjectNoArg(value, "getShader");
        if (shader == null) {
            try {
                shader = ReflectionUtils.getOptionalFieldValue(value, "mShader");
            } catch (Throwable ignored) {
                shader = null;
            }
        }
        if (shader != null) {
            String shaderGradient = ShaderGradientJson.shaderToGradientJson(shader);
            if (shaderGradient != null) {
                return shaderGradient;
            }
        }

        String gradientColorJson = GradientColorJson.gradientColorToJson(value);
        if (gradientColorJson != null) {
            return gradientColorJson;
        }

        return null;
    }

    public static boolean isGradientColorValue(Object value) {
        if (value == null) {
            return false;
        }
        String className = value.getClass().getName();
        return className.contains("GradientColor");
    }
}
