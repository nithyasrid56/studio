"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Bot, Camera, Languages, Loader2, XCircle } from "lucide-react";

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
import { recognizeSignLanguage } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const formSchema = z.object({});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const [recognizedText, setRecognizedText] = React.useState<string>("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] =
    React.useState<boolean | null>(null);
  const [isCameraOn, setIsCameraOn] = React.useState(false);
  const recognitionIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

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
        const result = await recognizeSignLanguage({
          imageDataUri,
        });

        if (result.success && result.data?.text) {
          setRecognizedText(
            (prev) => (prev ? `${prev} ${result.data.text}` : result.data.text)
          );
        } else {
          // Don't show toast for failed recognition in real-time to avoid spamming user
        }
      } catch (error: any) {
        // Don't show toast for failed recognition in real-time
      }
    }
    setIsProcessing(false);
  }, [hasCameraPermission, isProcessing]);

  const clearAll = () => {
    setRecognizedText("");
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

  const toggleCamera = async () => {
    if (isCameraOn) {
      stopRecognition();
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraOn(false);
    } else {
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
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
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
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="camera-toggle">
                      {isCameraOn ? "On" : "Off"}
                    </Label>
                    <Switch
                      id="camera-toggle"
                      checked={isCameraOn}
                      onCheckedChange={toggleCamera}
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
                  Conversation Control
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                <CardTitle>Text Output</CardTitle>
                <CardDescription>
                  The translated text from recognized signs will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                {isProcessing && !recognizedText && (
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="font-semibold">Listening for signs...</p>
                  </div>
                )}

                {recognizedText && (
                  <div className="w-full">
                    <p className="text-2xl md:text-3xl font-semibold text-accent-foreground bg-accent p-6 rounded-lg shadow-inner">
                      {recognizedText}
                    </p>
                  </div>
                )}

                {!isProcessing && !recognizedText && (
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
              {recognizedText && (
                <CardFooter className="flex-col sm:flex-row gap-2">
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
