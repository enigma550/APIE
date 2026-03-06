package apie.ondevice.drawable.vector.path.svg;

public final class SvgPathEncodingContext {
    public final StringBuilder builder = new StringBuilder();
    public boolean hasCurrentPoint;
    public float currentX;
    public float currentY;
    public float contourStartX;
    public float contourStartY;
}
