declare module 'gifuct-js' {
  export interface ParsedFrame {
    dims: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    delay: number;
    disposalType: number;
    patch: Uint8ClampedArray;
    transparentIndex: number;
    colorTable?: number[][];
  }

  export function parseGIF(arrayBuffer: ArrayBuffer): any;
  export function decompressFrames(parsedGif: any, buildImagePatches: boolean): ParsedFrame[];
}
