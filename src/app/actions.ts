"use server";

import {
  recognizeAndTranslateSign,
  type RecognizeAndTranslateSignInput,
} from "@/ai/flows/recognize-and-translate-sign";
import { textToSpeech } from "@/ai/flows/text-to-speech";

export async function recognizeAndTranslate(
  data: RecognizeAndTranslateSignInput
) {
  try {
    const result = await recognizeAndTranslateSign(data);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in recognizeAndTranslate action:", error);
    return {
      success: false,
      error:
        "An unexpected error occurred during translation. Please try again.",
    };
  }
}

export async function generateSpeech(text: string, language: string) {
  try {
    const result = await textToSpeech({ text, language });
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in generateSpeech action:", error);
    return {
      success: false,
      error:
        "An unexpected error occurred while generating speech. Please try again.",
    };
  }
}
