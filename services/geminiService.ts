
import { GoogleGenAI, Type } from "@google/genai";
import { WishResponse } from "../types";

export const getMagicalResponse = async (wish: string): Promise<WishResponse> => {
  try {
    // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Someone has made a Christmas wish: "${wish}". 
                 Respond as a warm, magical Christmas spirit. 
                 Provide a heartfelt, poetic, and encouraging response that makes the wisher feel seen and loved.
                 Keep it concise (under 50 words).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
              description: "The main festive response message."
            },
            magicalNote: {
              type: Type.STRING,
              description: "A short, one-sentence magical blessing or note."
            }
          },
          required: ["message", "magicalNote"]
        }
      }
    });

    return JSON.parse(response.text || '{"message": "The stars align to hear your wish.", "magicalNote": "Believe in the magic."}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      message: "The universe hums with the warmth of your wish. May it find its way to fulfillment.",
      magicalNote: "Magic is all around you."
    };
  }
};
