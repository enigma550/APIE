package android.graphics;

public class Rect {
    public int left;
    public int top;
    public int right;
    public int bottom;

    public Rect() {
    }

    public Rect(int left, int top, int right, int bottom) {
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }

    public Rect(Rect other) {
        this(other.left, other.top, other.right, other.bottom);
    }

    public int width() {
        return right - left;
    }

    public int height() {
        return bottom - top;
    }

    public boolean isEmpty() {
        return width() <= 0 || height() <= 0;
    }
}
