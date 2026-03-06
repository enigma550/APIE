const UNSAFE_FILENAME_CHARS = ['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'] as const;

export function sanitizeFilename(name: string): string {
    let result = "";
    for (const ch of name) {
        result += (UNSAFE_FILENAME_CHARS as readonly string[]).includes(ch) ? "-" : ch;
    }
    return result;
}
