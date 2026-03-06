package android.content.pm;

import android.graphics.drawable.Drawable;
import java.util.List;

public abstract class PackageManager {
    public static class NameNotFoundException extends Exception {
    }

    public abstract Drawable getApplicationIcon(String packageName) throws NameNotFoundException;

    public abstract Drawable getDrawable(String packageName, int resourceId, ApplicationInfo appInfo);

    public abstract List<ApplicationInfo> getInstalledApplications(int flags);

    public abstract ApplicationInfo getApplicationInfo(String packageName, int flags) throws NameNotFoundException;

    public abstract CharSequence getApplicationLabel(ApplicationInfo info);
}
