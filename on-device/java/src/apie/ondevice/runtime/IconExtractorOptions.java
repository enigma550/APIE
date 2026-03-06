package apie.ondevice.runtime;

import java.util.ArrayList;
import java.util.List;

public final class IconExtractorOptions {
    public static final String MODEL_FLAG = "--svg-model";
    public static final String LIST_APPS_FLAG = "--list-apps";
    public static final String DEBUG_VECTOR_FLAG = "--debug-vector";
    public static final String PREFER_MONOCHROME_FLAG = "--prefer-monochrome";
    public static final String PREFER_ROUND_FLAG = "--prefer-round";

    public final boolean svgModelMode;
    public final boolean listAppsMode;
    public final boolean debugVectorMode;
    public final boolean preferMonochrome;
    public final boolean preferRound;
    public final List<String> packageArgs;

    private IconExtractorOptions(
        boolean svgModelMode,
        boolean listAppsMode,
        boolean debugVectorMode,
        boolean preferMonochrome,
        boolean preferRound,
        List<String> packageArgs
    ) {
        this.svgModelMode = svgModelMode;
        this.listAppsMode = listAppsMode;
        this.debugVectorMode = debugVectorMode;
        this.preferMonochrome = preferMonochrome;
        this.preferRound = preferRound;
        this.packageArgs = List.copyOf(packageArgs);
    }

    public static IconExtractorOptions parse(String[] args) {
        boolean svgModelMode = false;
        boolean listAppsMode = false;
        boolean debugVectorMode = false;
        boolean preferMonochrome = false;
        boolean preferRound = false;
        List<String> packageArgs = new ArrayList<>();

        for (String arg : args) {
            if (MODEL_FLAG.equals(arg)) {
                svgModelMode = true;
                continue;
            }
            if (LIST_APPS_FLAG.equals(arg)) {
                listAppsMode = true;
                continue;
            }
            if (DEBUG_VECTOR_FLAG.equals(arg)) {
                debugVectorMode = true;
                continue;
            }
            if (PREFER_MONOCHROME_FLAG.equals(arg)) {
                preferMonochrome = true;
                continue;
            }
            if (PREFER_ROUND_FLAG.equals(arg)) {
                preferRound = true;
                continue;
            }
            packageArgs.add(arg);
        }

        if (!svgModelMode) {
            debugVectorMode = false;
        }

        return new IconExtractorOptions(
            svgModelMode,
            listAppsMode,
            debugVectorMode,
            preferMonochrome,
            preferRound,
            packageArgs
        );
    }
}
