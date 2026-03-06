package apie.ondevice.drawable.raster;

import apie.ondevice.drawable.DrawableRasterizer;
import apie.ondevice.support.IconExtractorSupport;
import apie.ondevice.support.JsonUtils;

import android.graphics.Rect;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;

public final class RasterDrawableJson {
    private RasterDrawableJson() {
    }

    public static String colorDrawableToModelJson(ColorDrawable drawable) {
        Rect bounds = drawable.getBounds();
        if (bounds == null || bounds.isEmpty()) {
            bounds = new Rect(0, 0, IconExtractorSupport.ICON_SIZE, IconExtractorSupport.ICON_SIZE);
        }

        String color = String.format("#%08x", drawable.getColor());
        return "{\"kind\":\"solid\",\"x\":"
            + bounds.left
            + ",\"y\":"
            + bounds.top
            + ",\"width\":"
            + Math.max(0, bounds.width())
            + ",\"height\":"
            + Math.max(0, bounds.height())
            + ",\"color\":\""
            + color
            + "\"}";
    }

    public static String rasterDrawableToModelJson(Drawable drawable) {
        return rasterDrawableToModelJson(drawable, null);
    }

    public static String rasterDrawableToModelJson(Drawable drawable, Throwable error) {
        String base64 = DrawableRasterizer.drawableToPngBase64(drawable, false);
        StringBuilder builder = new StringBuilder();
        builder.append("{\"kind\":\"image\",\"mime\":\"image/png\",\"width\":")
            .append(IconExtractorSupport.ICON_SIZE)
            .append(",\"height\":")
            .append(IconExtractorSupport.ICON_SIZE)
            .append(",\"sourceClass\":\"")
            .append(JsonUtils.jsonEscape(drawable.getClass().getName()))
            .append("\"");

        if (error != null) {
            builder.append(",\"vectorError\":\"")
                .append(JsonUtils.jsonEscape(error.getClass().getName() + ":" + String.valueOf(error.getMessage())))
                .append("\"");
        }

        builder.append(",\"data\":\"")
            .append(base64)
            .append("\"}");
        return builder.toString();
    }
}
