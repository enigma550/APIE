package android.graphics.drawable;

import android.graphics.Canvas;
import android.graphics.Rect;

public abstract class Drawable {
    public abstract void draw(Canvas canvas);

    public int getIntrinsicWidth() {
        return -1;
    }

    public int getIntrinsicHeight() {
        return -1;
    }

    public void setBounds(int left, int top, int right, int bottom) {
    }

    public Rect getBounds() {
        return new Rect();
    }

    public boolean setState(int[] stateSet) {
        return false;
    }

    public boolean setLevel(int level) {
        return false;
    }
}
