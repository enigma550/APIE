package apie.ondevice.runtime;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Looper;

import java.lang.reflect.Method;

public final class AndroidRuntime {
    private AndroidRuntime() {
    }

    @SuppressLint("PrivateApi")
    public static Context getSystemContext() throws Throwable {
        Looper.prepareMainLooper();
        Class<?> activityThreadClass = Class.forName("android.app.ActivityThread");
        Method systemMain = activityThreadClass.getMethod("systemMain");
        Object thread = systemMain.invoke(null);
        return getAnyContext(thread);
    }

    private static Context getAnyContext(Object thread) {
        Context context = null;

        try {
            Method method = thread.getClass().getMethod("getSystemContext");
            context = (Context) method.invoke(thread);
        } catch (Throwable ignored) {
        }

        if (context == null) {
            try {
                Method method = thread.getClass().getMethod("createSystemContext");
                context = (Context) method.invoke(thread);
            } catch (Throwable ignored) {
            }
        }

        if (context == null) {
            try {
                Method method = thread.getClass().getMethod("getApplication");
                context = (Context) method.invoke(thread);
            } catch (Throwable ignored) {
            }
        }

        if (context == null) {
            try {
                Method method = thread.getClass().getMethod("getSystemUiContext");
                context = (Context) method.invoke(thread);
            } catch (Throwable ignored) {
            }
        }

        return context;
    }
}
