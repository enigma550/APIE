package android.graphics.drawable;

import android.graphics.Canvas;

public class LayerDrawable extends Drawable {
    public int getNumberOfLayers() {
        return 0;
    }

    public Drawable getDrawable(int index) {
        return null;
    }

    @Override
    public void draw(Canvas canvas) {
    }
}
