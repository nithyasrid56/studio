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
    .describe('The recognized word from the sign language gesture. This will be empty if no hand is detected.'),
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
  prompt: `You are an expert in Indian Sign Language (ISL). Your task is to interpret a single gesture from an image and append it to an existing sequence of words.

1.  **Analyze the image for a hand gesture.** If no hand is visible or the gesture is unclear, return an empty string for 'recognizedSign' and the existing 'previousContext' for 'translatedText'.
2.  **Identify the single word** being signed. Focus only on the hand gesture (shape, orientation, location, movement). Ignore all other visual information. This is the 'recognizedSign'.
3.  **Do not explain the gesture.** Your output for 'recognizedSign' must be the single word translation only.
4.  **Append, do not rephrase.** Take the 'recognizedSign' and append it to the 'previousContext'. The result is the 'translatedText'. For example, if 'previousContext' is "home" and you recognize "peace", 'translatedText' should be "home peace".

Image: {{media url=imageDataUri}}
Previous context (already translated text): {{{previousContext}}}
Target Language: {{{targetLanguage}}}

Your response must contain both the newly recognized sign and the updated appended text.`,
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
