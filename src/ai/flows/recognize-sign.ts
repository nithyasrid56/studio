'use server';

/**
 * @fileOverview Implements a Genkit flow to recognize sign language from an image.
 *
 * - recognizeSign - A function that takes an image of a sign and returns a text description.
 * - RecognizeSignInput - The input type for the recognizeSign function.
 * - RecognizeSignOutput - The return type for the recognizeSign function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecognizeSignInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a sign language gesture, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RecognizeSignInput = z.infer<typeof RecognizeSignInputSchema>;

const RecognizeSignOutputSchema = z.object({
  text: z.string().describe('The recognized word or short phrase from the sign language gesture.'),
});
export type RecognizeSignOutput = z.infer<typeof RecognizeSignOutputSchema>;

export async function recognizeSign(
  input: RecognizeSignInput
): Promise<RecognizeSignOutput> {
  return recognizeSignFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recognizeSignPrompt',
  input: {schema: RecognizeSignInputSchema},
  output: {schema: RecognizeSignOutputSchema},
  prompt: `You are an expert in Indian Sign Language (ISL) and communication through gestures.
Analyze the provided image of a hand gesture.
Interpret the hand shape, movement, location, and facial expression to determine the single word or short phrase being signed.
This includes formal ISL signs as well as common, universal gestures like waving for "hello".
Provide only the most likely interpretation. Your output should be concise.

Image: {{media url=imageDataUri}}`,
});

const recognizeSignFlow = ai.defineFlow(
  {
    name: 'recognizeSignFlow',
    inputSchema: RecognizeSignInputSchema,
    outputSchema: RecognizeSignOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {text: output!.text};
  }
);
