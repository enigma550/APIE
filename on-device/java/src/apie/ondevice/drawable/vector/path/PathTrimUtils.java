package apie.ondevice.drawable.vector.path;

import android.graphics.Path;
import android.graphics.PathMeasure;

public final class PathTrimUtils {
    private PathTrimUtils() {
    }

    public static Path applyTrimPath(Path sourcePath, float trimPathStart, float trimPathEnd, float trimPathOffset) {
        if (sourcePath == null) {
            return null;
        }

        float normalizedStart = normalizeUnit(trimPathStart + trimPathOffset);
        float normalizedEnd = normalizeUnit(trimPathEnd + trimPathOffset);
        boolean hasTrim = Math.abs(trimPathStart) > 0.0001f
            || Math.abs(trimPathEnd - 1f) > 0.0001f
            || Math.abs(trimPathOffset) > 0.0001f;
        if (!hasTrim) {
            return sourcePath;
        }

        if (Math.abs(normalizedStart - normalizedEnd) < 0.0001f) {
            return new Path();
        }

        PathMeasure pathMeasure = new PathMeasure(sourcePath, false);
        float length = pathMeasure.getLength();
        if (length <= 0f) {
            return new Path();
        }

        float startLength = normalizedStart * length;
        float endLength = normalizedEnd * length;
        Path trimmed = new Path();

        if (startLength > endLength) {
            pathMeasure.getSegment(startLength, length, trimmed, true);
            pathMeasure.getSegment(0f, endLength, trimmed, true);
        } else {
            pathMeasure.getSegment(startLength, endLength, trimmed, true);
        }

        trimmed.rLineTo(0f, 0f);
        return trimmed;
    }

    private static float normalizeUnit(float value) {
        float normalized = value % 1f;
        if (normalized < 0f) {
            normalized += 1f;
        }
        return normalized;
    }
}
