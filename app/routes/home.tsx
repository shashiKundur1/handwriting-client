import { useState, useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { apiFetch, ApiError } from "~/lib/api";

// Define the shape of our job result data
interface DigitizationResult {
  _id: string;
  status: "pending" | "processing" | "completed" | "failed";
  recognizedText: string | null;
  translatedText: string | null;
  failureReason: string | null;
}

export default function Home() {
  // State for the application
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<DigitizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Refs for form inputs
  const imageUrlRef = useRef<HTMLInputElement>(null);
  const targetLangUrlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetLangFileRef = useRef<HTMLInputElement>(null);

  // Polling effect
  useEffect(() => {
    if (
      !jobId ||
      (result && (result.status === "completed" || result.status === "failed"))
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const data: DigitizationResult = await apiFetch(
          `digitize/result/${jobId}`
        );
        setResult(data);
        // Simple progress simulation based on status
        if (data.status === "processing") setProgress(50);
        if (data.status === "completed" || data.status === "failed") {
          setProgress(100);
          setJobId(null); // Stop polling
          setIsLoading(false);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("An unknown error occurred while fetching results.");
        }
        setIsLoading(false);
        setJobId(null); // Stop polling on error
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval); // Cleanup on unmount or when jobId changes
  }, [jobId, result]);

  const resetState = () => {
    setJobId(null);
    setResult(null);
    setIsLoading(false);
    setError(null);
    setProgress(0);
  };

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    setIsLoading(true);
    setProgress(5);

    try {
      const data = await apiFetch("digitize/url", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: imageUrlRef.current?.value,
          targetLanguage: targetLangUrlRef.current?.value,
        }),
      });
      setJobId(data.digitizationId);
      setResult({ status: "pending" } as DigitizationResult); // Set initial pending status
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during URL submission.");
      }
      setIsLoading(false);
    }
  };

  const handleSubmitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    resetState();
    setIsLoading(true);
    setProgress(5);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("targetLanguage", targetLangFileRef.current?.value || "");

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/api/v1/digitize/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.message || "File upload failed",
          response.status,
          data
        );
      }

      setJobId(data.data.digitizationId);
      setResult({ status: "pending" } as DigitizationResult);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during file submission.");
      }
      setIsLoading(false);
    }
  };

  return (
    <main className="page-container flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="content-wrapper w-full max-w-2xl">
        {/* --- Input Section --- */}
        <Card className="component-container p-4">
          <CardHeader className="header-section text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Handwriting Digitizer
            </CardTitle>
            <CardDescription>
              Upload an image or paste a URL to extract and translate
              handwritten text.
            </CardDescription>
          </CardHeader>
          <CardContent className="body-section">
            <Tabs defaultValue="url">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">Image URL</TabsTrigger>
                <TabsTrigger value="upload">Upload File</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="mt-4">
                <form className="space-y-4" onSubmit={handleSubmitUrl}>
                  <div className="field-element">
                    <Input
                      id="imageUrl"
                      type="url"
                      placeholder="https://example.com/image.png"
                      ref={imageUrlRef}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="field-element">
                    <Input
                      id="targetLanguageUrl"
                      placeholder="Target Language (e.g., es, fr, de)"
                      ref={targetLangUrlRef}
                      disabled={isLoading}
                    />
                  </div>
                  <Button className="w-full" type="submit" disabled={isLoading}>
                    Digitize from URL
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="upload" className="mt-4">
                <form className="space-y-4" onSubmit={handleSubmitFile}>
                  <div className="field-element">
                    <Input
                      id="imageFile"
                      type="file"
                      ref={fileRef}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="field-element">
                    <Input
                      id="targetLanguageFile"
                      placeholder="Target Language (e.g., es, fr, de)"
                      ref={targetLangFileRef}
                      disabled={isLoading}
                    />
                  </div>
                  <Button className="w-full" type="submit" disabled={isLoading}>
                    Digitize from File
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* --- Result Section --- */}
        {(result || isLoading || error) && (
          <Card className="component-container mt-6">
            <CardHeader className="header-section">
              <CardTitle>Result</CardTitle>
              {error && (
                <CardDescription className="text-red-500">
                  {error}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="body-section space-y-4">
              <div className="status-element space-y-2">
                <p className="text-sm font-medium">
                  Status:{" "}
                  {result?.status || (isLoading ? "submitting..." : "...")}
                </p>
                <Progress value={progress} />
              </div>
              {result?.recognizedText && (
                <div className="result-element">
                  <h3 className="font-semibold">Recognized Text:</h3>
                  <p className="mt-1 rounded-md bg-slate-100 p-2 text-sm text-slate-600 font-mono">
                    {result.recognizedText}
                  </p>
                </div>
              )}
              {result?.translatedText && (
                <div className="result-element">
                  <h3 className="font-semibold">Translated Text:</h3>
                  <p className="mt-1 rounded-md bg-slate-100 p-2 text-sm text-slate-600 font-mono">
                    {result.translatedText}
                  </p>
                </div>
              )}
              {result?.status === "failed" && (
                <div className="result-element">
                  <h3 className="font-semibold text-red-600">
                    Failure Reason:
                  </h3>
                  <p className="mt-1 rounded-md bg-red-50 p-2 text-sm text-red-700 font-mono">
                    {result.failureReason || "An unknown error occurred."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
