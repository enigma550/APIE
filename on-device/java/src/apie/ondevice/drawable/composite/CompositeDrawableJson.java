package apie.ondevice.drawable.composite;

import apie.ondevice.drawable.DrawableModelSerializer;
import apie.ondevice.drawable.DrawableStateUtils;
import apie.ondevice.support.JsonUtils;

import android.graphics.Rect;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.InsetDrawable;
import android.graphics.drawable.LayerDrawable;
import android.graphics.drawable.ScaleDrawable;

public final class CompositeDrawableJson {
    private CompositeDrawableJson() {
    }

    public static String adaptiveIconToJson(
        AdaptiveIconDrawable adaptive,
        boolean debugVectorMode,
        boolean preferMonochrome
    ) {
        if (preferMonochrome) {
            Drawable monochrome = DrawableStateUtils.getAdaptiveMonochrome(adaptive);
            if (monochrome != null) {
                DrawableStateUtils.forceDrawableFullBounds(monochrome);
                return DrawableModelSerializer.drawableToModelJson(monochrome, debugVectorMode, false);
            }
        }

        Drawable background = adaptive.getBackground();
        Drawable foreground = adaptive.getForeground();
        DrawableStateUtils.forceDrawableFullBounds(background);
        DrawableStateUtils.forceDrawableFullBounds(foreground);
        return groupJson(
            DrawableModelSerializer.drawableToModelJson(background, debugVectorMode, preferMonochrome),
            DrawableModelSerializer.drawableToModelJson(foreground, debugVectorMode, preferMonochrome)
        );
    }

    public static String layerDrawableToJson(
        LayerDrawable layerDrawable,
        boolean debugVectorMode,
        boolean preferMonochrome
    ) {
        StringBuilder builder = new StringBuilder();
        builder.append("{\"kind\":\"group\",\"children\":[");
        for (int index = 0; index < layerDrawable.getNumberOfLayers(); index++) {
            if (index > 0) {
                builder.append(',');
            }
            builder.append(
                DrawableModelSerializer.drawableToModelJson(
                    layerDrawable.getDrawable(index),
                    debugVectorMode,
                    preferMonochrome
                )
            );
        }
        builder.append("]}");
        return builder.toString();
    }

    public static String insetDrawableToJson(
        InsetDrawable drawable,
        boolean debugVectorMode,
        boolean preferMonochrome
    ) {
        return drawableWithBoundsTransform(drawable, drawable.getDrawable(), debugVectorMode, preferMonochrome);
    }

    public static String scaleDrawableToJson(
        ScaleDrawable drawable,
        boolean debugVectorMode,
        boolean preferMonochrome
    ) {
        return drawableWithBoundsTransform(drawable, drawable.getDrawable(), debugVectorMode, preferMonochrome);
    }

    private static String groupJson(String first, String second) {
        return "{\"kind\":\"group\",\"children\":[" + first + "," + second + "]}";
    }

    private static String drawableWithBoundsTransform(
        Drawable parentDrawable,
        Drawable childDrawable,
        boolean debugVectorMode,
        boolean preferMonochrome
    ) {
        if (childDrawable == null) {
            return "{\"kind\":\"group\",\"children\":[]}";
        }

        try {
            parentDrawable.setLevel(10000);
        } catch (Throwable ignored) {
        }
        try {
            childDrawable.setLevel(10000);
        } catch (Throwable ignored) {
        }

        String childJson = DrawableModelSerializer.drawableToModelJson(childDrawable, debugVectorMode, preferMonochrome);
        Rect parentBounds = parentDrawable.getBounds();
        Rect childBounds = childDrawable.getBounds();
        if (parentBounds == null || childBounds == null || parentBounds.isEmpty() || childBounds.isEmpty()) {
            return childJson;
        }

        int parentWidth = parentBounds.width();
        int parentHeight = parentBounds.height();
        int childWidth = childBounds.width();
        int childHeight = childBounds.height();
        if (parentWidth <= 0 || parentHeight <= 0 || childWidth <= 0 || childHeight <= 0) {
            return childJson;
        }

        float scaleX = childWidth / (float) parentWidth;
        float scaleY = childHeight / (float) parentHeight;
        float translateX = childBounds.left - parentBounds.left;
        float translateY = childBounds.top - parentBounds.top;

        boolean hasScale = Math.abs(scaleX - 1f) > 0.0001f || Math.abs(scaleY - 1f) > 0.0001f;
        boolean hasTranslate = Math.abs(translateX) > 0.0001f || Math.abs(translateY) > 0.0001f;
        if (!hasScale && !hasTranslate) {
            return childJson;
        }

        StringBuilder builder = new StringBuilder();
        builder.append("{\"kind\":\"group\"");
        if (hasTranslate) {
            builder.append(",\"translateX\":").append(JsonUtils.formatNumber(translateX));
            builder.append(",\"translateY\":").append(JsonUtils.formatNumber(translateY));
        }
        if (hasScale) {
            builder.append(",\"scaleX\":").append(JsonUtils.formatNumber(scaleX));
            builder.append(",\"scaleY\":").append(JsonUtils.formatNumber(scaleY));
        }
        builder.append(",\"children\":[").append(childJson).append("]}");
        return builder.toString();
    }
}
