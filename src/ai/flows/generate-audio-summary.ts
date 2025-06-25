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
import wav from 'wav';

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
    // Truncate the content to avoid hitting model context limits
    const truncatedContent = input.pageContent.substring(0, 15000);

    // Step 1: Summarize the content
    const {output: summaryOutput} = await summarizePrompt({ pageContent: truncatedContent });
    if (!summaryOutput || !summaryOutput.summary.trim()) {
      throw new Error('Failed to generate a valid summary.');
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
    const audioDataUri = 'data:audio/wav;base64,' + (await toWav(audioBuffer));

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
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (d: Buffer) => {
      bufs.push(d);
    });
    writer.on('end', () => {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
