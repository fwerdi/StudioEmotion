import { GoogleGenAI } from "@google/genai";
import { EmotionState } from '../types';

// FIX: Per coding guidelines, initialize GoogleGenAI directly with process.env.API_KEY
// and remove runtime checks, as the key is assumed to be present.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash';

const validEmotions: EmotionState[] = ['Engaged', 'Confused', 'Neutral', 'Bored', 'Happy'];

export const analyzeEmotionFromImage = async (base64ImageData: string): Promise<EmotionState> => {
  const prompt = `Analyze the primary emotion of the person in this image to gauge their understanding of a lecture. Choose ONE of the following: Engaged, Confused, Neutral, Bored, Happy. Respond with only the single chosen word.`;

  try {
    const imagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: 'image/jpeg'
      }
    };

    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] }
    });

    const resultText = response.text.trim();

    if (validEmotions.includes(resultText as EmotionState)) {
      return resultText as EmotionState;
    }
    
    console.warn(`Gemini returned an unexpected value: "${resultText}". Falling back to Neutral.`);
    return 'Neutral';

  } catch (error) {
    console.error("Error analyzing emotion with Gemini:", error);
    return "Error";
  }
};