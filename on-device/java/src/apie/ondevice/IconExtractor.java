package apie.ondevice;

import apie.ondevice.drawable.DrawableModelSerializer;
import apie.ondevice.drawable.DrawableRasterizer;
import apie.ondevice.drawable.DrawableStateUtils;
import apie.ondevice.runtime.AndroidRuntime;
import apie.ondevice.runtime.IconExtractorOptions;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.Drawable;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * On-device icon extractor that runs via app_process.
 * Uses PackageManager to natively resolve application icons.
 *
 * Usage: CLASSPATH=/data/local/tmp/icon_extractor.dex app_process /
 * apie.ondevice.IconExtractor [--svg-model] [--list-apps] [pkg1 pkg2 ...]
 * If no packages specified, operates on all installed third-party packages.
 *
 * Output formats:
 * APP:<package>:<label>
 * MODEL:<package>:<label>:<base64_json_model>
 * ADAPTIVE:<package>:<label>:<fg_base64>:<bg_base64>
 * ICON:<package>:<label>:<base64_png>
 * ERROR:<package>:<message>
 * DONE
 */
public class IconExtractor {
    public static void main(String[] args) {
        try {
            Context context = AndroidRuntime.getSystemContext();
            if (context == null) {
                System.out.println("FATAL:Could not obtain Android Context via any known method");
                System.out.flush();
                return;
            }

            PackageManager pm = context.getPackageManager();
            IconExtractorOptions options = IconExtractorOptions.parse(args);
            List<String> packageArgs = options.packageArgs;

            if (!packageArgs.isEmpty()) {
                for (String packageName : packageArgs) {
                    if (options.listAppsMode) {
                        emitApp(pm, packageName);
                    } else {
                        extractIcon(pm, packageName, options);
                    }
                }
            } else {
                List<ApplicationInfo> apps = pm.getInstalledApplications(0);
                for (ApplicationInfo app : apps) {
                    if ((app.flags & ApplicationInfo.FLAG_SYSTEM) == 0) {
                        if (options.listAppsMode) {
                            emitApp(pm, app.packageName);
                        } else {
                            extractIcon(pm, app.packageName, options);
                        }
                    }
                }
            }

            System.out.println("DONE");
            System.out.flush();
        } catch (Throwable t) {
            System.out.println("FATAL:" + t.getMessage());
            System.out.flush();
        }
    }

    private static void extractIcon(PackageManager pm, String packageName, IconExtractorOptions options) {
        try {
            ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
            String label = readSanitizedLabel(pm, appInfo, packageName);

            Drawable icon = DrawableStateUtils.resolveApplicationIcon(pm, packageName, appInfo, options.preferRound);
            DrawableStateUtils.applyLauncherLikeState(icon);

            if (options.svgModelMode) {
                DrawableStateUtils.ensureDrawableBounds(icon);
                String encodedModel = Base64.encodeToString(
                    DrawableModelSerializer.drawableToModelJson(
                        icon,
                        options.debugVectorMode,
                        options.preferMonochrome
                    ).getBytes(StandardCharsets.UTF_8),
                    Base64.NO_WRAP
                );
                System.out.println("MODEL:" + packageName + ":" + label + ":" + encodedModel);
            } else if (icon instanceof AdaptiveIconDrawable) {
                AdaptiveIconDrawable adaptive = (AdaptiveIconDrawable) icon;
                String fgBase64 = DrawableRasterizer.drawableToPngBase64(adaptive.getForeground(), true);
                String bgBase64 = DrawableRasterizer.drawableToPngBase64(adaptive.getBackground(), true);
                System.out.println("ADAPTIVE:" + packageName + ":" + label + ":" + fgBase64 + ":" + bgBase64);
            } else {
                String base64 = DrawableRasterizer.drawableToPngBase64(icon, true);
                System.out.println("ICON:" + packageName + ":" + label + ":" + base64);
            }

            System.out.flush();
        } catch (PackageManager.NameNotFoundException e) {
            System.out.println("ERROR:" + packageName + ":not_found");
            System.out.flush();
        } catch (Throwable t) {
            System.out.println("ERROR:" + packageName + ":" + t.getClass().getSimpleName());
            System.out.flush();
        }
    }

    private static void emitApp(PackageManager pm, String packageName) {
        try {
            ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
            String label = readSanitizedLabel(pm, appInfo, packageName);
            System.out.println("APP:" + packageName + ":" + label);
            System.out.flush();
        } catch (PackageManager.NameNotFoundException e) {
            System.out.println("ERROR:" + packageName + ":not_found");
            System.out.flush();
        } catch (Throwable t) {
            System.out.println("ERROR:" + packageName + ":" + t.getClass().getSimpleName());
            System.out.flush();
        }
    }

    private static String readSanitizedLabel(PackageManager pm, ApplicationInfo appInfo, String packageName) {
        CharSequence labelCs = pm.getApplicationLabel(appInfo);
        String label = (labelCs != null) ? labelCs.toString() : packageName;
        return DrawableStateUtils.sanitizeLabel(label);
    }
}
