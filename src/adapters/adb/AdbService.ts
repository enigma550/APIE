import { AdbServerNodeTcpConnector } from "@yume-chan/adb-server-node-tcp";
import { AdbServerClient, Adb, AdbDaemonTransport } from "@yume-chan/adb";
import type { AdbCredentialStore } from "@yume-chan/adb";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";
import { createLogger } from "../../shared";

// Bun polyfills for yume-chan WebStream interactions
if (typeof (globalThis as any).WritableStream !== "undefined") {
    const OriginalWritable = (globalThis as any).WritableStream;
    (globalThis as any).WritableStream = class WritableStreamWithSignal extends OriginalWritable {
        constructor(underlyingSink?: any, strategy?: any) {
            if (underlyingSink && typeof underlyingSink.start === "function") {
                const originalStart = underlyingSink.start;
                underlyingSink.start = (controller: any) => {
                    if (controller && !controller.signal) {
                        const aborter = new AbortController();
                        Object.defineProperty(controller, "signal", {
                            get: () => aborter.signal,
                            enumerable: true
                        });
                    }
                    return originalStart(controller);
                };
            }
            super(underlyingSink, strategy);
        }
    };
}
if (!("USBConnectionEvent" in globalThis)) {
    (globalThis as any).USBConnectionEvent = class extends Event {
        public device: any;
        constructor(type: string, eventInitDict: any) {
            super(type, eventInitDict);
            this.device = eventInitDict.device;
        }
    };
}

class NodeCredentialStore implements AdbCredentialStore {
    private keyPath = join(homedir(), ".android", "apie_adbkey.der");

    async *iterateKeys() {
        if (existsSync(this.keyPath)) {
            const rawBuffer = readFileSync(this.keyPath);
            const array = new Uint8Array(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.length);
            yield { buffer: array, name: "apie@host" } as any;
        }
    }

    async generateKey(): Promise<any> {
        const webCrypto = crypto.webcrypto;
        const { privateKey: cryptoKey } = await webCrypto.subtle.generateKey({
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: "SHA-1",
        }, true, ["sign"]);

        const privateKeyBuffer = await webCrypto.subtle.exportKey("pkcs8", cryptoKey);
        const privateKey = new Uint8Array(privateKeyBuffer);

        const dir = join(homedir(), ".android");
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

        writeFileSync(this.keyPath, privateKey);
        return { buffer: privateKey, name: "apie@host" };
    }
}
// Service for ADB commands using @yume-chan/adb
export class AdbService {
    private readonly logger = createLogger("AdbService");
    private adbPromise: Promise<Adb> | null = null;
    private transportCleanup: (() => Promise<void>) | null = null;

    constructor() { }

    private async getAdb(): Promise<Adb> {
        if (this.adbPromise) return this.adbPromise;
        this.adbPromise = (async () => {
            try {
                const connection = new AdbServerNodeTcpConnector({ host: "127.0.0.1", port: 5037 });
                const client = new AdbServerClient(connection);
                const devices = await client.getDevices();
                if (devices.length === 0) throw new Error("No ADB devices connected. Is your device plugged in with USB debugging enabled?");
                const transport = await client.createTransport(devices[0]!);
                return new Adb(transport);
            } catch (e: any) {
                if (e.code === 'ECONNREFUSED' || (e.message && e.message.includes('ECONNREFUSED'))) {
                    this.logger.debug("ADB daemon is not running. Falling back to native WebUSB connection.");
                    return await this.connectWebUsb();
                }
                throw e;
            }
        })().catch((error) => {
            this.adbPromise = null;
            throw error;
        });
        return this.adbPromise;
    }

    public async close(): Promise<void> {
        const adbPromise = this.adbPromise;
        const transportCleanup = this.transportCleanup;
        this.adbPromise = null;
        this.transportCleanup = null;
        if (!adbPromise) {
            if (transportCleanup) {
                await transportCleanup();
            }
            return;
        }

        try {
            const adb = await adbPromise;
            await adb.close();
        } catch {
            // Ignore close-time errors; the goal is to release any held transport.
        }
        if (transportCleanup) {
            try {
                await transportCleanup();
            } catch {
                // Ignore best-effort cleanup errors.
            }
        }
    }

    private async connectWebUsb(): Promise<Adb> {
        const [{ webusb }, { AdbDaemonWebUsbDeviceManager }] = await Promise.all([
            import("usb"),
            import("@yume-chan/adb-daemon-webusb")
        ]);
        const { usbManager: trackedWebUsb, cleanup } = this.createTrackedUsbManager(webusb);
        const manager = new AdbDaemonWebUsbDeviceManager(trackedWebUsb);
        const requestDevice = await manager.requestDevice();
        if (!requestDevice) throw new Error("No ADB devices connected via Native WebUSB. Is your device plugged in with USB debugging enabled?");

        try {
            const rawDevice = (requestDevice as any).raw;
            if (rawDevice && rawDevice.device) {
                rawDevice.device.setAutoDetachKernelDriver(true);
            }
        } catch { }

        let connection;
        let retriesRemaining = 2;
        while (retriesRemaining >= 0) {
            try {
                connection = await requestDevice.connect();
                break;
            } catch (error: any) {
                if (String(error).includes("LIBUSB_ERROR_BUSY")) {
                    const lockOwner = await this.findUsbLockOwner(requestDevice);
                    if (lockOwner) {
                        throw new Error(`Failed connecting via WebUSB. USB device ${lockOwner.devicePath} is busy (locked by ${lockOwner.command} PID ${lockOwner.pid}).`);
                    }

                    if (retriesRemaining === 0) {
                        throw new Error("Failed connecting via WebUSB. Device is busy and the lock owner could not be identified.");
                    }

                    this.logger.debug(`Device busy, retrying in 2 seconds... (${retriesRemaining} retries left, lock owner unknown)`);
                    await new Promise(r => setTimeout(r, 2000));
                    retriesRemaining--;
                } else {
                    throw error;
                }
            }
        }

        this.logger.info("Physical connection opened. If requested, accept the RSA key fingerprint on your phone's screen.");

        const store = new NodeCredentialStore();
        try {
            const transport = await AdbDaemonTransport.authenticate({
                serial: requestDevice.serial,
                connection: connection as NonNullable<typeof connection>,
                credentialStore: store
            });

            this.transportCleanup = async () => {
                await cleanup();
                try {
                    if ((requestDevice as any).raw?.opened) {
                        await (requestDevice as any).raw.close();
                    }
                } catch {
                    // Best effort only.
                }
            };

            return new Adb(transport);
        } catch (error) {
            await cleanup();
            throw error;
        }
    }

    private async executeShellCommand(command: string): Promise<string> {
        const adb = (await this.getAdb()) as any;
        const output = await adb.subprocess.noneProtocol.spawnWaitText(command);
        return output.trim();
    }

    private async streamShellCommand(
        command: string,
        onLine: (line: string) => void | Promise<void>
    ): Promise<void> {
        const adb = (await this.getAdb()) as any;
        const process = await adb.subprocess.noneProtocol.spawn(command);
        const output = process.output as ReadableStream<Uint8Array>;
        const reader = output.getReader();
        const decoder = new TextDecoder();
        let buffered = "";

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                buffered += decoder.decode(value, { stream: true });
                while (true) {
                    const newlineIndex = buffered.indexOf("\n");
                    if (newlineIndex === -1) {
                        break;
                    }

                    const line = buffered.slice(0, newlineIndex).trim();
                    buffered = buffered.slice(newlineIndex + 1);
                    if (line.length > 0) {
                        await onLine(line);
                    }
                }
            }

            buffered += decoder.decode();
            const finalLine = buffered.trim();
            if (finalLine.length > 0) {
                await onLine(finalLine);
            }

            await process.exited;
        } finally {
            reader.releaseLock();
        }
    }

    public async pushFile(localPath: string, remotePath: string): Promise<void> {
        const adb = (await this.getAdb()) as any;
        const sync = await adb.sync();
        const fileData = await Bun.file(localPath).arrayBuffer();
        const content = new Uint8Array(fileData);

        // Create a ReadableStream from the file data, as required by ADB sync push API
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(content);
                controller.close();
            }
        });

        await sync.write({
            filename: remotePath,
            file: stream,
        });
        await sync.dispose();
    }

    public async pullFile(remotePath: string): Promise<Uint8Array> {
        const adb = (await this.getAdb()) as any;
        const sync = await adb.sync();

        try {
            const stream = sync.read(remotePath) as ReadableStream<Uint8Array>;
            const reader = stream.getReader();
            const chunks: Uint8Array[] = [];
            let totalLength = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                if (value) {
                    chunks.push(value);
                    totalLength += value.byteLength;
                }
            }

            const result = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.byteLength;
            }

            return result;
        } finally {
            await sync.dispose();
        }
    }

    public async listPackages(thirdPartyOnly = false): Promise<string[]> {
        const command = thirdPartyOnly ? "pm list packages -3" : "pm list packages";
        const output = await this.executeShellCommand(command);

        return output
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.startsWith("package:"))
            .map(line => line.slice("package:".length))
            .filter(Boolean);
    }

    public async getPackageApkPaths(packageName: string): Promise<string[]> {
        const output = await this.executeShellCommand(`pm path ${packageName}`);

        return output
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.startsWith("package:"))
            .map(line => line.slice("package:".length))
            .filter(Boolean);
    }

    public async pullPackageApksToTemp(packageName: string): Promise<{
        packageName: string;
        baseApkPath: string;
        splitApkPaths: string[];
        remotePaths: string[];
    }> {
        const remotePaths = await this.getPackageApkPaths(packageName);
        if (remotePaths.length === 0) {
            throw new Error(`No APK paths found for package '${packageName}'.`);
        }

        const sanitizedPackageName = packageName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const localPaths: string[] = [];

        for (const [index, remotePath] of remotePaths.entries()) {
            const bytes = await this.pullFile(remotePath);
            const suffix = index === 0 ? "base" : `split-${index}`;
            const localPath = `/tmp/apie-${sanitizedPackageName}-${suffix}.apk`;
            await Bun.write(localPath, bytes);
            localPaths.push(localPath);
        }

        const baseApkPath = localPaths[0];
        if (!baseApkPath) {
            throw new Error(`Failed to pull base APK for package '${packageName}'.`);
        }

        return {
            packageName,
            baseApkPath,
            splitApkPaths: localPaths.slice(1),
            remotePaths
        };
    }

    public async pullSystemFrameworkApksToTemp(): Promise<string[]> {
        const discoveredFrameworkPaths = await this.getPackageApkPaths("android").catch(() => []);
        const remotePaths = Array.from(new Set([
            ...discoveredFrameworkPaths,
            "/system/framework/framework-res.apk",
            "/system/system_ext/framework/framework-res.apk",
            "/system/product/framework/framework-res.apk",
            "/system_ext/framework/framework-res.apk",
            "/product/framework/framework-res.apk",
            "/vendor/framework/framework-res.apk",
            "/odm/framework/framework-res.apk"
        ]));
        const localPaths: string[] = [];

        for (const [index, remotePath] of remotePaths.entries()) {
            try {
                const bytes = await this.pullFile(remotePath);
                const localPath = `/tmp/apie-framework-res-${index}.apk`;
                await Bun.write(localPath, bytes);
                localPaths.push(localPath);
            } catch {
                continue;
            }
        }

        return localPaths;
    }

    public async runShellCommand(command: string): Promise<string> {
        return await this.executeShellCommand(command);
    }

    public async runShellCommandStreaming(
        command: string,
        onLine: (line: string) => void | Promise<void>
    ): Promise<void> {
        await this.streamShellCommand(command, onLine);
    }

    private async findUsbLockOwner(requestDevice: any): Promise<{ pid: string; command: string; devicePath: string; } | null> {
        const raw = requestDevice?.raw?.device ?? requestDevice?.raw ?? null;
        const busNumber = raw?.busNumber;
        const deviceAddress = raw?.deviceAddress;
        if (!Number.isInteger(busNumber) || !Number.isInteger(deviceAddress)) {
            return null;
        }

        const devicePath = `/dev/bus/usb/${String(busNumber).padStart(3, "0")}/${String(deviceAddress).padStart(3, "0")}`;
        const fuserOutput = await this.runLocalCommand(["fuser", devicePath]);
        if (!fuserOutput) {
            return null;
        }

        const pid = fuserOutput.split(/\s+/).find(token => /^\d+$/.test(token));
        if (!pid) {
            return null;
        }
        if (Number.parseInt(pid, 10) === process.pid) {
            return null;
        }

        const command = (await this.runLocalCommand(["ps", "-p", pid, "-o", "comm="]))?.trim() || "unknown";
        return {
            pid,
            command,
            devicePath
        };
    }

    private async runLocalCommand(command: string[]): Promise<string | null> {
        try {
            const proc = Bun.spawn(command, {
                stdout: "pipe",
                stderr: "pipe"
            });
            const [stdout, stderr, exitCode] = await Promise.all([
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text(),
                proc.exited
            ]);
            if (exitCode !== 0 && !stdout.trim()) {
                return null;
            }
            return (stdout || stderr).trim() || null;
        } catch {
            return null;
        }
    }

    private createTrackedUsbManager(usbManager: any): {
        usbManager: any;
        cleanup: () => Promise<void>;
    } {
        const listeners: Array<{ type: string; listener: any; options: any; }> = [];

        const trackedUsbManager = new Proxy(usbManager, {
            get(target, property, receiver) {
                if (property === "addEventListener") {
                    return (type: string, listener: any, options?: any) => {
                        listeners.push({ type, listener, options });
                        return target.addEventListener(type, listener, options);
                    };
                }

                if (property === "removeEventListener") {
                    return (type: string, listener: any, options?: any) => {
                        const index = listeners.findIndex(entry => entry.type === type && entry.listener === listener);
                        if (index !== -1) {
                            listeners.splice(index, 1);
                        }
                        return target.removeEventListener(type, listener, options);
                    };
                }

                const value = Reflect.get(target, property, receiver);
                return typeof value === "function" ? value.bind(target) : value;
            }
        });

        return {
            usbManager: trackedUsbManager,
            cleanup: async () => {
                while (listeners.length > 0) {
                    const entry = listeners.pop()!;
                    try {
                        usbManager.removeEventListener(entry.type, entry.listener, entry.options);
                    } catch {
                        // Ignore best-effort cleanup failures.
                    }
                }
            }
        };
    }
}
