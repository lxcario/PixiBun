export interface ColorPalette {
  id: string;
  name: string;
  author?: string;
  colors: string[]; // hex codes
}

export interface ColorRamp {
  baseColor: string;
  shades: string[]; // shadow to highlight
}
