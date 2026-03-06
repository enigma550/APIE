import { expect, test } from "bun:test";
import { buildAppListCommand, parseAppLine } from "./protocol";

test("buildAppListCommand emits list-apps flag", () => {
    expect(buildAppListCommand([])).toContain("--list-apps");
    expect(buildAppListCommand(["com.example.app"])).toContain("--list-apps com.example.app");
});

test("parseAppLine returns package and label", () => {
    expect(parseAppLine("APP:com.example.app:Example App")).toEqual({
        packageName: "com.example.app",
        label: "Example App"
    });
});
