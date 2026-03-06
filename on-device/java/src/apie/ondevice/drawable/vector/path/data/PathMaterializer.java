package apie.ondevice.drawable.vector.path.data;

import apie.ondevice.support.ReflectionUtils;

import android.graphics.Path;

import java.lang.reflect.Method;

public final class PathMaterializer {
    private PathMaterializer() {
    }

    public static Path resolveMaterializedVectorPath(Object vectorPath, Object rawPathData) throws Throwable {
        Path pathFromRawData = PathDataParser.pathDataToPath(rawPathData);
        if (pathFromRawData != null) {
            return pathFromRawData;
        }

        Path pathFromField = extractPathField(vectorPath, "mPath");
        if (pathFromField != null) {
            return pathFromField;
        }

        pathFromField = extractPathField(vectorPath, "mRenderPath");
        if (pathFromField != null) {
            return pathFromField;
        }

        pathFromField = extractPathField(vectorPath, "mStagingPath");
        if (pathFromField != null) {
            return pathFromField;
        }

        return invokeVectorPathToPath(vectorPath);
    }

    public static Path createPathFromPathData(Object pathData) {
        Path path = tryCreatePathFromPathData(pathData, "android.util.PathParser");
        if (path != null) {
            return path;
        }
        return tryCreatePathFromPathData(pathData, "android.graphics.PathParser");
    }

    public static Path createPathFromString(String pathData) {
        if (pathData == null || pathData.isEmpty()) {
            return null;
        }
        Path path = tryCreatePathFromPathData(pathData, "android.util.PathParser");
        if (path != null) {
            return path;
        }
        return tryCreatePathFromPathData(pathData, "android.graphics.PathParser");
    }

    private static Path extractPathField(Object target, String fieldName) {
        try {
            Object fieldValue = ReflectionUtils.getOptionalFieldValue(target, fieldName);
            if (fieldValue instanceof Path) {
                return new Path((Path) fieldValue);
            }
        } catch (Throwable ignored) {
        }
        return null;
    }

    private static Path invokeVectorPathToPath(Object vectorPath) {
        if (vectorPath == null) {
            return null;
        }

        Class<?> current = vectorPath.getClass();
        while (current != null) {
            Method[] methods = current.getDeclaredMethods();
            for (Method method : methods) {
                String name = method.getName();
                Class<?>[] parameterTypes = method.getParameterTypes();
                try {
                    method.setAccessible(true);
                    if ("toPath".equals(name) && parameterTypes.length == 1 && Path.class.isAssignableFrom(parameterTypes[0])) {
                        Path materialized = new Path();
                        method.invoke(vectorPath, materialized);
                        return materialized;
                    }
                    if ("getPath".equals(name) && parameterTypes.length == 0 && Path.class.isAssignableFrom(method.getReturnType())) {
                        Object value = method.invoke(vectorPath);
                        if (value instanceof Path) {
                            return new Path((Path) value);
                        }
                    }
                } catch (Throwable ignored) {
                }
            }
            current = current.getSuperclass();
        }
        return null;
    }

    private static Path tryCreatePathFromPathData(Object pathData, String parserClassName) {
        try {
            Class<?> parserClass = Class.forName(parserClassName);
            Method[] methods = parserClass.getDeclaredMethods();
            Long nativePathDataPtr = PathPropertyReader.readNativePathDataPtr(pathData);
            for (Method method : methods) {
                if (!"createPathFromPathData".equals(method.getName())) {
                    continue;
                }

                Class<?>[] parameterTypes = method.getParameterTypes();
                method.setAccessible(true);

                if (parameterTypes.length == 2
                    && Path.class.isAssignableFrom(parameterTypes[0])
                    && parameterTypes[1].isAssignableFrom(pathData.getClass())) {
                    Path path = new Path();
                    method.invoke(null, path, pathData);
                    return path;
                }

                if (parameterTypes.length == 2
                    && Path.class.isAssignableFrom(parameterTypes[0])
                    && (parameterTypes[1] == long.class || parameterTypes[1] == Long.class)
                    && nativePathDataPtr != null) {
                    Path path = new Path();
                    method.invoke(null, path, Long.valueOf(nativePathDataPtr.longValue()));
                    return path;
                }

                if (parameterTypes.length == 1
                    && parameterTypes[0] == String.class
                    && pathData instanceof String) {
                    Object result = method.invoke(null, pathData);
                    if (result instanceof Path) {
                        return (Path) result;
                    }
                }

                if (parameterTypes.length == 1
                    && (parameterTypes[0] == long.class || parameterTypes[0] == Long.class)
                    && nativePathDataPtr != null) {
                    Object result = method.invoke(null, Long.valueOf(nativePathDataPtr.longValue()));
                    if (result instanceof Path) {
                        return (Path) result;
                    }
                }
            }
        } catch (Throwable ignored) {
        }
        return null;
    }
}
