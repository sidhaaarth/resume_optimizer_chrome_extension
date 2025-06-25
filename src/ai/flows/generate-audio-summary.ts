'use server';
/**
 * @fileOverview Summarizes web page content and converts it to speech.
 *
 * - generateAudioSummary - A function that handles the summarization and TTS process.
 * - GenerateAudioSummaryInput - The input type for the function.
 * - GenerateAudioSummaryOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { WavFile } from 'wavefile';

const GenerateAudioSummaryInputSchema = z.object({
  pageContent: z
    .string()
    .describe('The content of the current web page to summarize.'),
});
export type GenerateAudioSummaryInput = z.infer<
  typeof GenerateAudioSummaryInputSchema
>;

const GenerateAudioSummaryOutputSchema = z.object({
  summary: z.string().describe('The summarized content of the web page.'),
  audioDataUri: z
    .string()
    .describe('The base64 encoded WAV audio of the summary.'),
});
export type GenerateAudioSummaryOutput = z.infer<
  typeof GenerateAudioSummaryOutputSchema
>;

export async function generateAudioSummary(
  input: GenerateAudioSummaryInput
): Promise<GenerateAudioSummaryOutput> {
  return generateAudioSummaryFlow(input);
}

const summarizePrompt = ai.definePrompt({
  name: 'summarizePrompt',
  input: {schema: GenerateAudioSummaryInputSchema},
  output: {
    schema: z.object({
      summary: z.string().describe('The summarized content of the web page.'),
    }),
  },
  prompt: `Summarize the following web page content in a way that is engaging to listen to:\n\n{{pageContent}}`,
});

const generateAudioSummaryFlow = ai.defineFlow(
  {
    name: 'generateAudioSummaryFlow',
    inputSchema: GenerateAudioSummaryInputSchema,
    outputSchema: GenerateAudioSummaryOutputSchema,
  },
  async input => {
    // Step 1: Summarize the content
    const {output: summaryOutput} = await summarizePrompt(input);
    if (!summaryOutput) {
      throw new Error('Failed to generate summary.');
    }
    const summary = summaryOutput.summary;

    // Step 2: Convert summary to speech
    const {media} = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: summary,
    });

    if (!media) {
      throw new Error('Failed to generate audio.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    const audioDataUri = await toWav(audioBuffer);

    // Step 3: Return both summary and audio
    return {
      summary,
      audioDataUri,
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  const wav = new WavFile();
  // The Gemini TTS model returns 16-bit PCM.
  wav.fromScratch(channels, rate, (sampleWidth * 8).toString(), pcmData);
  return wav.toDataURI();
}
