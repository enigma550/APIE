package apie.ondevice.drawable.vector;

import apie.ondevice.support.IconExtractorSupport;
import apie.ondevice.support.JsonUtils;
import apie.ondevice.support.ReflectionUtils;

import android.graphics.drawable.VectorDrawable;

public final class VectorDrawableModelSerializer {
    private VectorDrawableModelSerializer() {
    }

    public static String vectorDrawableToModelJson(VectorDrawable drawable, boolean debugVectorMode) throws Throwable {
        Object vectorState = ReflectionUtils.getFieldValue(drawable, "mVectorState");
        Object pathRenderer = ReflectionUtils.getOptionalFieldValue(vectorState, "mVPathRenderer");
        if (pathRenderer == null) {
            pathRenderer = ReflectionUtils.getOptionalFieldValue(vectorState, "mVPathRendererCompat");
        }
        if (pathRenderer == null) {
            pathRenderer = ReflectionUtils.getOptionalFieldValue(drawable, "mVPathRenderer");
        }
        if (pathRenderer == null) {
            pathRenderer = vectorState;
        }
        Object rootGroup = ReflectionUtils.getFieldValue(pathRenderer, "mRootGroup");

        float viewportWidth = ReflectionUtils.getFloatField(pathRenderer, "mViewportWidth", 0f);
        float viewportHeight = ReflectionUtils.getFloatField(pathRenderer, "mViewportHeight", 0f);
        if (viewportWidth <= 0f) {
            viewportWidth = (float) IconExtractorSupport.ICON_SIZE;
        }
        if (viewportHeight <= 0f) {
            viewportHeight = (float) IconExtractorSupport.ICON_SIZE;
        }

        int rootAlpha = ReflectionUtils.getIntField(pathRenderer, "mRootAlpha", 255);
        StringBuilder builder = new StringBuilder();
        builder.append("{\"kind\":\"vector\",\"viewportWidth\":")
            .append(JsonUtils.formatNumber(viewportWidth))
            .append(",\"viewportHeight\":")
            .append(JsonUtils.formatNumber(viewportHeight))
            .append(",\"alpha\":")
            .append(JsonUtils.formatNumber(rootAlpha / 255f))
            .append(",\"children\":")
            .append(VectorTreeSerializer.vectorChildrenToJson(rootGroup, debugVectorMode));

        if (debugVectorMode) {
            VectorDebugJson.appendVectorDebug(builder, pathRenderer, rootGroup);
        }

        builder.append("}");
        return builder.toString();
    }
}
