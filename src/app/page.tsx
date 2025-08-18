"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Bot, Camera, Languages, Loader2, Volume2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  translateSignLanguage,
  recognizeSignLanguage,
  generateSpeech,
} from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  targetLanguage: z.string({
    required_error: "Please select a language.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const languageMap: { [key: string]: string } = {
  Hindi: "hi-IN",
  Tamil: "ta-IN",
};

export default function Home() {
  const [translationResult, setTranslationResult] = React.useState<string | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [isRecognizing, setIsRecognizing] = React.useState(false);
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const recognitionIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [accumulatedSigns, setAccumulatedSigns] = React.useState("");
  const [contextualInfo, setContextualInfo] = React.useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const handleTranslation = React.useCallback(async (signLanguageText: string, targetLanguage: string) => {
    if (isTranslating || !signLanguageText || !targetLanguage) return;
    
    setIsTranslating(true);
    setTranslationResult(null);
    try {
      const result = await translateSignLanguage({
        signLanguageText,
        targetLanguage,
        contextualInformation: contextualInfo,
      });
      if (result.success && result.data) {
        setTranslationResult(result.data.improvedTranslation);
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Translation Failed",
        description: error.message || "Could not get translation. Please try again.",
      });
    } finally {
      setIsTranslating(false);
    }
  }, [isTranslating, toast, contextualInfo]);


  const handleRecognizeSign = React.useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !hasCameraPermission || isRecognizing) {
      return;
    }

    setIsRecognizing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (context) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUri = canvas.toDataURL("image/jpeg");

      try {
        const result = await recognizeSignLanguage({ imageDataUri });
        if (result.success && result.data?.text) {
          const newWord = result.data.text;
          const newSignLanguageText = accumulatedSigns ? `${accumulatedSigns} ${newWord}` : newWord;
          setAccumulatedSigns(newSignLanguageText);
          
          const currentValues = form.getValues();
          if(currentValues.targetLanguage && newSignLanguageText){
              handleTranslation(newSignLanguageText, currentValues.targetLanguage);
          }
        } else {
           // Don't show toast for failed recognition in real-time
        }
      } catch (error: any) {
         // Don't show toast for failed recognition in real-time
      }
    }
    setIsRecognizing(false);
  }, [hasCameraPermission, form, isRecognizing, handleTranslation, accumulatedSigns]);
  
  const clearAll = () => {
    form.reset();
    setTranslationResult(null);
    setAccumulatedSigns("");
    setContextualInfo("");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    toast({
      title: 'Cleared',
      description: 'The conversation has been reset.',
    });
  };

  React.useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera API not supported in this browser.");
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Camera Not Supported",
          description: "Your browser does not support the camera API.",
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please enable camera permissions in your browser settings to use this feature.",
        });
      }
    };

    getCameraPermission();
  }, [toast]);

  React.useEffect(() => {
    if (hasCameraPermission) {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
      recognitionIntervalRef.current = setInterval(handleRecognizeSign, 3000); // every 3 seconds
    } else {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
    }

    return () => {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
    };
  }, [hasCameraPermission, handleRecognizeSign]);

  const speak = async (text: string, lang: string) => {
    if (!text || !lang || isGeneratingAudio) return;

    setIsGeneratingAudio(true);
    try {
      const languageCode = languageMap[lang] || "en-US";
      const result = await generateSpeech(text, languageCode);

      if (result.success && result.data) {
        if (audioRef.current) {
          audioRef.current.src = result.data.audioDataUri;
          audioRef.current.play();
        }
      } else {
        throw new Error(result.error || "Failed to generate audio.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Audio Playback Error",
        description: error.message || "Could not play the audio.",
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
       <audio ref={audioRef} className="hidden" />
      <main className="container mx-auto p-4 py-8 md:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Hellohand
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Your friendly sign language interpreter.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column */}
          <div className="space-y-8">
            <Card className="overflow-hidden shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                    <Camera className="text-primary" />
                    Live Camera Feed
                   </div>
                </CardTitle>
                <CardDescription>
                  Your gestures are captured and translated in real-time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                   <video ref={videoRef} className="w-full aspect-video rounded-md scale-x-[-1]" autoPlay muted playsInline />
                   <canvas ref={canvasRef} className="hidden" />
                </div>
                {hasCameraPermission === false && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Camera Access Required</AlertTitle>
                      <AlertDescription>
                        Please allow camera access in your browser settings to use this feature.
                      </AlertDescription>
                    </Alert>
                  )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
               <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <Languages className="text-primary" />
                   Translation Settings
                </CardTitle>
              </CardHeader>
              <Form {...form}>
                <form className="h-full flex flex-col">
                  <CardContent className="space-y-6 flex-grow">
                    <FormField
                      control={form.control}
                      name="targetLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Language</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.keys(languageMap).map((lang) => (
                                <SelectItem key={lang} value={lang}>
                                  {lang}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                      <Button type="button" variant="outline" className="w-full" onClick={clearAll}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Clear Conversation
                      </Button>
                  </CardContent>
                </form>
              </Form>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:sticky top-8">
            <Card className="shadow-lg min-h-[30rem] flex flex-col">
              <CardHeader>
                <CardTitle>Translation Output</CardTitle>
                <CardDescription>
                  The translated text from recognized signs will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                
                {isRecognizing && !translationResult && (
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                     <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="font-semibold">Listening for signs...</p>
                  </div>
                )}

                {isTranslating && (
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="font-semibold">Translating your message...</p>
                    <p className="text-sm">AI is working its magic.</p>
                  </div>
                )}
                
                {!isTranslating && translationResult && (
                  <div className="w-full">
                    <p className="text-2xl md:text-3xl font-semibold text-accent-foreground bg-accent p-6 rounded-lg shadow-inner">
                      {translationResult}
                    </p>
                     {accumulatedSigns && (
                      <p className="text-sm text-muted-foreground mt-4">
                        <span className="font-semibold">Recognized:</span> {accumulatedSigns}
                      </p>
                    )}
                  </div>
                )}
                 {!isTranslating && !translationResult && !isRecognizing && (
                  <div className="text-muted-foreground space-y-2">
                    <Bot size={48} className="mx-auto" />
                    <p>Enable your camera and start signing.</p>
                     <p className="text-sm">The translation will appear here.</p>
                  </div>
                )}
              </CardContent>
              {translationResult && !isTranslating && (
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      speak(translationResult, form.getValues("targetLanguage"))
                    }
                    disabled={isGeneratingAudio}
                  >
                    {isGeneratingAudio ? (
                       <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Audio...
                       </>
                    ) : (
                       <>
                        <Volume2 className="mr-2 h-4 w-4" />
                        Play Audio
                       </>
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
