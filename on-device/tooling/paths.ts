import { join } from "node:path";

const ROOT_DIR = join(import.meta.dir, "..");

export const ON_DEVICE_ROOT = ROOT_DIR;
export const JAVA_SOURCE_DIR = join(ROOT_DIR, "java", "src");
export const JAVA_DEV_STUBS_DIR = join(ROOT_DIR, "java", "dev-stubs");
export const BUILD_ROOT = join(ROOT_DIR, ".build");
export const BUILD_CLASSES_DIR = join(BUILD_ROOT, "classes");
export const CACHE_ROOT = join(ROOT_DIR, ".cache");
export const FRAMEWORK_CACHE_JAR = join(CACHE_ROOT, "framework.jar");
export const OUTPUT_DEX_PATH = join(ROOT_DIR, "icon_extractor.dex");
export const REMOTE_DEX_PATH = "/data/local/tmp/icon_extractor.dex";
