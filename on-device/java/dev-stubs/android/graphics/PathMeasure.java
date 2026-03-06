package android.graphics;

public class PathMeasure {
    public PathMeasure(Path path, boolean forceClosed) {
    }

    public float getLength() {
        return 0f;
    }

    public boolean getSegment(float startD, float stopD, Path dst, boolean startWithMoveTo) {
        return false;
    }
}
