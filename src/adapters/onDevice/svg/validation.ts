import type { DeviceDrawableModel } from "./types";

export function getUnusableDeviceModelReason(node: DeviceDrawableModel): string | null {
    return getIncompleteVectorReason(node);
}

function getIncompleteVectorReason(node: DeviceDrawableModel): string | null {
    if (node.kind === "vector") {
        if (!hasRenderableDescendant(node.children)) {
            return "Vector node has no renderable descendants.";
        }
        const viewportWidth = node.viewportWidth ?? 0;
        const viewportHeight = node.viewportHeight ?? 0;
        if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) {
            return `Vector viewport is invalid (${node.viewportWidth}x${node.viewportHeight}).`;
        }
    }

    if (node.kind === "group") {
        const translateX = node.translateX ?? 0;
        const translateY = node.translateY ?? 0;
        const scaleX = node.scaleX ?? 1;
        const scaleY = node.scaleY ?? 1;
        const pivotX = node.pivotX ?? 0;
        const pivotY = node.pivotY ?? 0;
        const rotate = node.rotate ?? 0;
        if (
            !Number.isFinite(translateX)
            || !Number.isFinite(translateY)
            || !Number.isFinite(scaleX)
            || !Number.isFinite(scaleY)
            || !Number.isFinite(pivotX)
            || !Number.isFinite(pivotY)
            || !Number.isFinite(rotate)
        ) {
            return "Group transform contains non-finite values.";
        }
    }

    if (node.kind === "path" && (!node.pathData || node.pathData.trim().length === 0)) {
        return "Path node has empty pathData.";
    }

    if ("children" in node && Array.isArray(node.children)) {
        for (const child of node.children) {
            const childReason = getIncompleteVectorReason(child);
            if (childReason) {
                return childReason;
            }
        }
    }

    return null;
}

function hasRenderableDescendant(children: DeviceDrawableModel[]): boolean {
    for (const child of children) {
        if (child.kind === "path" || child.kind === "solid" || child.kind === "image") {
            return true;
        }

        if ("children" in child && Array.isArray(child.children) && hasRenderableDescendant(child.children)) {
            return true;
        }
    }

    return false;
}
