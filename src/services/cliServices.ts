import { unzip } from "unzipit";

// Facade for CLI tools
export class CommandService {
    public async run(commandArgs: string[]): Promise<string> {
        const processInstance = Bun.spawn(commandArgs, { stdout: "pipe", stderr: "pipe" });
        const textOutput = await new Response(processInstance.stdout).text();
        const exitCode = await processInstance.exited;
        if (exitCode !== 0) {
            const errorText = await new Response(processInstance.stderr).text();
            throw new Error(`Command failed: ${commandArgs.join(" ")} - ${errorText}`);
        }
        return textOutput.trim();
    }

    public async runAndGetBuffer(commandArgs: string[]): Promise<ArrayBuffer> {
        const processInstance = Bun.spawn(commandArgs, { stdout: "pipe" });
        return await new Response(processInstance.stdout).arrayBuffer();
    }
}

// Service for ADB commands
export class AdbService {
    constructor(private readonly commandService: CommandService) { }

    public async getThirdPartyPackages(): Promise<string[]> {
        const rawPackages = await this.commandService.run(["adb", "shell", "pm", "list", "packages", "-3"]);
        return rawPackages.split("\n").map(l => l.replace("package:", "").trim()).filter(Boolean);
    }

    public async getDevicePaths(packageName: string): Promise<string[]> {
        const output = await this.commandService.run(["adb", "shell", "pm", "path", packageName]);
        return output.split("\n").map(p => p.replace("package:", "").trim()).filter(Boolean);
    }

    public async pullFile(remotePath: string, localPath: string): Promise<void> {
        await this.commandService.run(["adb", "pull", remotePath, localPath]);
    }
}

// Service for AAPT2 commands
export class Aapt2Service {
    private resourceCache = new Map<string, string[]>();
    private xmlCache = new Map<string, string>();
    private badgingCache = new Map<string, string>();

    constructor(
        private readonly commandService: CommandService,
        private readonly unzipService: UnzipService // Injecting UnzipService to verify files
    ) { }

    public async dumpResourcesLines(apkPath: string): Promise<string[]> {
        if (this.resourceCache.has(apkPath)) return this.resourceCache.get(apkPath)!;

        const output = await this.commandService.run(["aapt2", "dump", "resources", apkPath]);
        const lines = output.split("\n");
        this.resourceCache.set(apkPath, lines);
        return lines;
    }

    public async dumpXmlTree(apkPath: string, internalPath: string): Promise<string> {
        const cacheKey = `${apkPath}|${internalPath}`;
        if (this.xmlCache.has(cacheKey)) return this.xmlCache.get(cacheKey)!;

        // Prevent expensive OS process spawns if the file doesn't exist in this ZIP split
        const fileExists = await this.unzipService.hasFile(apkPath, internalPath);
        if (!fileExists) {
            throw new Error(`Skip aapt2 spawn: File not found in zip ${internalPath}`);
        }

        const output = await this.commandService.run(["aapt2", "dump", "xmltree", apkPath, "--file", internalPath]);
        this.xmlCache.set(cacheKey, output);
        return output;
    }

    public async dumpBadging(apkPath: string): Promise<string> {
        if (this.badgingCache.has(apkPath)) return this.badgingCache.get(apkPath)!;

        const output = await this.commandService.run(["aapt2", "dump", "badging", apkPath]);
        this.badgingCache.set(apkPath, output);
        return output;
    }

    public async getAppLabel(apkPath: string, sanitize = false): Promise<string | null> {
        try {
            const badging = await this.dumpBadging(apkPath);
            const match = badging.match(/application-label:'([^']+)'/);
            if (match && match[1]) {
                return sanitize ? match[1].replace(/[/\\?%*:|"<>]/g, '-') : match[1];
            }
            return null;
        } catch {
            return null;
        }
    }

    public clearCacheForApk(apkPath: string) {
        this.resourceCache.delete(apkPath);
        this.badgingCache.delete(apkPath);
        for (const key of this.xmlCache.keys()) {
            if (key.startsWith(apkPath + "|")) {
                this.xmlCache.delete(key);
            }
        }
    }
}

export class BunFileReader {
    private file: ReturnType<typeof Bun.file>;
    private cachedSize: number = -1;

    constructor(filename: string) {
        this.file = Bun.file(filename);
    }

    async getLength(): Promise<number> {
        if (this.cachedSize === -1) {
            this.cachedSize = this.file.size;
        }
        return this.cachedSize;
    }

    async read(offset: number, length: number): Promise<Uint8Array> {
        const slice = this.file.slice(offset, offset + length);
        const buffer = await slice.arrayBuffer();
        return new Uint8Array(buffer);
    }
}

// Service for Unzip commands
export class UnzipService {
    private zipCache = new Map<string, any>();
    private fileBufferCache = new Map<string, ArrayBuffer>(); // Cache for extracted uncompressed data

    constructor(private readonly commandService: CommandService) { }

    private async getZipEntries(apkPath: string) {
        if (this.zipCache.has(apkPath)) {
            return this.zipCache.get(apkPath);
        }
        const reader = new BunFileReader(apkPath);
        const { entries } = await unzip(reader);
        this.zipCache.set(apkPath, entries);
        return entries;
    }

    public async hasFile(apkPath: string, internalPath: string): Promise<boolean> {
        try {
            const entries = await this.getZipEntries(apkPath);
            return !!entries[internalPath];
        } catch {
            return false;
        }
    }

    public async extractFile(apkPath: string, internalPath: string): Promise<ArrayBuffer> {
        if (!apkPath) return new ArrayBuffer(0);

        const cacheKey = `${apkPath}|${internalPath}`;
        if (this.fileBufferCache.has(cacheKey)) return this.fileBufferCache.get(cacheKey)!;

        const entries = await this.getZipEntries(apkPath);
        const entry = entries[internalPath];
        if (!entry) throw new Error(`File not found in zip: ${internalPath}`);

        const buffer = await entry.arrayBuffer();
        this.fileBufferCache.set(cacheKey, buffer);
        return buffer;
    }

    public async listFiles(apkPath: string): Promise<string[]> {
        const entries = await this.getZipEntries(apkPath);
        return Object.keys(entries);
    }

    public async getImageAsBase64(apkFiles: string[], internalPath: string): Promise<string | null> {
        for (const apk of apkFiles) {
            try {
                const imageBuffer = await this.extractFile(apk, internalPath);
                if (imageBuffer.byteLength > 0) {
                    const bytes = new Uint8Array(imageBuffer);
                    let mimeType = "image/png";
                    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) mimeType = "image/webp";
                    else if (bytes[0] === 0xFF && bytes[1] === 0xD8) mimeType = "image/jpeg";
                    return `data:${mimeType};base64,${Buffer.from(imageBuffer).toString("base64")}`;
                }
            } catch {
                // Silently skip if file not found in this specific split
            }
        }
        return null;
    }

    public clearCacheForApk(apkPath: string) {
        this.zipCache.delete(apkPath);
        for (const key of this.fileBufferCache.keys()) {
            if (key.startsWith(apkPath + "|")) {
                this.fileBufferCache.delete(key);
            }
        }
    }
}