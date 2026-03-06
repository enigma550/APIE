function isDebugEnabled(): boolean {
    const value = process.env.APIE_DEBUG?.trim().toLowerCase();
    return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function createLogger(scope: string) {
    const prefix = `[${scope}]`;

    return {
        debug(message: string) {
            if (isDebugEnabled()) {
                console.debug(`${prefix} ${message}`);
            }
        },
        info(message: string) {
            console.log(`${prefix} ${message}`);
        },
        warn(message: string) {
            console.warn(`${prefix} ${message}`);
        },
        error(message: string) {
            console.error(`${prefix} ${message}`);
        }
    };
}
