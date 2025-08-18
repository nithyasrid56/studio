"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Bot,
  Camera,
  Languages,
  Loader2,
  Volume2,
  XCircle,
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
          previousContext: translatedText,
        });

        if (result.success && result.data) {
          setTranslatedText(result.data.translatedText);
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
    translatedText,
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
    recognitionIntervalRef.current = setInterval(handleRecognizeSign, 1500);
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

  const turnCameraOff = () => {
    stopRecognition();
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };
  
  React.useEffect(() => {
    if (isCameraOn) {
      turnCameraOn();
    } else {
      turnCameraOff();
    }
  }, [isCameraOn, turnCameraOn]);

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <audio ref={audioRef} className="hidden" />
      <main className="container mx-auto p-4 py-8 md:p-8">
        <header className="text-center mb-10 relative">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Bhasha Setu
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Your friendly sign language interpreter.
          </p>
          <div className="absolute top-0 right-0">
            <ThemeToggleButton />
          </div>
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
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="camera-toggle">
                      {isCameraOn ? "On" : "Off"}
                    </Label>
                    <Switch
                      id="camera-toggle"
                      checked={isCameraOn}
                      onCheckedChange={setIsCameraOn}
                    />
                  </div>
                </CardTitle>
                <CardDescription>
                  Your gestures are captured and translated in real-time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                  <video
                    ref={videoRef}
                    className="w-full aspect-video rounded-md scale-x-[-1]"
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
                      Please allow camera access in your browser settings to use
                      this feature.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="text-primary" />
                  Language & Controls
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
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={clearAll}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear Conversation
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:sticky top-8">
            <Card className="shadow-lg min-h-[30rem] flex flex-col">
              <CardHeader>
                <CardTitle>Translation Output</CardTitle>
                <CardDescription>
                  The translated text will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                {isProcessing && !translatedText && (
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="font-semibold">Listening for signs...</p>
                  </div>
                )}

                {translatedText && (
                  <div className="w-full">
                    <p className="text-2xl md:text-3xl font-semibold text-accent-foreground bg-accent p-6 rounded-lg shadow-inner">
                      {translatedText}
                    </p>
                  </div>
                )}

                {!isProcessing && !translatedText && (
                  <div className="text-muted-foreground space-y-2">
                    <Bot size={48} className="mx-auto" />
                    {isCameraOn ? (
                      <p>Start signing.</p>
                    ) : (
                      <p>Enable your camera to start.</p>
                    )}
                    <p className="text-sm">
                      The translated text will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
              {translatedText && (
                <CardFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handlePlayAudio}
                    disabled={isSpeaking}
                    className="w-full"
                  >
                    {isSpeaking ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Volume2 className="mr-2 h-4 w-4" />
                    )}
                    Play Audio
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full sm:w-auto"
                    onClick={clearAll}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Clear
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
