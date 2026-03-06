package apie.ondevice.drawable.vector.path.svg;

import apie.ondevice.support.JsonUtils;

public final class SvgPathVerbEncoder {
    private SvgPathVerbEncoder() {
    }

    public static boolean appendVerb(SvgPathEncodingContext context, int verb, float[] points, int moveVerb, int lineVerb, int quadVerb, int conicVerb, int cubicVerb, int closeVerb) {
        if (verb == moveVerb) {
            float moveX = points[0];
            float moveY = points[1];
            if (context.hasCurrentPoint
                && isValidPoint(points[2], points[3])
                && approximatelyEqual(points[0], context.currentX)
                && approximatelyEqual(points[1], context.currentY)) {
                moveX = points[2];
                moveY = points[3];
            }
            if (!isValidPoint(moveX, moveY)) {
                return false;
            }
            appendPathSegment(context.builder, 'M', moveX, moveY);
            context.currentX = moveX;
            context.currentY = moveY;
            context.contourStartX = moveX;
            context.contourStartY = moveY;
            context.hasCurrentPoint = true;
            return true;
        }
        if (verb == lineVerb) {
            float lineX = points[0];
            float lineY = points[1];
            if (context.hasCurrentPoint
                && isValidPoint(points[2], points[3])
                && approximatelyEqual(points[0], context.currentX)
                && approximatelyEqual(points[1], context.currentY)) {
                lineX = points[2];
                lineY = points[3];
            }
            if (!isValidPoint(lineX, lineY)) {
                return false;
            }
            appendPathSegment(context.builder, 'L', lineX, lineY);
            context.currentX = lineX;
            context.currentY = lineY;
            return true;
        }
        if (verb == quadVerb) {
            float controlX = points[0];
            float controlY = points[1];
            float endX = points[2];
            float endY = points[3];
            if (context.hasCurrentPoint
                && isValidPoint(points[4], points[5])
                && approximatelyEqual(points[0], context.currentX)
                && approximatelyEqual(points[1], context.currentY)) {
                controlX = points[2];
                controlY = points[3];
                endX = points[4];
                endY = points[5];
            }
            if (!isValidPoint(controlX, controlY) || !isValidPoint(endX, endY)) {
                return false;
            }
            appendPathSegment(context.builder, 'Q', controlX, controlY, endX, endY);
            context.currentX = endX;
            context.currentY = endY;
            return true;
        }
        if (verb == cubicVerb) {
            float c1x = points[0];
            float c1y = points[1];
            float c2x = points[2];
            float c2y = points[3];
            float endX = points[4];
            float endY = points[5];
            if (context.hasCurrentPoint
                && isValidPoint(points[6], points[7])
                && approximatelyEqual(points[0], context.currentX)
                && approximatelyEqual(points[1], context.currentY)) {
                c1x = points[2];
                c1y = points[3];
                c2x = points[4];
                c2y = points[5];
                endX = points[6];
                endY = points[7];
            }
            if (!isValidPoint(c1x, c1y) || !isValidPoint(c2x, c2y) || !isValidPoint(endX, endY)) {
                return false;
            }
            appendPathSegment(context.builder, 'C', c1x, c1y, c2x, c2y, endX, endY);
            context.currentX = endX;
            context.currentY = endY;
            return true;
        }
        if (verb == closeVerb) {
            appendPathSegment(context.builder, 'Z');
            if (context.hasCurrentPoint) {
                context.currentX = context.contourStartX;
                context.currentY = context.contourStartY;
            }
            return true;
        }
        if (verb == conicVerb) {
            if (!context.hasCurrentPoint || !isValidPoint(context.currentX, context.currentY)) {
                return false;
            }

            float controlX = points[0];
            float controlY = points[1];
            float endX = points[2];
            float endY = points[3];
            float conicWeight = points[4];

            if (isValidPoint(points[4], points[5])
                && approximatelyEqual(points[0], context.currentX)
                && approximatelyEqual(points[1], context.currentY)) {
                controlX = points[2];
                controlY = points[3];
                endX = points[4];
                endY = points[5];
                conicWeight = points[6];
            }

            if (!isValidPoint(controlX, controlY) || !isValidPoint(endX, endY)) {
                return false;
            }
            if (Float.isNaN(conicWeight) || Float.isInfinite(conicWeight) || conicWeight <= 0f) {
                return false;
            }

            float cubicFactor = (4f * conicWeight) / (3f * (1f + conicWeight));
            float c1x = context.currentX + (controlX - context.currentX) * cubicFactor;
            float c1y = context.currentY + (controlY - context.currentY) * cubicFactor;
            float c2x = endX + (controlX - endX) * cubicFactor;
            float c2y = endY + (controlY - endY) * cubicFactor;

            if (!isValidPoint(c1x, c1y) || !isValidPoint(c2x, c2y)) {
                return false;
            }

            appendPathSegment(context.builder, 'C', c1x, c1y, c2x, c2y, endX, endY);
            context.currentX = endX;
            context.currentY = endY;
            return true;
        }

        return false;
    }

    private static boolean isValidPoint(float x, float y) {
        return !Float.isNaN(x) && !Float.isInfinite(x) && !Float.isNaN(y) && !Float.isInfinite(y);
    }

    private static boolean approximatelyEqual(float left, float right) {
        return Math.abs(left - right) <= 0.0005f;
    }

    private static void appendPathSegment(StringBuilder builder, char command, float... values) {
        if (builder.length() > 0) {
            builder.append(' ');
        }
        builder.append(command);
        for (float value : values) {
            builder.append(' ');
            builder.append(JsonUtils.formatNumber(value));
        }
    }
}
