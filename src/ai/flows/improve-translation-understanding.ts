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
    .describe('The sequence of words translated from Indian Sign Language gestures.'),
  contextualInformation: z
    .string()
    .describe(
      'Additional contextual information to improve the translation quality.'
    ),
  targetLanguage: z
    .string()
    .describe('The target regional Indian language for the translation.'),
});
export type ImproveTranslationUnderstandingInput = z.infer<
  typeof ImproveTranslationUnderstandingInputSchema
>;

const ImproveTranslationUnderstandingOutputSchema = z.object({
  improvedTranslation: z
    .string()
    .describe('The improved and grammatically correct translation in the target language.'),
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
  prompt: `You are an expert in linguistics, specializing in Indian Sign Language (ISL) and regional Indian languages.
Your task is to convert a sequence of ISL words into a single, grammatically correct, and natural-sounding sentence in the specified target language. The grammar of ISL is different from spoken languages, so you must reorder words and add appropriate grammatical structure. Do not explain the process or the signs.

Sequence of ISL words: {{{signLanguageText}}}
Contextual Information: {{{contextualInformation}}}
Target Language: {{{targetLanguage}}}

Your entire output must be only the final, translated sentence in {{{targetLanguage}}}.`,
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
