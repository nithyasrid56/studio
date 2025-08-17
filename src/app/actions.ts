"use server";

import {
  improveTranslationUnderstanding,
  type ImproveTranslationUnderstandingInput,
} from "@/ai/flows/improve-translation-understanding";
import {
  recognizeSign,
  type RecognizeSignInput,
} from "@/ai/flows/recognize-sign";


export async function translateSignLanguage(
  data: ImproveTranslationUnderstandingInput
) {
  try {
    const result = await improveTranslationUnderstanding(data);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in translateSignLanguage action:", error);
    // It's better to return a generic error message to the client
    // to avoid leaking implementation details.
    return {
      success: false,
      error: "An unexpected error occurred while translating. Please try again later.",
    };
  }
}

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
