package apie.ondevice.drawable.vector.path;

import apie.ondevice.drawable.vector.path.data.PathDataParser;
import apie.ondevice.drawable.vector.path.data.PathMaterializer;
import apie.ondevice.drawable.vector.path.data.PathPropertyReader;

import android.graphics.Path;

public final class PathModelUtils {
    private PathModelUtils() {
    }

    public static String pathDataToString(Object pathData) throws Throwable {
        return PathDataParser.pathDataToString(pathData);
    }

    public static Path pathDataToPath(Object pathData) throws Throwable {
        return PathDataParser.pathDataToPath(pathData);
    }

    public static Path resolveMaterializedVectorPath(Object vectorPath, Object rawPathData) throws Throwable {
        return PathMaterializer.resolveMaterializedVectorPath(vectorPath, rawPathData);
    }

    public static Path applyTrimPath(Path sourcePath, float trimPathStart, float trimPathEnd, float trimPathOffset) {
        return PathTrimUtils.applyTrimPath(sourcePath, trimPathStart, trimPathEnd, trimPathOffset);
    }

    public static String pathToSvgPathData(Path path) {
        return SvgPathWriter.pathToSvgPathData(path);
    }

    public static String readPathPropertyDataHex(Object path) {
        return PathPropertyReader.readPathPropertyDataHex(path);
    }
}
