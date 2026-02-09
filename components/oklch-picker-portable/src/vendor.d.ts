declare module "apca-w3" {
  export function APCAcontrast(txtY: number, bgY: number): number;
  export function sRGBtoY(rgb: [number, number, number]): number;
  export function displayP3toY(rgb: [number, number, number]): number;
}

declare module "apcach" {
  export function apcach(
    target: unknown,
    chroma: number,
    hue: number,
    precision?: number,
    colorSpace?: "srgb" | "p3"
  ): unknown;
  export function crToBg(background: string, targetLc: number): unknown;
  export function apcachToCss(value: unknown, format?: string): string;
}
