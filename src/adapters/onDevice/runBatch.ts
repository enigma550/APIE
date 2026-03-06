import { type RunIconBatchOptions, runIconBatch } from "../../application/icons/runBatch";
import { AdbService } from "../adb/AdbService";
import { FilesystemOutputStore } from "../filesystem/FilesystemOutputStore";
import { OnDeviceIconExtractor } from "./OnDeviceIconExtractor";

export async function runBatchDeviceSvg(options: RunIconBatchOptions = {}) {
    const adb = new AdbService();
    try {
        return await runBatchDeviceSvgWithService(adb, options);
    } finally {
        await adb.close();
    }
}

export async function runBatchDeviceSvgWithService(
    adbService: AdbService,
    options: RunIconBatchOptions = {}
) {
    return runIconBatch(
        new OnDeviceIconExtractor(adbService),
        new FilesystemOutputStore(),
        options
    );
}
