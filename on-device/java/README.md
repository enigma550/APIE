# On-Device Java Layout

`src/` contains the real on-device runtime sources compiled into `icon_extractor.dex`.
- build with `bun run build:dex`
- verify with `bun run build:dex:verify`

`dev-stubs/` contains dev-only Android API stubs for two cases:
- IDE/source indexing without a local `android.jar`
- explicit stub builds via `bun run build:dex:stubs`

Conventions:
- treat `src/` as the only runtime source set
- treat `dev-stubs/` as editor/build fallback only
- prefer real `android.jar` or pulled `framework.jar` for normal builds
- workspace-root `.classpath`, `.project`, and `.settings/org.eclipse.jdt.core.prefs` define the Java source set for VS Code JDT
- `.vscode/settings.json` mirrors the same source roots for editors that rely on workspace settings
