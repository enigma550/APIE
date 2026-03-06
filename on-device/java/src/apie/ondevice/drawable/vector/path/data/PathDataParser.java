package apie.ondevice.drawable.vector.path.data;

import apie.ondevice.drawable.vector.path.SvgPathWriter;
import apie.ondevice.support.ReflectionUtils;

import android.graphics.Path;

public final class PathDataParser {
    private PathDataParser() {
    }

    public static String pathDataToString(Object pathData) throws Throwable {
        if (pathData == null) {
            return null;
        }

        Object nestedNodes = ReflectionUtils.getOptionalFieldValue(pathData, "mNodes");
        if (nestedNodes == null) {
            nestedNodes = ReflectionUtils.getOptionalFieldValue(pathData, "nodes");
        }
        if (nestedNodes != null && nestedNodes.getClass().isArray()) {
            return PathNodeStringifier.pathNodesToString((Object[]) nestedNodes);
        }

        if (pathData.getClass().isArray()) {
            return PathNodeStringifier.pathNodesToString((Object[]) pathData);
        }

        if (pathData instanceof CharSequence) {
            return pathData.toString();
        }

        String textualPathData = PathTextHeuristics.tryExtractPathDataFromToString(pathData);
        if (textualPathData != null) {
            return textualPathData;
        }

        Path path = PathMaterializer.createPathFromPathData(pathData);
        if (path == null) {
            return null;
        }

        String materializedPathData = SvgPathWriter.pathToSvgPathData(path);
        if (materializedPathData != null && !materializedPathData.isEmpty()) {
            return materializedPathData;
        }
        return textualPathData;
    }

    public static Path pathDataToPath(Object pathData) throws Throwable {
        if (pathData == null) {
            return null;
        }

        if (pathData instanceof Path) {
            return (Path) pathData;
        }

        if (pathData.getClass().isArray()) {
            String pathDataText = PathNodeStringifier.pathNodesToString((Object[]) pathData);
            return PathMaterializer.createPathFromString(pathDataText);
        }

        if (pathData instanceof CharSequence) {
            return PathMaterializer.createPathFromString(pathData.toString());
        }

        Path path = PathMaterializer.createPathFromPathData(pathData);
        if (path != null) {
            return path;
        }

        String textualPathData = PathTextHeuristics.tryExtractPathDataFromToString(pathData);
        if (textualPathData != null) {
            return PathMaterializer.createPathFromString(textualPathData);
        }
        return null;
    }
}
