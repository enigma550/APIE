import type { DeviceGroupModel, Matrix } from "./types";
import { trimFloat } from "./svgHelpers";

export function buildGroupTransform(node: DeviceGroupModel): string {
    const translateX = node.translateX ?? 0;
    const translateY = node.translateY ?? 0;
    const scaleX = node.scaleX ?? 1;
    const scaleY = node.scaleY ?? 1;
    const rotate = node.rotate ?? 0;
    const pivotX = node.pivotX ?? 0;
    const pivotY = node.pivotY ?? 0;

    const matrix = multiplyMatrices(
        translationMatrix(translateX + pivotX, translateY + pivotY),
        multiplyMatrices(
            rotationMatrix(rotate),
            multiplyMatrices(scaleMatrix(scaleX, scaleY), translationMatrix(-pivotX, -pivotY))
        )
    );

    if (isIdentityMatrix(matrix)) {
        return "";
    }

    return `matrix(${trimFloat(matrix[0])} ${trimFloat(matrix[1])} ${trimFloat(matrix[2])} ${trimFloat(matrix[3])} ${trimFloat(matrix[4])} ${trimFloat(matrix[5])})`;
}

function translationMatrix(tx: number, ty: number): Matrix {
    return [1, 0, 0, 1, tx, ty];
}

function scaleMatrix(sx: number, sy: number): Matrix {
    return [sx, 0, 0, sy, 0, 0];
}

function rotationMatrix(degrees: number): Matrix {
    const radians = degrees * (Math.PI / 180);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return [cos, sin, -sin, cos, 0, 0];
}

function multiplyMatrices(left: Matrix, right: Matrix): Matrix {
    const [a1, b1, c1, d1, e1, f1] = left;
    const [a2, b2, c2, d2, e2, f2] = right;
    return [
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1
    ];
}

function isIdentityMatrix(matrix: Matrix): boolean {
    return approximatelyEqual(matrix[0], 1)
        && approximatelyEqual(matrix[1], 0)
        && approximatelyEqual(matrix[2], 0)
        && approximatelyEqual(matrix[3], 1)
        && approximatelyEqual(matrix[4], 0)
        && approximatelyEqual(matrix[5], 0);
}

function approximatelyEqual(left: number, right: number): boolean {
    return Math.abs(left - right) < 1e-6;
}
