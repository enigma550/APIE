import { spawnSync } from "node:child_process";

export interface RunOptions {
    cwd?: string;
    allowFailure?: boolean;
    env?: Record<string, string | undefined>;
    stdinText?: string;
}

export interface RunResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

const IS_WINDOWS = process.platform === "win32";

export function executableVariants(name: string): string[] {
    if (!IS_WINDOWS) {
        return [name];
    }

    if (name.endsWith(".exe") || name.endsWith(".bat") || name.endsWith(".cmd")) {
        return [name];
    }

    return [name, `${name}.exe`, `${name}.bat`, `${name}.cmd`];
}

export function run(command: string, args: string[], options: RunOptions = {}): void {
    const result = runCapture(command, args, options);
    if (result.exitCode !== 0 && !options.allowFailure) {
        throw new Error(`Command failed (${result.exitCode}): ${command} ${args.join(" ")}`);
    }
}

export function runCapture(command: string, args: string[], options: RunOptions = {}): RunResult {
    const isBatchScript = command.endsWith(".bat") || command.endsWith(".cmd");
    const proc = isBatchScript
        ? spawnSync("cmd", ["/c", command, ...args], {
            cwd: options.cwd,
            env: { ...process.env, ...options.env },
            input: options.stdinText,
            encoding: "utf8"
        })
        : spawnSync(command, args, {
            cwd: options.cwd,
            env: { ...process.env, ...options.env },
            input: options.stdinText,
            encoding: "utf8"
        });

    const stdout = proc.stdout ?? "";
    const stderr = proc.stderr ?? "";

    if (proc.status !== 0 && !options.allowFailure) {
        process.stdout.write(stdout);
        process.stderr.write(stderr);
    }

    return {
        stdout,
        stderr,
        exitCode: proc.status ?? 0
    };
}

export function commandExists(command: string): boolean {
    const proc = Bun.spawnSync({
        cmd: IS_WINDOWS ? ["cmd", "/c", "where", command] : ["which", command],
        stdout: "ignore",
        stderr: "ignore"
    });
    return proc.exitCode === 0;
}

export function findInPath(baseName: string): string | null {
    for (const variant of executableVariants(baseName)) {
        if (commandExists(variant)) {
            return variant;
        }
    }
    return null;
}
