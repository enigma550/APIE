import { type AdbService } from "../adb/AdbService";
import { DEX_PATH, REMOTE_DEX_PATH } from "./svg/constants";

const preparedServices = new WeakSet<AdbService>();

export async function ensureOnDeviceDexPrepared(adbService: AdbService): Promise<void> {
    if (preparedServices.has(adbService)) {
        return;
    }

    await adbService.pushFile(DEX_PATH, REMOTE_DEX_PATH);
    preparedServices.add(adbService);
}
