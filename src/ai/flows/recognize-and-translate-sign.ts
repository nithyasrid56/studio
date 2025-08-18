'use server';

/**
 * @fileOverview Implements a Genkit flow to recognize a sign language gesture from an image and translate it.
 *
 * - recognizeAndTranslateSign - A function that takes an image of a sign and returns the recognized text and its translation.
 * - RecognizeAndTranslateSignInput - The input type for the recognizeAndTranslateSign function.
 * - RecognizeAndTranslateSignOutput - The return type for the recognizeAndTranslateSign function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecognizeAndTranslateSignInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a sign language gesture, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  targetLanguage: z
    .string()
    .describe('The target regional Indian language for the translation.'),
  previousContext: z
    .string()
    .describe(
      'The previously recognized and translated text, to provide context.'
    ),
});
export type RecognizeAndTranslateSignInput = z.infer<
  typeof RecognizeAndTranslateSignInputSchema
>;

const RecognizeAndTranslateSignOutputSchema = z.object({
  recognizedSign: z
    .string()
    .describe('The recognized word or short phrase from the sign language gesture.'),
  translatedText: z
    .string()
    .describe('The translated text in the target language.'),
});
export type RecognizeAndTranslateSignOutput = z.infer<
  typeof RecognizeAndTranslateSignOutputSchema
>;

export async function recognizeAndTranslateSign(
  input: RecognizeAndTranslateSignInput
): Promise<RecognizeAndTranslateSignOutput> {
  return recognizeAndTranslateSignFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recognizeAndTranslateSignPrompt',
  input: {schema: RecognizeAndTranslateSignInputSchema},
  output: {schema: RecognizeAndTranslateSignOutputSchema},
  prompt: `You are an expert in Indian Sign Language (ISL) and a linguist. Your primary task is to accurately interpret the provided image, focusing exclusively on hand gestures. Pay very close attention to the details: hand shape, palm orientation, location of the hand, and any movement. Ignore any other actions, including facial expressions or background elements.

Once you have meticulously analyzed the hand gesture to identify the single word or short phrase being signed, you will then translate it into the target language. Use the previous context to ensure the new translation fits grammatically and coherently with what was said before. The final translated text should be a complete, natural-sounding sentence.

Image: {{media url=imageDataUri}}
Previous context (already translated text): {{{previousContext}}}
Target Language: {{{targetLanguage}}}

Your response must contain both the newly recognized sign and the updated, grammatically correct full translated sentence.`,
});

const recognizeAndTranslateSignFlow = ai.defineFlow(
  {
    name: 'recognizeAndTranslateSignFlow',
    inputSchema: RecognizeAndTranslateSignInputSchema,
    outputSchema: RecognizeAndTranslateSignOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      recognizedSign: output!.recognizedSign,
      translatedText: output!.translatedText,
    };
  }
);
