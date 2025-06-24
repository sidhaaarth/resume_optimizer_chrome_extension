'use server';
/**
 * @fileOverview Summarizes the content of a web page using AI.
 *
 * - summarizePageContent - A function that summarizes the content of a web page.
 * - SummarizePageContentInput - The input type for the summarizePageContent function.
 * - SummarizePageContentOutput - The return type for the summarizePageContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizePageContentInputSchema = z.object({
  pageContent: z
    .string()
    .describe('The content of the current web page to summarize.'),
});
export type SummarizePageContentInput = z.infer<typeof SummarizePageContentInputSchema>;

const SummarizePageContentOutputSchema = z.object({
  summary: z.string().describe('The summarized content of the web page.'),
});
export type SummarizePageContentOutput = z.infer<typeof SummarizePageContentOutputSchema>;

export async function summarizePageContent(
  input: SummarizePageContentInput
): Promise<SummarizePageContentOutput> {
  return summarizePageContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizePageContentPrompt',
  input: {schema: SummarizePageContentInputSchema},
  output: {schema: SummarizePageContentOutputSchema},
  prompt: `Summarize the following web page content:\n\n{{pageContent}}`,
});

const summarizePageContentFlow = ai.defineFlow(
  {
    name: 'summarizePageContentFlow',
    inputSchema: SummarizePageContentInputSchema,
    outputSchema: SummarizePageContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
