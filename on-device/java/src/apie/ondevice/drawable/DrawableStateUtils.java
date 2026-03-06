package apie.ondevice.drawable;

import apie.ondevice.support.IconExtractorSupport;
import apie.ondevice.support.ReflectionUtils;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Rect;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.InsetDrawable;
import android.graphics.drawable.LayerDrawable;
import android.graphics.drawable.RotateDrawable;
import android.graphics.drawable.ScaleDrawable;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

public final class DrawableStateUtils {
    private DrawableStateUtils() {
    }

    public static Drawable resolveApplicationIcon(
        PackageManager pm,
        String packageName,
        ApplicationInfo appInfo,
        boolean preferRound
    ) throws PackageManager.NameNotFoundException {
        if (preferRound) {
            int roundIconResourceId = readApplicationInfoRoundIconRes(appInfo);
            if (roundIconResourceId != 0) {
                try {
                    Drawable roundIcon = pm.getDrawable(packageName, roundIconResourceId, appInfo);
                    if (roundIcon != null) {
                        return roundIcon;
                    }
                } catch (Throwable ignored) {
                }
            }
        }

        return pm.getApplicationIcon(packageName);
    }

    public static String sanitizeLabel(String label) {
        return label.replace(":", "_").replace("\n", " ").replace("\r", "");
    }

    public static void ensureDrawableBounds(Drawable drawable) {
        if (drawable == null) {
            return;
        }

        Rect bounds = drawable.getBounds();
        if (bounds == null || bounds.isEmpty()) {
            drawable.setBounds(0, 0, IconExtractorSupport.ICON_SIZE, IconExtractorSupport.ICON_SIZE);
        }
    }

    public static void forceDrawableFullBounds(Drawable drawable) {
        if (drawable == null) {
            return;
        }
        try {
            drawable.setBounds(0, 0, IconExtractorSupport.ICON_SIZE, IconExtractorSupport.ICON_SIZE);
        } catch (Throwable ignored) {
        }
    }

    public static Drawable getAdaptiveMonochrome(AdaptiveIconDrawable adaptive) {
        try {
            Method getMonochrome = AdaptiveIconDrawable.class.getMethod("getMonochrome");
            Object value = getMonochrome.invoke(adaptive);
            if (value instanceof Drawable) {
                return (Drawable) value;
            }
        } catch (Throwable ignored) {
        }
        return null;
    }

    public static void applyLauncherLikeState(Drawable drawable) {
        if (drawable == null) {
            return;
        }

        try {
            drawable.setState(IconExtractorSupport.ENABLED_STATE_SET);
        } catch (Throwable ignored) {
        }
        try {
            drawable.setLevel(10000);
        } catch (Throwable ignored) {
        }

        if (drawable instanceof AdaptiveIconDrawable) {
            AdaptiveIconDrawable adaptive = (AdaptiveIconDrawable) drawable;
            applyLauncherLikeState(adaptive.getBackground());
            applyLauncherLikeState(adaptive.getForeground());
            applyLauncherLikeState(getAdaptiveMonochrome(adaptive));
            return;
        }

        if (drawable instanceof LayerDrawable) {
            LayerDrawable layerDrawable = (LayerDrawable) drawable;
            for (int index = 0; index < layerDrawable.getNumberOfLayers(); index++) {
                applyLauncherLikeState(layerDrawable.getDrawable(index));
            }
            return;
        }

        if (drawable instanceof InsetDrawable) {
            applyLauncherLikeState(((InsetDrawable) drawable).getDrawable());
            return;
        }

        if (drawable instanceof ScaleDrawable) {
            applyLauncherLikeState(((ScaleDrawable) drawable).getDrawable());
            return;
        }

        if (drawable instanceof RotateDrawable) {
            applyLauncherLikeState(((RotateDrawable) drawable).getDrawable());
        }
    }

    private static int readApplicationInfoRoundIconRes(ApplicationInfo appInfo) {
        Integer roundIconResourceId = readIntFieldIfPresent(appInfo, "roundIconRes");
        if (roundIconResourceId != null && roundIconResourceId.intValue() != 0) {
            return roundIconResourceId.intValue();
        }

        roundIconResourceId = readIntFieldIfPresent(appInfo, "roundIcon");
        if (roundIconResourceId != null) {
            return roundIconResourceId.intValue();
        }

        return 0;
    }

    private static Integer readIntFieldIfPresent(Object target, String fieldName) {
        try {
            Field field = ReflectionUtils.findField(target.getClass(), fieldName);
            if (field == null) {
                return null;
            }
            field.setAccessible(true);
            Object value = field.get(target);
            if (value instanceof Number) {
                return Integer.valueOf(((Number) value).intValue());
            }
        } catch (Throwable ignored) {
        }
        return null;
    }
}
