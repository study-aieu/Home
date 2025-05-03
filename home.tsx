import { useState } from "react";
import { Link } from "wouter";
import InputSection from "@/components/InputSection";
import OutputSection from "@/components/OutputSection";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useContentGenerator } from "@/hooks/use-content-generator";
import { BookOpen, Check, Sparkles, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ContentPreferences = {
  length: "Short (250 words)" | "Medium (500 words)" | "Long (1000+ words)";
  style: "Academic" | "Informative" | "Creative" | "Persuasive";
};

export type ContentInput = {
  topic: string;
  details: string;
  preferences: ContentPreferences;
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [showApp, setShowApp] = useState(false);
  const [currentContentLength, setCurrentContentLength] = useState<ContentPreferences["length"]>("Medium (500 words)");
  const {
    generatedContent,
    humanLikeScore,
    generateContent,
    improveContent,
    regenerateContent,
    isGenerating,
  } = useContentGenerator();

  const handleGenerateContent = async (input: ContentInput) => {
    setCurrentContentLength(input.preferences.length);
    setIsLoading(true);
    await generateContent(input);
    setIsLoading(false);
  };

  const handleImproveContent = async () => {
    // For improvements, use the length from the current content if available
    if (generatedContent?.preferences?.length) {
      setCurrentContentLength(generatedContent.preferences.length);
    }
    setIsLoading(true);
    await improveContent();
    setIsLoading(false);
  };

  const handleRegenerateContent = async () => {
    // For regeneration, use the length from the last input (which is stored in the hook)
    if (generatedContent?.preferences?.length) {
      setCurrentContentLength(generatedContent.preferences.length);
    }
    setIsLoading(true);
    await regenerateContent();
    setIsLoading(false);
  };

  if (!showApp) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Hero Section */}
        <div className="relative min-h-[500px] flex items-center bg-gradient-to-b from-white to-gray-50 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src="/images/hero-background.svg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="container mx-auto px-4 z-10 py-16">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold text-neutral-dark mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-indigo-500">
                AI Writing Assistant for Students
              </h1>
              <p className="text-xl text-neutral-dark mb-8">
                Generate content on any topic and get a human-likeness score to improve your learning process
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => setShowApp(true)}
                  size="lg"
                  variant="outline"
                  className="bg-white hover:bg-gray-50 text-primary border-primary hover:border-indigo-600 font-medium rounded-full shadow-sm hover:shadow-md transition-all px-8 py-6"
                >
                  Start Writing
                </Button>
                <a href="/about">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="border border-gray-300 rounded-full text-neutral-dark hover:bg-gray-50 transition-all px-8 py-6"
                  >
                    Learn More
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-neutral-dark mb-12">Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-dark mb-2">Smart Content Generation</h3>
                <p className="text-neutral-medium">
                  Generate academic essays, articles, or creative content on any topic with specific length and style requirements.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-dark mb-2">Human-Likeness Scoring</h3>
                <p className="text-neutral-medium">
                  Get instant feedback on how human-like your generated content appears, with options to improve.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-dark mb-2">Learning Focused</h3>
                <p className="text-neutral-medium">
                  Designed for students to focus on understanding concepts rather than spending hours writing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-neutral-dark mb-12">How It Works</h2>
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col gap-8">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-semibold">1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-dark mb-2">Enter Your Topic</h3>
                    <p className="text-neutral-medium">
                      Provide a topic or assignment prompt along with any specific details and requirements.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-semibold">2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-dark mb-2">Choose Content Preferences</h3>
                    <p className="text-neutral-medium">
                      Select your desired length (short, medium, or long) and style (academic, informative, creative, or persuasive).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-semibold">3</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-dark mb-2">Generate and Improve</h3>
                    <p className="text-neutral-medium">
                      Review your generated content and its human-likeness score, and use the "Make More Human-like" feature to improve if needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 bg-gradient-to-r from-indigo-700 to-indigo-500 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to start writing?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of students who save time and improve their learning with StudyAI
            </p>
            <Button 
              onClick={() => setShowApp(true)}
              size="lg"
              variant="outline"
              className="bg-white hover:bg-gray-50 text-primary border-primary hover:border-indigo-600 font-medium rounded-full shadow-sm hover:shadow-md transition-all px-8 py-6"
            >
              Try StudyAI Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gray-50">
      {/* App Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark mb-2">AI Writing Assistant</h1>
            <p className="text-neutral-dark">
              Enter a topic or assignment prompt, and StudyAI will generate content while providing an AI detection score.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowApp(false)}
            className="border border-gray-300 rounded-full text-neutral-dark hover:bg-gray-50 transition-all px-6 py-3"
          >
            Back to Home
          </Button>
        </div>
      </div>

      {/* Split view for iPad layout */}
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-6 md:gap-8">
        <InputSection onGenerateContent={handleGenerateContent} isGenerating={isGenerating} />
        <OutputSection
          content={generatedContent}
          humanLikeScore={humanLikeScore}
          onImproveContent={handleImproveContent}
          onRegenerateContent={handleRegenerateContent}
          isGenerating={isGenerating}
        />
      </div>
      {isLoading && <LoadingOverlay contentLength={currentContentLength} />}
    </main>
  );
}
