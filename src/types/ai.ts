export interface AiMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: number;
  suggestions?: string[];
  generatedLayer?: {
    name: string;
    imageDataUrl: string;
  };
  generatedPalette?: string[];
}

export type AiActionType = 
  | 'auto-shade'
  | 'harmonize-palette'
  | 'clean-jaggies'
  | 'inbetween-frame'
  | 'critique-canvas';
