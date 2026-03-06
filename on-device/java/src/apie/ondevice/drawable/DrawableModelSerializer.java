package apie.ondevice.drawable;

import apie.ondevice.drawable.composite.CompositeDrawableJson;
import apie.ondevice.drawable.gradient.GradientDrawableModelSerializer;
import apie.ondevice.drawable.raster.RasterDrawableJson;
import apie.ondevice.drawable.vector.VectorDrawableModelSerializer;

import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.ClipDrawable;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.InsetDrawable;
import android.graphics.drawable.LayerDrawable;
import android.graphics.drawable.RotateDrawable;
import android.graphics.drawable.ScaleDrawable;
import android.graphics.drawable.VectorDrawable;

public final class DrawableModelSerializer {
    private DrawableModelSerializer() {
    }

    public static String drawableToModelJson(Drawable drawable, boolean debugVectorMode, boolean preferMonochrome) {
        if (drawable == null) {
            return "{\"kind\":\"group\",\"children\":[]}";
        }

        DrawableStateUtils.ensureDrawableBounds(drawable);

        if (drawable instanceof AdaptiveIconDrawable) {
            return CompositeDrawableJson.adaptiveIconToJson(
                (AdaptiveIconDrawable) drawable,
                debugVectorMode,
                preferMonochrome
            );
        }
        if (drawable instanceof LayerDrawable) {
            return CompositeDrawableJson.layerDrawableToJson((LayerDrawable) drawable, debugVectorMode, preferMonochrome);
        }
        if (drawable instanceof InsetDrawable) {
            return CompositeDrawableJson.insetDrawableToJson((InsetDrawable) drawable, debugVectorMode, preferMonochrome);
        }
        if (drawable instanceof ScaleDrawable) {
            return CompositeDrawableJson.scaleDrawableToJson((ScaleDrawable) drawable, debugVectorMode, preferMonochrome);
        }
        if (drawable instanceof ClipDrawable) {
            return RasterDrawableJson.rasterDrawableToModelJson(
                drawable,
                new UnsupportedOperationException("ClipDrawable wrapper is not serialized exactly")
            );
        }
        if (drawable instanceof RotateDrawable) {
            return RasterDrawableJson.rasterDrawableToModelJson(
                drawable,
                new UnsupportedOperationException("RotateDrawable wrapper is not serialized exactly")
            );
        }
        if (drawable instanceof ColorDrawable) {
            return RasterDrawableJson.colorDrawableToModelJson((ColorDrawable) drawable);
        }
        if (drawable instanceof GradientDrawable) {
            try {
                return GradientDrawableModelSerializer.gradientDrawableToModelJson((GradientDrawable) drawable);
            } catch (Throwable error) {
                return RasterDrawableJson.rasterDrawableToModelJson(drawable, error);
            }
        }
        if (drawable instanceof VectorDrawable) {
            try {
                return VectorDrawableModelSerializer.vectorDrawableToModelJson((VectorDrawable) drawable, debugVectorMode);
            } catch (Throwable error) {
                return RasterDrawableJson.rasterDrawableToModelJson(drawable, error);
            }
        }

        return RasterDrawableJson.rasterDrawableToModelJson(drawable);
    }
}
