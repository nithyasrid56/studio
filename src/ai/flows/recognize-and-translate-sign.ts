'use server';

/**
 * @fileOverview Implements a Genkit flow to recognize a sign language gesture from an image and translate it.
 *
 * - recognizeAndTranslateSign - A function that takes an image of a sign and returns the recognized text.
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
});
export type RecognizeAndTranslateSignInput = z.infer<
  typeof RecognizeAndTranslateSignInputSchema
>;

const RecognizeAndTranslateSignOutputSchema = z.object({
  recognizedSign: z
    .string()
    .describe('The recognized word from the sign language gesture. This will be empty if no hand is detected.'),
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
  prompt: `You are an expert in Indian Sign Language (ISL). Your task is to interpret a single gesture from an image.

1.  **Analyze the image for a hand gesture.** If no hand is visible or the gesture is unclear, return an empty string for 'recognizedSign'.
2.  **Focus on the hand gesture.** Identify the single word being signed by interpreting the hand gesture (shape, orientation, location, and movement). Ignore any facial expressions.
3.  **Return a single word only.** Do not explain the gesture. Your output must be the single English word translation of the sign.

Image: {{media url=imageDataUri}}
Target Language for context (do not translate): {{{targetLanguage}}}

Your response must contain only the newly recognized sign.`,
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
    };
  }
);
