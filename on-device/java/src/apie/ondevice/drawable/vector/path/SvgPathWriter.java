package apie.ondevice.drawable.vector.path;

import apie.ondevice.drawable.vector.path.svg.SvgPathEncodingContext;
import apie.ondevice.drawable.vector.path.svg.SvgPathVerbEncoder;
import apie.ondevice.support.ReflectionUtils;

import android.graphics.Path;

import java.lang.reflect.Method;

public final class SvgPathWriter {
    private SvgPathWriter() {
    }

    public static String pathToSvgPathData(Path path) {
        try {
            Method getPathIterator = Path.class.getMethod("getPathIterator");
            Object iterator = getPathIterator.invoke(path);
            if (iterator == null) {
                return null;
            }

            Class<?> iteratorClass = iterator.getClass();
            Method hasNext = iteratorClass.getMethod("hasNext");
            Method next = iteratorClass.getMethod("next", float[].class, int.class);

            int moveVerb = ReflectionUtils.getStaticIntField(iteratorClass, "VERB_MOVE", 0);
            int lineVerb = ReflectionUtils.getStaticIntField(iteratorClass, "VERB_LINE", 1);
            int quadVerb = ReflectionUtils.getStaticIntField(iteratorClass, "VERB_QUAD", 2);
            int conicVerb = ReflectionUtils.getStaticIntField(iteratorClass, "VERB_CONIC", 3);
            int cubicVerb = ReflectionUtils.getStaticIntField(iteratorClass, "VERB_CUBIC", 4);
            int closeVerb = ReflectionUtils.getStaticIntField(iteratorClass, "VERB_CLOSE", 5);
            int doneVerb = ReflectionUtils.getStaticIntField(iteratorClass, "VERB_DONE", 6);

            SvgPathEncodingContext context = new SvgPathEncodingContext();
            float[] points = new float[8];

            while (Boolean.TRUE.equals(hasNext.invoke(iterator))) {
                for (int index = 0; index < points.length; index++) {
                    points[index] = Float.NaN;
                }
                Object verbValue = next.invoke(iterator, points, 0);
                if (!(verbValue instanceof Number)) {
                    return null;
                }

                int verb = ((Number) verbValue).intValue();
                if (verb == doneVerb) {
                    break;
                }
                if (!SvgPathVerbEncoder.appendVerb(context, verb, points, moveVerb, lineVerb, quadVerb, conicVerb, cubicVerb, closeVerb)) {
                    return null;
                }
            }

            if (context.builder.length() == 0) {
                return null;
            }
            return context.builder.toString();
        } catch (Throwable ignored) {
            return null;
        }
    }
}
