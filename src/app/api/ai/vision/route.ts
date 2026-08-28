import { NextRequest, NextResponse } from 'next/server';

interface VisionRequestBody {
  action: 'auto-shade' | 'harmonize-palette' | 'clean-jaggies' | 'inbetween-frame' | 'critique' | 'chat';
  prompt?: string;
  imageDataUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  paletteColors?: string[];
  activeLayerName?: string;
  customApiKey?: string;
}

const CANDIDATE_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
];

export async function POST(req: NextRequest) {
  try {
    const body: VisionRequestBody = await req.json();
    const { 
      action, 
      prompt, 
      imageDataUrl, 
      canvasWidth, 
      canvasHeight, 
      paletteColors = [], 
      customApiKey 
    } = body;

    const allowedActions = ['auto-shade', 'harmonize-palette', 'clean-jaggies', 'inbetween-frame', 'critique', 'chat'];
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
    if (!Number.isInteger(canvasWidth) || canvasWidth <= 0 || !Number.isInteger(canvasHeight) || canvasHeight <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid canvas dimensions' }, { status: 400 });
    }
    if (typeof imageDataUrl !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid imageDataUrl' }, { status: 400 });
    }
    if (customApiKey !== undefined && (typeof customApiKey !== 'string' || customApiKey.trim().length < 20)) {
      return NextResponse.json({ success: false, error: 'Invalid custom API key' }, { status: 400 });
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    // If Gemini API key is present, try Google Gemini 2.0 / 1.5 endpoints
    if (apiKey && apiKey.trim()) {
      const base64Data = imageDataUrl ? imageDataUrl.replace(/^data:image\/\w+;base64,/, '') : '';

      const systemInstructions = `You are PixiBud, a warm, cozy, supportive pixel art companion and master 2D sprite artist.
You are chatting with your artist friend who is working on a ${canvasWidth}x${canvasHeight} canvas.
Palette: ${paletteColors.join(', ')}.
Analyze the artwork with a keen, encouraging eye. Give genuine, practical pixel art advice on lighting direction, color warmth, cluster volume, and rhythm.
Speak warmly, concisely, and like a real creative friend. Never use corporate jargon, generic robotic formulas, or boilerplate greetings.`;

      const promptText = prompt || `Take a look at my pixel art and help me with ${action}.`;

      type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

      const parts: GeminiPart[] = [
        { text: `${systemInstructions}\n\nArtist Friend: ${promptText}` }
      ];

      if (base64Data && base64Data.length > 50) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: base64Data,
          },
        });
      }

      let lastGoogleError = '';

      for (const model of CANDIDATE_MODELS) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.45,
                maxOutputTokens: 800,
              },
            }),
          });

          if (res.ok) {
            interface GeminiResponse {
              candidates?: {
                content?: {
                  parts?: { text?: string }[];
                };
              }[];
            }
            const data = (await res.json()) as GeminiResponse;
            const responseText =
              data.candidates?.[0]?.content?.parts?.[0]?.text ||
              'Looking great! Your pixel clusters have nice balance.';

            return NextResponse.json({
              success: true,
              isLiveGemini: true,
              text: responseText,
              suggestions: getContextualSuggestions(action),
              actionData: getLocalActionData(action, paletteColors),
            });
          } else {
            const errData = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
            lastGoogleError = errData?.error?.message || `HTTP ${res.status}`;
          }
        } catch (fetchErr: unknown) {
          lastGoogleError = fetchErr instanceof Error ? fetchErr.message : 'Connection error';
        }
      }

      // If all models failed, provide friendly notice + warm local response
      const fallback = generateCozyPixiBudResponse(action, prompt, canvasWidth, canvasHeight, paletteColors);
      return NextResponse.json({
        success: true,
        isLiveGemini: false,
        isOffline: true,
        text: `PixiBud: ${fallback.text} (Note: Google API returned "${lastGoogleError}" - please double check your key in settings)`,
        suggestions: fallback.suggestions,
        actionData: fallback.actionData,
      });
    }

    // Cozy deterministic PixiBud studio response (instant warm offline mode)
    const fallbackResponse = generateCozyPixiBudResponse(action, prompt, canvasWidth, canvasHeight, paletteColors);

    return NextResponse.json({
      success: true,
      isLiveGemini: false,
      isOffline: true,
      text: fallbackResponse.text,
      suggestions: fallbackResponse.suggestions,
      actionData: fallbackResponse.actionData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during vision analysis',
      },
      { status: 500 }
    );
  }
}

function getContextualSuggestions(action: string): string[] {
  switch (action) {
    case 'auto-shade':
      return ['Add specular highlight', 'Deepen shadow ramp', 'Harmonize palette'];
    case 'harmonize-palette':
      return ['Add warm ambient tint', 'Generate 5-step ramp'];
    case 'clean-jaggies':
      return ['Preserve sharp tips', 'Add specular highlight'];
    case 'inbetween-frame':
      return ['Preview animation loop', 'Adjust timing'];
    default:
      return ['Auto-Shade', 'Add specular highlight', 'Harmonize palette', 'Clean jaggies'];
  }
}

function getLocalActionData(action: string, _palette: string[]) {
  switch (action) {
    case 'auto-shade':
      return { lightAngle: 45, shadowColor: '#3A2E4C', opacity: 0.45 };
    case 'harmonize-palette':
      return { suggestedColors: ['#3A2E4C', '#6A5880', '#A86EC6', '#C792DF', '#DCABDF'] };
    case 'clean-jaggies':
      return { mode: '1px-contour' };
    case 'inbetween-frame':
      return { offset: { x: 0, y: 1 } };
    default:
      return {};
  }
}

function generateCozyPixiBudResponse(
  action: string,
  prompt?: string,
  width: number = 32,
  height: number = 32,
  _palette: string[] = []
) {
  switch (action) {
    case 'auto-shade':
      return {
        text: `Added a smooth, 2.5D curved shadow crescent along the bottom-right! The light is coming from the top-left at a 45° angle.`,
        suggestions: ['Add specular highlight', 'Harmonize palette'],
        actionData: {
          lightAngle: 45,
          shadowColor: '#3A2E4C',
          opacity: 0.45,
        },
      };
    case 'harmonize-palette':
      return {
        text: `Picked out a few dreamy, harmonious tones that blend smoothly with your current colors. Added them straight into your palette swatches!`,
        suggestions: ['Generate 5-step ramp', 'Auto-Shade'],
        actionData: {
          suggestedColors: ['#3A2E4C', '#6A5880', '#A86EC6', '#C792DF', '#DCABDF'],
        },
      };
    case 'clean-jaggies':
      return {
        text: `Cleaned up those stray double-pixel corners for you! Your outlines and silhouettes are looking super smooth and crisp now.`,
        suggestions: ['Add specular highlight', 'Auto-Shade'],
        actionData: {
          cleaned: true,
        },
      };
    case 'inbetween-frame':
      return {
        text: `Created a fresh in-between frame in your animation reel with a gentle bounce. Hit Play to see how it moves!`,
        suggestions: ['Preview animation loop', 'Adjust FPS'],
        actionData: {
          offset: { x: 0, y: 1 },
        },
      };
    default:
      return {
        text: prompt
          ? `On it! I've updated your canvas with smooth lighting and highlights to bring out the depth in your sprite.`
          : `Hey! Your ${width}x${height} canvas is looking lovely. Whenever you're ready to add shadows, highlights, or refine the palette, I'm right here with you!`,
        suggestions: ['Auto-Shade', 'Add specular highlight', 'Harmonize palette', 'Clean jaggies'],
        actionData: {},
      };
  }
}
