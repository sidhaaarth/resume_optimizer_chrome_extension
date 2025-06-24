'use client';

import { useState, useEffect, useRef } from 'react';
import { summarizePageContent } from '@/ai/flows/summarize-page-content';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Pause, Play, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons';
import { Separator } from '@/components/ui/separator';

export default function VoxSummarizerPage() {
  const [pageContent, setPageContent] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const { toast } = useToast();
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  const handleSummarizeAndPlay = async () => {
    if (!pageContent.trim()) {
      toast({
        title: 'Content is empty',
        description: 'Please paste some text from a web page to summarize.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setSummary('');
    setCurrentWordIndex(-1);
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    try {
      const result = await summarizePageContent({ pageContent });
      setSummary(result.summary);
      handlePlay(result.summary);
    } catch (error) {
      console.error('Summarization failed:', error);
      toast({
        title: 'Summarization Failed',
        description:
          'An error occurred while summarizing the content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = (textToSpeak: string) => {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utteranceRef.current = utterance;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };

      utterance.onpause = () => {
        setIsSpeaking(true);
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentWordIndex(-1);
        utteranceRef.current = null;
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const words = textToSpeak.substring(0, event.charIndex).split(/\s+/);
          setCurrentWordIndex(words.length - 1);
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
        toast({
            title: 'Browser Not Supported',
            description: 'Your browser does not support text-to-speech.',
            variant: 'destructive',
        });
    }
  };

  const handlePlayPause = () => {
    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.pause();
      }
    } else if (summary) {
      handlePlay(summary);
    }
  };

  const handleReset = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setPageContent('');
    setSummary('');
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
    utteranceRef.current = null;
  };

  const summaryWords = summary ? summary.split(/\s+/) : [];
  
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-3 mb-2">
                <Logo className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold tracking-tight">Vox Summarizer</CardTitle>
            </div>
          <CardDescription>
            Paste content from any webpage, and we'll summarize it and read it back to you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="page-content" className="text-sm font-medium">Page Content</Label>
            <Textarea
              id="page-content"
              placeholder="Paste the text you want to summarize here..."
              className="min-h-[150px] resize-y"
              value={pageContent}
              onChange={(e) => setPageContent(e.target.value)}
              disabled={isLoading || isSpeaking}
            />
          </div>
          <Button onClick={handleSummarizeAndPlay} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading || isSpeaking}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Summarizing...
              </>
            ) : (
              'Summarize & Play'
            )}
          </Button>
        </CardContent>

        {(summary || isLoading) && <Separator />}

        <CardFooter className="flex-col items-start gap-4 pt-6">
          {summary && (
            <div className="w-full space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Summary</h3>
                <div className="mt-2 text-base text-foreground/90 rounded-lg p-4 bg-muted/50">
                    {summaryWords.length > 0 ? (
                        <p>
                        {summaryWords.map((word, index) => (
                            <span
                            key={index}
                            className={cn(
                                'transition-all duration-150',
                                index === currentWordIndex
                                ? 'text-primary font-bold animate-pulse-word'
                                : ''
                            )}
                            >
                            {word}{' '}
                            </span>
                        ))}
                        </p>
                    ) : null}
                </div>
              </div>

              <div className="flex w-full items-center justify-center gap-4 rounded-full bg-muted p-2">
                <Button variant="ghost" size="icon" onClick={handlePlayPause} disabled={!summary}>
                  {isSpeaking && !isPaused ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  <span className="sr-only">{isSpeaking && !isPaused ? 'Pause' : 'Play'}</span>
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={handleReset}>
                  <RotateCcw className="h-6 w-6" />
                  <span className="sr-only">Reset</span>
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
