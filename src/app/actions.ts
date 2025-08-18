"use server";

import {
  improveTranslationUnderstanding,
  type ImproveTranslationUnderstandingInput,
} from "@/ai/flows/improve-translation-understanding";
import {
  recognizeSign,
  type RecognizeSignInput,
} from "@/ai/flows/recognize-sign";
import { textToSpeech } from "@/ai/flows/text-to-speech";

export async function recognizeSignLanguage(data: RecognizeSignInput) {
  try {
    const result = await recognizeSign(data);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in recognizeSignLanguage action:", error);
    return {
      success: false,
      error: "An unexpected error occurred during recognition. Please try again.",
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
      error: "An unexpected error occurred while generating speech. Please try again.",
    };
  }
}

export async function translateSignLanguage(
  data: ImproveTranslationUnderstandingInput
) {
  try {
    const result = await improveTranslationUnderstanding(data);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in translateSignLanguage action:", error);
    return {
      success: false,
      error: "An unexpected error occurred while translating. Please try again later.",
    };
  }
}
