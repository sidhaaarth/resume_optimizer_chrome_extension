'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Loader2, Pause, Play, RotateCcw, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons';
import { Separator } from '@/components/ui/separator';

function LoadingState() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-3 mb-2">
                <Logo className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold tracking-tight">Vox Summarizer</CardTitle>
            </div>
          <CardDescription>
            Loading your summary...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function VoxSummarizerPlayer() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [hasStarted, setHasStarted] = useState(false);

  const { toast } = useToast();
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const pageContent = searchParams.get('pageContent');
    if (pageContent && !hasStarted) {
        setHasStarted(true); // Prevents re-triggering on param changes
        handleSummarizeAndPlay(pageContent);
    }
  }, [searchParams, hasStarted]);

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

  const handleSummarizeAndPlay = async (content: string) => {
    if (!content.trim()) {
      setIsLoading(false);
      toast({
        title: 'Content is empty',
        description: 'The page you tried to summarize has no text content.',
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
      const result = await summarizePageContent({ pageContent: content });
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
    // Go back to the instructions page
    window.location.href = '/';
  };

  const summaryWords = summary ? summary.split(/\s+/) : [];

  const pageContent = searchParams.get('pageContent');
  
  if (!pageContent) {
    let appUrl = '';
    if (typeof window !== 'undefined') {
        appUrl = window.location.origin;
    }
    const bookmarkletCode = `javascript:(function(){const appUrl='${appUrl}';const content=document.body.innerText;if(content){window.open(appUrl+'?pageContent='+encodeURIComponent(content),'_blank');}else{alert('Could not find any text on this page.');}})();`;

    const copyToClipboard = () => {
        if(navigator.clipboard) {
            navigator.clipboard.writeText(bookmarkletCode);
            toast({
                title: 'Copied to clipboard!',
                description: 'You can now create a new bookmark and paste this code.',
            });
        }
    };
    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-2xl shadow-2xl">
            <CardHeader className="text-center">
                <div className="flex justify-center items-center gap-3 mb-2">
                <Logo className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold tracking-tight">Vox Summarizer</CardTitle>
                </div>
                <CardDescription>
                This app summarizes and reads web pages to you. Use our Chrome Extension or bookmarklet to get started.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                <h3 className="font-semibold text-lg">Option 1: Chrome Extension (Recommended)</h3>
                <p className="text-sm text-muted-foreground">
                    For the best experience, load the provided Chrome extension.
                </p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 pl-2">
                    <li>Open Chrome and navigate to <code>chrome://extensions</code>.</li>
                    <li>Enable "Developer mode" in the top right corner.</li>
                    <li>Click "Load unpacked" and select the <code>extension</code> folder from this project's code.</li>
                    <li>Pin the Vox Summarizer extension to your toolbar.</li>
                    <li>Go to any article and click the extension icon to summarize it.</li>
                </ol>
                </div>
                <Separator />
                <div className="space-y-2">
                <h3 className="font-semibold text-lg">Option 2: Bookmarklet</h3>
                <p className="text-sm text-muted-foreground">
                    Copy the code below to create a bookmark manually.
                </p>
                <div className="p-4 bg-muted rounded-md space-y-2">
                    <Label htmlFor="bookmarklet-code" className="text-xs">Bookmarklet Code</Label>
                    <div className="flex items-center gap-2">
                    <pre className="text-xs p-2 bg-background rounded w-full overflow-x-auto">
                        <code id="bookmarklet-code">{bookmarkletCode}</code>
                    </pre>
                    <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy code</span>
                    </Button>
                    </div>
                </div>
                </div>
            </CardContent>
            </Card>
      </main>
    );
  }
  
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-3 mb-2">
                <Logo className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold tracking-tight">Vox Summarizer</CardTitle>
            </div>
          <CardDescription>
            {isLoading ? "Summarizing your content..." : "Here is your summary. Press play to listen."}
          </CardDescription>
        </CardHeader>
        <CardContent>
           {(isLoading) && (
             <div className="flex justify-center items-center p-8">
               <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
           )}
           {!isLoading && summary && (
             <div className="w-full space-y-4">
               <div>
                 <h3 className="text-lg font-semibold sr-only">Summary</h3>
                 <div className="mt-2 text-base text-foreground/90 rounded-lg p-4 bg-muted/50 max-h-[300px] overflow-y-auto">
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
             </div>
           )}
        </CardContent>

        <CardFooter className="flex-col items-center justify-center gap-4 pt-0">
          {(summary || isLoading) && (
             <div className="flex w-full items-center justify-center gap-4 rounded-full bg-muted p-2">
                <Button variant="ghost" size="icon" onClick={handlePlayPause} disabled={!summary || isLoading}>
                  {isSpeaking && !isPaused ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  <span className="sr-only">{isSpeaking && !isPaused ? 'Pause' : 'Play'}</span>
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={handleReset}>
                  <RotateCcw className="h-6 w-6" />
                  <span className="sr-only">Reset</span>
                </Button>
              </div>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}

export default function VoxSummarizerPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VoxSummarizerPlayer />
    </Suspense>
  )
}
