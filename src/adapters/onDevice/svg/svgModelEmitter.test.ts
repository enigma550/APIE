import { expect, test } from "bun:test";
import { MaskShape } from "../../../core";
import { emitModelSvg } from "./svgModelEmitter";

test("maps Android fillRule 0 to SVG evenodd", () => {
    const { svg } = emitModelSvg({
        kind: "vector",
        viewportWidth: 108,
        viewportHeight: 108,
        children: [
            {
                kind: "path",
                pathData: "M 0 0 L 10 0 L 10 10 L 0 10 Z M 3 3 L 7 3 L 7 7 L 3 7 Z",
                fillColor: "#ffffffff",
                fillRule: 0
            }
        ]
    }, MaskShape.Square);

    expect(svg).toContain('fill-rule="evenodd"');
});

test("maps Android fillRule 1 to SVG nonzero", () => {
    const { svg } = emitModelSvg({
        kind: "vector",
        viewportWidth: 108,
        viewportHeight: 108,
        children: [
            {
                kind: "path",
                pathData: "M 0 0 L 10 0 L 10 10 L 0 10 Z",
                fillColor: "#ffffffff",
                fillRule: 1
            }
        ]
    }, MaskShape.Square);

    expect(svg).toContain('fill-rule="nonzero"');
});

test("maps clip-path fillRule 0 to SVG evenodd", () => {
    const { svg } = emitModelSvg({
        kind: "group",
        children: [
            {
                kind: "clip-path",
                pathData: "M 0 0 L 10 0 L 10 10 L 0 10 Z M 3 3 L 7 3 L 7 7 L 3 7 Z",
                fillRule: 0
            },
            {
                kind: "solid",
                x: 0,
                y: 0,
                width: 10,
                height: 10,
                color: "#ffffffff"
            }
        ]
    }, MaskShape.Square);

    expect(svg).toContain('clip-rule="evenodd"');
    expect(svg).toContain('fill-rule="evenodd"');
});
