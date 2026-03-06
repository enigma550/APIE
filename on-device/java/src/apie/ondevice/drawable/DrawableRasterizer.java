package apie.ondevice.drawable;

import apie.ondevice.support.IconExtractorSupport;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.util.Base64;

import java.io.ByteArrayOutputStream;

public final class DrawableRasterizer {
    private DrawableRasterizer() {
    }

    public static String drawableToPngBase64(Drawable drawable, boolean forceFullBounds) {
        if (drawable == null) {
            return "";
        }

        Rect originalBounds = new Rect(drawable.getBounds());
        if (forceFullBounds || originalBounds.isEmpty()) {
            drawable.setBounds(0, 0, IconExtractorSupport.ICON_SIZE, IconExtractorSupport.ICON_SIZE);
        }

        Bitmap bitmap = Bitmap.createBitmap(
            IconExtractorSupport.ICON_SIZE,
            IconExtractorSupport.ICON_SIZE,
            Bitmap.Config.ARGB_8888
        );
        Canvas canvas = new Canvas(bitmap);
        drawable.draw(canvas);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos);
        bitmap.recycle();

        drawable.setBounds(originalBounds.left, originalBounds.top, originalBounds.right, originalBounds.bottom);

        byte[] pngBytes = baos.toByteArray();
        return Base64.encodeToString(pngBytes, Base64.NO_WRAP);
    }
}
