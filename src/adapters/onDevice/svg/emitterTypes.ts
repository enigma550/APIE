export interface EmitState {
    nextId: number;
    defs: string[];
}

export interface EmittedNode {
    markup: string;
    containsRasterImages: boolean;
    rasterSourceClasses: string[];
}
