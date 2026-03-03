import type { IconResult } from "../../types";

export interface IconStrategy {
    execute(packageName: string, localApks: string[], primaryIconEntry?: string): Promise<IconResult | null>;
}