# APIE - Android Adaptive Icon Extractor
A CLI tool and TypeScript library designed to extract app icons directly from Android APKs.

## Install

```bash
bun install -g github:enigma550/apie
```

## Usage

Once installed globally, you can run the tool from your terminal using the `apie` command.

```bash
apie [options]
```
```
Options:
-h, --help       Show the help menu.

-w, --write      Write the extracted icons to disk.

-o, --output     Specify a custom output directory (e.g., -o ./icons) (Default: ./output).

-f, --format     Force a specific output format: <png|svg|webp> (Default: native format).

-s, --shape      Mask shape for icons: <square|circle|squircle|rounded> (Default: square).

-c, --concurrency Concurrency limits (e.g., -c 4) (Default: 8).
```

## As a Library

You can also use this tool programmatically inside your own TypeScript/Bun projects. The package exports the core extraction engine and necessary services.

### Example

```typescript
import { 
    ApkIconExtractor, 
    Aapt2Service, 
    UnzipService, 
    CommandService, 
    IconResolver 
} from "apie";

async function extractMyIcon() {
    // 1. Initialize core CLI and file services
    const commandService = new CommandService();
    const unzipService = new UnzipService(commandService);
    const aapt2Service = new Aapt2Service(commandService, unzipService);
    const iconResolver = new IconResolver(aapt2Service);

    // 2. Initialize the extractor with your desired mask shape
    // Shapes can be: "square", "circle", "squircle", or "rounded"
    const extractor = new ApkIconExtractor(
        aapt2Service, 
        unzipService, 
        iconResolver, 
        "squircle" as any // Optional: Cast to MaskShape if using strict types
    );

    const engineConfig = {
        maskShape: "squircle" as any,
        writeToDisk: false,
        targetFormat: "native" as any,
        maxConcurrentTasks: 4 // Optional: Limit concurrent APK processing
    };

    const packageName = "com.example.app";
    
    // Provide local paths to the downloaded base APK and any relevant split APKs
    const localApkPaths = [
        "./temp/base.apk", 
        "./temp/split_config.xxhdpi.apk"
    ];

    try {
        // 3. Get the app's genuine label, using the sanitize flag to make it safe for file systems
        const safeAppLabel = await aapt2Service.getAppLabel(localApkPaths[0], true) || packageName;

        // 4. Extract the icon
        const iconResult = await extractor.extractIcon(packageName, localApkPaths);

        if (iconResult) {
            console.log(`Successfully extracted icon for ${safeAppLabel}! MimeType: ${iconResult.mimeType}`);
            
            // The result.buffer contains the raw image data (PNG or SVG)
            // Example: writing it to disk using Bun
            // await Bun.write(`./${safeAppLabel}_icon.png`, iconResult.buffer);
        } else {
            console.log(`Could not resolve an icon for ${safeAppLabel}.`);
        }
    } finally {
        // Optional: Clear caches if you are processing many APKs in a loop
        for (const apk of localApkPaths) {
            aapt2Service.clearCacheForApk(apk);
            unzipService.clearCacheForApk(apk);
        }
    }
}

extractMyIcon();
```

## Requirements:
This tool relies on the Android SDK build tools to extract information and assets from APK files. You must have **ADB** and **AAPT2** installed and available in your system's `PATH`.

### 1. ADB (Android Debug Bridge)

1. Download: [Android SDK Platform-Tools](https://developer.android.com/studio/releases/platform-tools)
2. Extract the ZIP and add the `platform-tools` folder to your system's `PATH` environment variable.


### 2. AAPT2 (Android Asset Packaging Tool)
1. Go to Google's Maven repository: https://maven.google.com/web/index.html#com.android.tools.build:aapt2.
2. Find the latest version (e.g., `9.0.1-14304508`).
3. Download the `.jar` file for your OS using this URL structure:
   `https://dl.google.com/dl/android/maven2/com/android/tools/build/aapt2/<version>/aapt2-<version>-[windows | linux | osx].jar`

   *(Example for Windows: `https://dl.google.com/dl/android/maven2/com/android/tools/build/aapt2/9.0.1-14304508/aapt2-9.0.1-14304508-windows.jar`)*
4. Extract the downloaded `.jar` file (it functions like a ZIP archive).
5. Locate the `aapt2` executable inside and add its folder to your system's `PATH`.