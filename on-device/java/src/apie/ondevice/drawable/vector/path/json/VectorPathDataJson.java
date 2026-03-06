package apie.ondevice.drawable.vector.path.json;

import apie.ondevice.drawable.vector.path.PathModelUtils;
import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

import android.graphics.Path;

public final class VectorPathDataJson {
    private VectorPathDataJson() {
    }

    public static String resolveFullPathData(Object path, float trimPathStart, float trimPathEnd, float trimPathOffset)
        throws Throwable {
        String pathData = null;
        boolean hasTrimPath = Math.abs(trimPathStart) > 0.0001f
            || Math.abs(trimPathEnd - 1f) > 0.0001f
            || Math.abs(trimPathOffset) > 0.0001f;
        Object rawPathData = ReflectionUtils.tryInvokeObjectNoArg(path, "getPathData");
        if (rawPathData == null) {
            rawPathData = ReflectionUtils.getFieldValue(path, "mPathData");
        }
        if (!hasTrimPath) {
            pathData = PathModelUtils.pathDataToString(rawPathData);
        }
        if (pathData == null || pathData.isEmpty()) {
            Path materializedPath = PathModelUtils.resolveMaterializedVectorPath(path, rawPathData);
            if (materializedPath != null) {
                Path trimmedPath = PathModelUtils.applyTrimPath(materializedPath, trimPathStart, trimPathEnd, trimPathOffset);
                pathData = PathModelUtils.pathToSvgPathData(trimmedPath);
            }
        }
        if (pathData == null || pathData.isEmpty()) {
            throw new UnsupportedOperationException("Unable to serialize vector full path");
        }
        return pathData;
    }

    public static String resolveClipPathData(Object path) throws Throwable {
        Object rawPathData = ReflectionUtils.tryInvokeObjectNoArg(path, "getPathData");
        if (rawPathData == null) {
            rawPathData = ReflectionUtils.getFieldValue(path, "mPathData");
        }
        String pathData = PathModelUtils.pathDataToString(rawPathData);
        if (pathData == null || pathData.isEmpty()) {
            Path materializedPath = PathModelUtils.resolveMaterializedVectorPath(path, rawPathData);
            if (materializedPath != null) {
                pathData = PathModelUtils.pathToSvgPathData(materializedPath);
            }
        }
        if (pathData == null || pathData.isEmpty()) {
            throw new UnsupportedOperationException("Unable to serialize vector clip path");
        }
        return pathData;
    }

    public static String buildClipPathJson(Object path, boolean debugVectorMode) throws Throwable {
        String pathData = resolveClipPathData(path);
        int fillRule = ReflectionUtils.getIntFieldOrMethod(path, "mFillRule", 0, "getFillType");

        if (!debugVectorMode) {
            return "{\"kind\":\"clip-path\",\"pathData\":\""
                + JsonUtils.jsonEscape(pathData)
                + "\",\"fillRule\":"
                + fillRule
                + "}";
        }

        return "{\"kind\":\"clip-path\",\"pathData\":\""
            + JsonUtils.jsonEscape(pathData)
            + "\",\"fillRule\":"
            + fillRule
            + ",\"debug\":{\"class\":\""
            + JsonUtils.jsonEscape(path.getClass().getName())
            + "\",\"fields\":"
            + ReflectionUtils.fieldSummariesToJson(path)
            + "}}";
    }
}
