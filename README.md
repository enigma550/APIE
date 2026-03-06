# APIE - Android Adaptive Icon Extractor
A CLI tool and TypeScript library that extracts adaptive Android app icons on-device via ADB or the built-in device bridge/WebUSB.

## Install

```bash
bun install -g github:enigma550/apie
```

Install as a library in another project:

```bash
bun add github:enigma550/apie
```

## Usage

Once installed globally, run:

```bash
apie -w
```

This processes all installed third-party apps on the connected device.

### CLI Options

```text
-h, --help                Show help.
-w, --write               Write output files to disk. Without this, only summary is printed.
--device-package, -dp     Process only one package (default is all apps).
-o, --output              Output directory (Default: ./output).
-f, --format              Output format: <auto|svg|png|webp> (Default: auto).
-s, --shape               Mask shape: <square|circle|squircle|rounded> (Default: square).
--refresh                 Rebuild outputs instead of reusing existing files.
--monochrome              Prefer adaptive icon monochrome layer when present.
--round                   Prefer android:roundIcon when present.
--report-raster           Write raster fallback report JSON.
--report-raster-path      Custom path for raster fallback report JSON.
```

Examples:

```bash
apie -w
apie -w -f svg
apie -w -dp com.whatsapp -f png -o ./output
```

## As a Library

The library API exposes the on-device extraction flow directly.

### Example

```typescript
import {
    Device,
    MaskShape
} from "apie";

const device = new Device();

try {
    const apps = await device.listApps();
    const icons = await device.getIcons(
        apps.map(app => app.packageName),
        { shape: MaskShape.Square }
    );

    const items = apps
        .map(app => ({
            packageName: app.packageName,
            label: app.label,
            icon: icons.get(app.packageName)
        }))
        .filter(item => item.icon);

    console.log(items);
} finally {
    await device.close();
}
```

### API Overview

Simple entrypoints:

- `Device`: connected-device facade with `listApps()`, `getIcons()`, `streamIcons()`, `getIcon()`, and `close()`
- `MaskShape`: icon mask enum for `square`, `circle`, `squircle`, and `rounded`

Other exported pieces:

- `AppEngine`: higher-level batch runner
- `AppCatalog` / `listApps`: app labels by package name
- `IconExtractor` / `extractIcons`: lower-level icon extraction helpers
- `OutputStore`: filesystem output writer

Grouped exports are also available if you want to explore the package in a more structured way:

```typescript
import { adapters, app, core, onDevice, ports } from "apie";
```

Progressive icon loading is also supported:

```typescript
await device.streamIcons(
    apps.map(app => app.packageName),
    { shape: MaskShape.Square },
    ({ packageName, result }) => {
        console.log(packageName, result.svg);
    }
);
```

## Build On-Device DEX (Cross-Platform)

Build `on-device/icon_extractor.dex` on Linux, macOS or Windows:

```bash
bun run build:dex
```

Optional verify on a connected device (push + smoke test):

```bash
bun run build:dex:verify
```

Compile against dev stubs instead of `android.jar` / pulled `framework.jar`:

```bash
bun run build:dex:stubs
```

Build requirements:
- `javac` (JDK 17+)

Notes:
- if Android build-tools (`d8` or `dx`) are missing, the build script can download/install them interactively
- `ANDROID_JAR` is optional; if missing, the build falls back to SDK lookup, on-device framework pull, or dev stubs
- `--verify` requires a connected Android device via the built-in device bridge/WebUSB; optional `adb` is supported but not required
