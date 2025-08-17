'use server';

/**
 * @fileOverview Implements a Genkit flow to improve the quality of sign language translations using contextual information.
 *
 * - improveTranslationUnderstanding - A function that enhances sign language translations using context.
 * - ImproveTranslationUnderstandingInput - The input type for the improveTranslationUnderstanding function.
 * - ImproveTranslationUnderstandingOutput - The return type for the improveTranslationUnderstanding function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImproveTranslationUnderstandingInputSchema = z.object({
  signLanguageText: z
    .string()
    .describe('The initial text translated from sign language.'),
  contextualInformation: z
    .string()
    .describe(
      'Additional contextual information to improve the translation quality.'
    ),
  targetLanguage: z
    .string()
    .describe('The target language for the translation.'),
});
export type ImproveTranslationUnderstandingInput = z.infer<
  typeof ImproveTranslationUnderstandingInputSchema
>;

const ImproveTranslationUnderstandingOutputSchema = z.object({
  improvedTranslation: z
    .string()
    .describe('The improved and contextually accurate translation.'),
});
export type ImproveTranslationUnderstandingOutput = z.infer<
  typeof ImproveTranslationUnderstandingOutputSchema
>;

export async function improveTranslationUnderstanding(
  input: ImproveTranslationUnderstandingInput
): Promise<ImproveTranslationUnderstandingOutput> {
  return improveTranslationUnderstandingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveTranslationUnderstandingPrompt',
  input: {
    schema: ImproveTranslationUnderstandingInputSchema,
  },
  output: {
    schema: ImproveTranslationUnderstandingOutputSchema,
  },
  prompt: `You are an expert in sign language translation and regional Indian languages.
Given the initial translation and contextual information, improve the translation to be more accurate and understandable in the target language.

Initial Translation: {{{signLanguageText}}}
Contextual Information: {{{contextualInformation}}}
Target Language: {{{targetLanguage}}}

Improved Translation:`, // The LLM should respond with an improved translation
});

const improveTranslationUnderstandingFlow = ai.defineFlow(
  {
    name: 'improveTranslationUnderstandingFlow',
    inputSchema: ImproveTranslationUnderstandingInputSchema,
    outputSchema: ImproveTranslationUnderstandingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {improvedTranslation: output!.improvedTranslation};
  }
);
