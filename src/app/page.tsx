"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Bot, Camera, Languages, Loader2, Scan, Volume2 } from "lucide-react";

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { translateSignLanguage, recognizeSignLanguage } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  signLanguageText: z
    .string()
    .min(2, "Please enter some text to translate.")
    .max(500),
  contextualInformation: z.string().max(500).optional(),
  targetLanguage: z.string({
    required_error: "Please select a language.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const languageMap: { [key: string]: string } = {
  Tamil: "ta-IN",
  Malayalam: "ml-IN",
  Telugu: "te-IN",
  Hindi: "hi-IN",
  Kannada: "kn-IN"
};

export default function Home() {
  const [translationResult, setTranslationResult] = React.useState<string | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [isRecognizing, setIsRecognizing] = React.useState(false);
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [isRealtime, setIsRealtime] = React.useState(false);
  const recognitionIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      signLanguageText: "",
      contextualInformation: "",
    },
  });

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
      // Flip the image horizontally
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUri = canvas.toDataURL("image/jpeg");

      try {
        const result = await recognizeSignLanguage({ imageDataUri });
        if (result.success && result.data) {
          form.setValue("signLanguageText", result.data.text);
          if (!isRealtime) {
            toast({
              title: "Sign Recognized",
              description: "The initial translation has been populated.",
            });
          }
        } else {
           if (!isRealtime) {
            throw new Error(result.error || "An unknown error occurred.");
           }
        }
      } catch (error: any) {
         if (!isRealtime) {
          toast({
            variant: "destructive",
            title: "Recognition Failed",
            description: error.message || "Could not recognize the sign. Please try again.",
          });
         }
      }
    }
    setIsRecognizing(false);
  }, [hasCameraPermission, form, toast, isRealtime, isRecognizing]);


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
    if (isRealtime && hasCameraPermission) {
      recognitionIntervalRef.current = setInterval(handleRecognizeSign, 2000); // every 2 seconds
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
  }, [isRealtime, hasCameraPermission, handleRecognizeSign]);


  async function onSubmit(values: FormValues) {
    setIsTranslating(true);
    setTranslationResult(null);
    try {
      const result = await translateSignLanguage(values);
      if (result.success && result.data) {
        setTranslationResult(result.data.improvedTranslation);
        toast({
          title: "Translation Successful",
          description: "Your text has been translated.",
        });
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
  }

  const speak = (text: string, lang: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageMap[lang] || "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        variant: "destructive",
        title: "Audio Not Supported",
        description: "Your browser does not support speech synthesis.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <main className="container mx-auto p-4 py-8 md:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">
            Speaksign
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Your voice in sign.
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
                      <Switch id="realtime-mode" checked={isRealtime} onCheckedChange={setIsRealtime} disabled={!hasCameraPermission} />
                      <Label htmlFor="realtime-mode">Real-time Translation</Label>
                    </div>
                </CardTitle>
                <CardDescription>
                  Real-time gesture and expression capture. Toggle the switch for continuous translation.
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
              <CardFooter>
                 <Button onClick={handleRecognizeSign} className="w-full" disabled={isRecognizing || !hasCameraPermission || isRealtime}>
                      {isRecognizing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recognizing...
                        </>
                      ) : (
                        <>
                           <Scan className="mr-2 h-4 w-4" />
                           Recognize Sign (Once)
                        </>
                      )}
                    </Button>
              </CardFooter>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <Languages className="text-primary" />
                   Translation Input
                </CardTitle>
                <CardDescription>
                  Provide the sign language output and context.
                </CardDescription>
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="signLanguageText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Translation</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enable real-time or click 'Recognize Sign'..."
                              className="resize-none"
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This text is generated by the AI from your sign.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contextualInformation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Context (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 'At a doctor's clinic', 'Ordering food'"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Providing context improves translation accuracy.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                          <FormDescription>
                            The language to translate the text into.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={isTranslating}>
                      {isTranslating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Translating...
                        </>
                      ) : (
                        <>
                           <Bot className="mr-2 h-4 w-4" />
                           Translate with AI
                        </>
                      )}
                    </Button>
                  </CardFooter>
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
                  The translated text will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
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
                  </div>
                )}
                 {!isTranslating && !translationResult && (
                  <div className="text-muted-foreground space-y-2">
                    <Bot size={48} className="mx-auto" />
                    <p>Your translated text will appear here.</p>
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
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    Play Audio
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
