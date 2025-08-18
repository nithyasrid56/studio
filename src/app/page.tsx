"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Camera,
  Loader2,
  Volume2,
  XCircle,
  Languages,
  Info,
  Mic,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  recognizeAndTranslate,
  improveTranslation,
} from "./actions";
import { generateSpeech } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({});

type FormValues = z.infer<typeof formSchema>;

const languageMap: { [key: string]: { name: string; code: string } } = {
  english: { name: "English", code: "en-US" },
  hindi: { name: "Hindi", code: "hi-IN" },
  tamil: { name: "Tamil", code: "ta-IN" },
  bengali: { name: "Bengali", code: "bn-IN" },
  telugu: { name: "Telugu", code: "te-IN" },
  marathi: { name: "Marathi", code: "mr-IN" },
  gujarati: { name: "Gujarati", code: "gu-IN" },
  kannada: { name: "Kannada", code: "kn-IN" },
  malayalam: { name: "Malayalam", code: "ml-IN" },
  punjabi: { name: "Punjabi", code: "pa-IN" },
  urdu: { name: "Urdu", code: "ur-IN" },
};

export default function Home() {
  const [englishText, setEnglishText] = React.useState<string>("");
  const [translatedText, setTranslatedText] = React.useState<string>("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [hasCameraPermission, setHasCameraPermission] =
    React.useState<boolean | null>(null);
  const [isCameraOn, setIsCameraOn] = React.useState(true);
  const recognitionIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [targetLanguage, setTargetLanguage] = React.useState<string>("english");
  const [contextualInformation, setContextualInformation] = React.useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const handleRecognizeSign = React.useCallback(async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !hasCameraPermission ||
      isProcessing
    ) {
      return;
    }

    setIsProcessing(true);
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
        const result = await recognizeAndTranslate({
          imageDataUri,
          targetLanguage: languageMap[targetLanguage].name,
        });

        if (result.success && result.data && result.data.recognizedSign) {
          const newEnglishText = englishText
            ? `${englishText} ${result.data.recognizedSign}`
            : result.data.recognizedSign;
          setEnglishText(newEnglishText);

          if (targetLanguage === 'english') {
            setTranslatedText(newEnglishText);
          } else {
            const translationResult = await improveTranslation({
              signLanguageText: newEnglishText,
              contextualInformation: contextualInformation,
              targetLanguage: languageMap[targetLanguage].name,
            });

            if (translationResult.success && translationResult.data) {
              setTranslatedText(translationResult.data.improvedTranslation);
            } else {
               toast({
                variant: 'destructive',
                title: 'Translation Error',
                description: translationResult.error || 'Could not improve translation.',
              });
            }
          }
        }
      } catch (error: any) {
        // Fail silently in real-time to avoid spamming user
      }
    }
    setIsProcessing(false);
  }, [
    hasCameraPermission,
    isProcessing,
    targetLanguage,
    englishText,
    contextualInformation,
    toast,
  ]);

  const handlePlayAudio = async () => {
    if (!translatedText || isSpeaking) return;

    setIsSpeaking(true);
    try {
      const result = await generateSpeech(
        translatedText,
        languageMap[targetLanguage].code
      );
      if (result.success && result.data?.audioDataUri && audioRef.current) {
        audioRef.current.src = result.data.audioDataUri;
        audioRef.current.play();
        audioRef.current.onended = () => setIsSpeaking(false);
      } else {
        toast({
          variant: "destructive",
          title: "Audio Error",
          description:
            result.error || "Could not play audio. Please try again.",
        });
        setIsSpeaking(false);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Audio Error",
        description: "An unexpected error occurred. Please try again.",
      });
      setIsSpeaking(false);
    }
  };

  const clearAll = () => {
    setEnglishText("");
    setTranslatedText("");
    toast({
      title: "Cleared",
      description: "The conversation has been reset.",
    });
  };

  const startRecognition = React.useCallback(() => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
    }
    recognitionIntervalRef.current = setInterval(handleRecognizeSign, 1000);
  }, [handleRecognizeSign]);

  const stopRecognition = () => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
  };

  const turnCameraOn = React.useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Not Supported",
        description: "Your browser does not support the camera API.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          startRecognition();
          setIsCameraOn(true);
        };
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasCameraPermission(false);
      setIsCameraOn(false);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description:
          "Please enable camera permissions in your browser settings to use this feature.",
      });
    }
  }, [startRecognition, toast]);

  const turnCameraOff = React.useCallback(() => {
    stopRecognition();
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);
  
  React.useEffect(() => {
    if (isCameraOn) {
      turnCameraOn();
    } else {
      turnCameraOff();
    }
    
    return () => {
      stopRecognition();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOn, turnCameraOn, turnCameraOff]);
  
  React.useEffect(() => {
    setEnglishText('');
    setTranslatedText('');
  }, [targetLanguage]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <audio ref={audioRef} className="hidden" />
      <main className="container mx-auto p-4 max-w-4xl">
        <header className="flex justify-between items-center py-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary rounded-full">
               <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-8 h-8 text-primary-foreground"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.47 2.47a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06l4.72-4.72H9a5.25 5.25 0 1 0 0 10.5h3a.75.75 0 0 1 0 1.5H9a6.75 6.75 0 0 1 0-13.5h10.19l-4.72-4.72a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                  <path d="M1.5 8.25a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H2.25A.75.75 0 0 1 1.5 8.25Zm0 4.5a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75Z" />
                </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Hello Hand
            </h1>
          </div>
          <ThemeToggleButton />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Camera />
                  Camera Feed
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="camera-toggle" className="text-sm">
                    {isCameraOn ? "On" : "Off"}
                  </Label>
                  <Switch
                    id="camera-toggle"
                    checked={isCameraOn}
                    onCheckedChange={setIsCameraOn}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                  <video
                    ref={videoRef}
                    className="w-full aspect-video rounded-lg scale-x-[-1]"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                {hasCameraPermission === false && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>
                      Please allow camera access in your browser settings.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages />
                  Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language-select">Translate to</Label>
                  <Select
                    value={targetLanguage}
                    onValueChange={setTargetLanguage}
                  >
                    <SelectTrigger id="language-select">
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(languageMap).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="context-input" className="flex items-center gap-2">
                    <Info />
                    Context (Optional)
                  </Label>
                  <Textarea
                    id="context-input"
                    placeholder="e.g., 'Ordering food' or 'At the hospital'"
                    value={contextualInformation}
                    onChange={(e) => setContextualInformation(e.target.value)}
                    className="resize-none"
                  />
                </div>
              </CardContent>
               <CardFooter>
                 <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={clearAll}
                  >
                    <XCircle />
                    Clear Translation
                  </Button>
               </CardFooter>
            </Card>
          </div>
          
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic />
                Translation
              </CardTitle>
              <CardDescription>
                Your translated signs will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow min-h-[20rem] flex justify-center items-center text-center">
              {isProcessing && !translatedText && (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p>Listening for signs...</p>
                </div>
              )}

              {translatedText && (
                <p className="text-2xl md:text-4xl font-bold text-foreground">
                  {translatedText}
                </p>
              )}

              {!isProcessing && !translatedText && (
                 <p className="text-lg text-muted-foreground p-8">
                   {isCameraOn ? "Start signing in front of the camera. The translation will appear here." : "Please enable your camera to begin translating."}
                 </p>
              )}
            </CardContent>
            {translatedText && (
              <CardFooter>
                <Button
                  onClick={handlePlayAudio}
                  disabled={isSpeaking}
                  className="w-full"
                  size="lg"
                >
                  {isSpeaking ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Volume2 />
                  )}
                  Speak
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}