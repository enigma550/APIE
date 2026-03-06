package apie.ondevice.support;

import apie.ondevice.support.reflection.ReflectionFieldAccess;
import apie.ondevice.support.reflection.ReflectionInvoker;
import apie.ondevice.support.reflection.ReflectionNumberReaders;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

public final class ReflectionUtils {
    private ReflectionUtils() {
    }

    public static Integer tryInvokeIntNoArg(Object target, String methodName) {
        return ReflectionInvoker.tryInvokeIntNoArg(target, methodName);
    }

    public static Float tryInvokeFloatNoArg(Object target, String methodName) {
        return ReflectionInvoker.tryInvokeFloatNoArg(target, methodName);
    }

    public static Object tryInvokeObjectNoArg(Object target, String methodName) {
        return ReflectionInvoker.tryInvokeObjectNoArg(target, methodName);
    }

    public static Method findNoArgMethod(Class<?> type, String methodName) {
        return ReflectionInvoker.findNoArgMethod(type, methodName);
    }

    public static float[] getFloatArrayField(Object target, String fieldName) throws Throwable {
        return ReflectionNumberReaders.getFloatArrayField(target, fieldName);
    }

    public static float getFloatField(Object target, String fieldName, float fallback) throws Throwable {
        return ReflectionNumberReaders.getFloatField(target, fieldName, fallback);
    }

    public static float getFloatFieldOrMethod(Object target, String fieldName, float fallback, String methodName)
        throws Throwable {
        return ReflectionNumberReaders.getFloatFieldOrMethod(target, fieldName, fallback, methodName);
    }

    public static float getFloatFieldOrMethods(Object target, String fieldName, float fallback, String... methodNames)
        throws Throwable {
        return ReflectionNumberReaders.getFloatFieldOrMethods(target, fieldName, fallback, methodNames);
    }

    public static int getIntField(Object target, String fieldName, int fallback) throws Throwable {
        return ReflectionNumberReaders.getIntField(target, fieldName, fallback);
    }

    public static int getIntFieldOrMethod(Object target, String fieldName, int fallback, String... methodNames)
        throws Throwable {
        return ReflectionNumberReaders.getIntFieldOrMethod(target, fieldName, fallback, methodNames);
    }

    public static Object getOptionalFieldValue(Object target, String fieldName) throws Throwable {
        return ReflectionFieldAccess.getOptionalFieldValue(target, fieldName);
    }

    public static Object getFieldValue(Object target, String fieldName) throws Throwable {
        return ReflectionFieldAccess.getFieldValue(target, fieldName);
    }

    public static Field findField(Class<?> type, String fieldName) {
        return ReflectionFieldAccess.findField(type, fieldName);
    }

    public static int getStaticIntField(Class<?> type, String fieldName, int fallback) {
        return ReflectionFieldAccess.getStaticIntField(type, fieldName, fallback);
    }

    public static int[] getIntArrayFieldQuiet(Object target, String fieldName) {
        return ReflectionNumberReaders.getIntArrayFieldQuiet(target, fieldName);
    }

    public static float[] getFloatArrayFieldQuiet(Object target, String fieldName) {
        return ReflectionNumberReaders.getFloatArrayFieldQuiet(target, fieldName);
    }

    public static Integer getIntFieldQuiet(Object target, String fieldName) {
        return ReflectionNumberReaders.getIntFieldQuiet(target, fieldName);
    }

    public static Boolean getBooleanFieldQuiet(Object target, String fieldName) {
        return ReflectionNumberReaders.getBooleanFieldQuiet(target, fieldName);
    }

    public static float getFloatFieldQuiet(Object target, String fieldName, float fallback) {
        return ReflectionNumberReaders.getFloatFieldQuiet(target, fieldName, fallback);
    }

    public static String fieldSummariesToJson(Object target) {
        return ReflectionDebugJson.fieldSummariesToJson(target);
    }

    public static String methodSummariesToJson(Class<?> type) {
        return ReflectionDebugJson.methodSummariesToJson(type);
    }

    public static String staticMethodSummariesToJson(Class<?> type) {
        return ReflectionDebugJson.staticMethodSummariesToJson(type);
    }
}
