import { GoogleGenAI } from "@google/genai";
import { EmotionState } from '../types';

// FIX: Per coding guidelines, initialize GoogleGenAI directly with process.env.API_KEY
// and remove runtime checks, as the key is assumed to be present.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash';

const validEmotions: EmotionState[] = ['Engaged', 'Confused', 'Neutral', 'Bored', 'Happy'];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeEmotionFromImage = async (base64ImageData: string): Promise<EmotionState> => {
  // New prompt incorporating FACS principles
  const prompt = `Analyze the person in this image using the Facial Action Coding System (FACS). First, identify key Action Units (like brow furrowing, eye squinting, lip corner movement). Based on these facial cues, determine the student's most likely emotional state in a learning context. Choose ONE of the following options as your final answer: Engaged, Confused, Neutral, Bored, Happy.`;

  const imagePart = {
    inlineData: {
      data: base64ImageData,
      mimeType: 'image/jpeg'
    }
  };

  const textPart = { text: prompt };

  const MAX_RETRIES = 3;
  const INITIAL_BACKOFF_MS = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
          model: model,
          contents: { parts: [imagePart, textPart] },
          config: {
              // Updated system instruction to specify FACS expertise
              systemInstruction: "You are an expert in analyzing human emotions using the Facial Action Coding System (FACS) for an e-learning platform. Your goal is to determine a student's engagement level based on their facial muscle movements (Action Units). Your final response must be a single word from this list: Engaged, Confused, Neutral, Bored, Happy. Do not add any other text, explanation, or punctuation."
          }
      });

      const resultText = response.text.trim();

      if (validEmotions.includes(resultText as EmotionState)) {
        return resultText as EmotionState;
      }
      
      console.warn(`Gemini returned an unexpected value: "${resultText}". Falling back to Neutral.`);
      return 'Neutral';

    } catch (error) {
        console.error(`Attempt ${attempt} - Error analyzing emotion with Gemini:`, error);
      
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isRetryable = errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('overloaded');
  
        if (isRetryable && attempt < MAX_RETRIES) {
          const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`Model is overloaded. Retrying in ${backoffTime}ms...`);
          await sleep(backoffTime);
        } else {
          // This was the last attempt or the error is not retryable
          console.error("Giving up after multiple retries.");
          return "Error";
        }
    }
  }
  
  // This part should not be reached if MAX_RETRIES > 0, but it satisfies TypeScript
  return "Error";
};