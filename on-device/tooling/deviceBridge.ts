import { AdbServerNodeTcpConnector } from "@yume-chan/adb-server-node-tcp";
import { Adb, AdbDaemonTransport, AdbServerClient } from "@yume-chan/adb";
import type { AdbCredentialStore } from "@yume-chan/adb";
import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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

export async function pullFileViaDeviceBridge(remotePath: string): Promise<Uint8Array> {
    return withConnectedDevice(async (adb) => {
        const sync = await (adb as any).sync();

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
    });
}

export async function pushFileViaDeviceBridge(localPath: string, remotePath: string): Promise<void> {
    await withConnectedDevice(async (adb) => {
        const sync = await (adb as any).sync();

        try {
            const fileData = await Bun.file(localPath).arrayBuffer();
            const content = new Uint8Array(fileData);
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
        } finally {
            await sync.dispose();
        }
    });
}

export async function runShellCommandViaDeviceBridge(command: string): Promise<string> {
    return withConnectedDevice(async (adb) => {
        const output = await (adb as any).subprocess.noneProtocol.spawnWaitText(command);
        return output.trim();
    });
}

async function withConnectedDevice<T>(fn: (adb: Adb) => Promise<T>): Promise<T> {
    let cleanup: (() => Promise<void>) | null = null;
    let adb: Adb | null = null;

    try {
        const connected = await connectToDevice();
        adb = connected.adb;
        cleanup = connected.cleanup;
        return await fn(adb);
    } finally {
        if (adb) {
            try {
                await adb.close();
            } catch {
            }
        }
        if (cleanup) {
            try {
                await cleanup();
            } catch {
            }
        }
    }
}

async function connectToDevice(): Promise<{ adb: Adb; cleanup: () => Promise<void> }> {
    try {
        const connection = new AdbServerNodeTcpConnector({ host: "127.0.0.1", port: 5037 });
        const client = new AdbServerClient(connection);
        const devices = await client.getDevices();
        if (devices.length === 0) {
            throw new Error("No ADB devices connected.");
        }
        const transport = await client.createTransport(devices[0]!);
        return {
            adb: new Adb(transport),
            cleanup: async () => {}
        };
    } catch {
        return connectViaWebUsb();
    }
}

async function connectViaWebUsb(): Promise<{ adb: Adb; cleanup: () => Promise<void> }> {
    const [{ webusb }, { AdbDaemonWebUsbDeviceManager }] = await Promise.all([
        import("usb"),
        import("@yume-chan/adb-daemon-webusb")
    ]);

    const trackedManager = createTrackedUsbManager(webusb);
    const manager = new AdbDaemonWebUsbDeviceManager(trackedManager.usbManager);
    const knownDevices = await manager.getDevices();
    const requestDevice = knownDevices[0] ?? await manager.requestDevice();
    if (!requestDevice) {
        await trackedManager.cleanup();
        throw new Error(
            "No Android device available via the built-in device bridge. Connect an Android device with USB debugging enabled and authorize this host."
        );
    }

    try {
        const rawDevice = (requestDevice as any).raw;
        if (rawDevice && rawDevice.device) {
            rawDevice.device.setAutoDetachKernelDriver(true);
        }
    } catch {
    }

    const connection = await connectWebUsbDeviceWithRetry(requestDevice);
    const transport = await AdbDaemonTransport.authenticate({
        serial: requestDevice.serial,
        connection,
        credentialStore: new NodeCredentialStore()
    });

    return {
        adb: new Adb(transport),
        cleanup: async () => {
            await trackedManager.cleanup();
            try {
                if ((requestDevice as any).raw?.opened) {
                    await (requestDevice as any).raw.close();
                }
            } catch {
            }
        }
    };
}

async function connectWebUsbDeviceWithRetry(requestDevice: any): Promise<any> {
    let retriesRemaining = 2;

    while (true) {
        try {
            return await requestDevice.connect();
        } catch (error) {
            if (!String(error).includes("LIBUSB_ERROR_BUSY")) {
                throw error;
            }

            if (retriesRemaining === 0) {
                throw new Error("Failed connecting via WebUSB. Device is busy.");
            }

            await new Promise(resolve => setTimeout(resolve, 1500));
            retriesRemaining -= 1;
        }
    }
}

function createTrackedUsbManager(usbManager: any): {
    usbManager: any;
    cleanup: () => Promise<void>;
} {
    const listeners: Array<{ type: string; listener: any; options: any; }> = [];

    return {
        usbManager: new Proxy(usbManager, {
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
        }),
        cleanup: async () => {
            while (listeners.length > 0) {
                const entry = listeners.pop()!;
                try {
                    usbManager.removeEventListener(entry.type, entry.listener, entry.options);
                } catch {
                }
            }
        }
    };
}
