import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clipboard, RefreshCw, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { ContentPreferences } from "@/pages/home";

interface OutputSectionProps {
  content: {
    title: string;
    body: string;
    preferences?: ContentPreferences;
  } | null;
  humanLikeScore: number;
  onImproveContent: () => void;
  onRegenerateContent: () => void;
  isGenerating: boolean;
}

export default function OutputSection({
  content,
  humanLikeScore,
  onImproveContent,
  onRegenerateContent,
  isGenerating,
}: OutputSectionProps) {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  const copyContent = async () => {
    if (!content) return;
    
    try {
      setIsCopying(true);
      const fullContent = `${content.title}\n\n${content.body}`;
      await navigator.clipboard.writeText(fullContent);
      
      toast({
        title: "Content copied",
        description: "The generated content has been copied to your clipboard.",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy content to clipboard.",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const exportContent = () => {
    if (!content) return;
    
    const fullContent = `${content.title}\n\n${content.body}`;
    const blob = new Blob([fullContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${content.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Content exported",
      description: "Your document has been downloaded.",
      duration: 2000,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg text-neutral-dark">Generated Content</h2>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={!content || isGenerating || isCopying}
            onClick={copyContent}
            className="p-3 text-neutral-medium hover:text-primary rounded-full hover:bg-gray-100 transition-all"
            title="Copy to clipboard"
          >
            <Clipboard className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!content || isGenerating}
            onClick={onRegenerateContent}
            className="p-3 text-neutral-medium hover:text-primary rounded-full hover:bg-gray-100 transition-all"
            title="Regenerate content"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* AI Detection Score */}
      <div className="mb-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-neutral-dark">AI Detection Score</span>
          <span className="text-sm font-semibold text-neutral-dark">
            {content ? `${humanLikeScore}% Human-like` : "N/A"}
          </span>
        </div>
        <Progress 
          value={content ? humanLikeScore : 0} 
          className="w-full bg-gray-200 rounded-full h-2.5"
          indicatorClassName="bg-accent h-2.5 rounded-full" 
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-neutral-medium">AI-like</span>
          <span className="text-xs text-neutral-medium">Human-like</span>
        </div>
      </div>

      {/* Generated Content Area */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg p-4 mb-4 bg-white text-neutral-dark min-h-[300px]">
        {content ? (
          <>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg">{content.title}</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs px-3 py-1 bg-gray-100 rounded-full text-neutral-medium shadow-sm">
                  {content.body.split(/\s+/).filter(word => word.length > 0).length} words
                </span>
                {/* Show target word count based on preferences */}
                <span className="text-xs text-neutral-medium">
                  {content.preferences?.length === "Short (250 words)" ? "/ ~250" : 
                   content.preferences?.length === "Medium (500 words)" ? "/ ~500" : "/ ~1000+"}
                </span>
              </div>
            </div>
            <div className="whitespace-pre-line">{content.body}</div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-medium">
            <p>Generated content will appear here</p>
          </div>
        )}
      </div>

      <div className="flex space-x-3">
        <Button
          type="button"
          onClick={onImproveContent}
          disabled={!content || isGenerating}
          className="flex-1 bg-secondary hover:bg-indigo-600 text-white font-medium py-4 px-6 rounded-full shadow-sm hover:shadow-md transition-all"
        >
          <span className="flex items-center justify-center">
            <Plus className="h-5 w-5 mr-2" />
            Make More Human-like
          </span>
        </Button>
        <Button
          type="button"
          onClick={exportContent}
          disabled={!content || isGenerating}
          variant="outline"
          className="flex-none py-4 px-6 border border-gray-300 rounded-full text-neutral-dark hover:bg-gray-50 transition-all"
        >
          Export
        </Button>
      </div>
    </div>
  );
}
