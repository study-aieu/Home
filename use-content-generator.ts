import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ContentInput } from "@/pages/home";

// Helper function to calculate processing time based on content length
const getProcessingTime = (lengthPreference: string): number => {
  switch (lengthPreference) {
    case "Short (250 words)":
      return 2000; // 2 seconds
    case "Medium (500 words)":
      return 5000; // 5 seconds
    case "Long (1000+ words)":
      return 10000; // 10 seconds
    default:
      return 3000; // default fallback
  }
};

interface GeneratedContent {
  title: string;
  body: string;
  humanLikeScore: number;
  preferences?: {
    length: "Short (250 words)" | "Medium (500 words)" | "Long (1000+ words)";
    style: "Academic" | "Informative" | "Creative" | "Persuasive";
  };
  contentId?: number;
}

export function useContentGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastInput, setLastInput] = useState<ContentInput | null>(null);
  
  const { data: currentContent, refetch } = useQuery({
    queryKey: ['/api/content/latest'],
    enabled: false,
    retry: false,
  });

  const generateContentMutation = useMutation({
    mutationFn: async (input: ContentInput) => {
      const res = await apiRequest("POST", "/api/content/generate", input);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/content/latest'] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error generating content",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const improveContentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/content/improve");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/content/latest'] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error improving content",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateContent = async (input: ContentInput) => {
    setLastInput(input);
    
    // Add artificial delay based on the length of content being generated
    const processingTime = getProcessingTime(input.preferences.length);
    const startTime = Date.now();
    
    // Introduce loading toast for longer generations
    if (processingTime > 3000) {
      toast({
        title: "Generating content",
        description: `Creating ${input.preferences.length.toLowerCase()} content. Please wait...`,
      });
    }
    
    // Start the API request
    const contentPromise = generateContentMutation.mutateAsync(input);
    
    // Wait for either the minimum processing time or API response, whichever takes longer
    await Promise.all([
      contentPromise,
      new Promise(resolve => {
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, processingTime - elapsed);
        setTimeout(resolve, remainingTime);
      })
    ]);
  };

  const regenerateContent = async () => {
    if (lastInput) {
      // Add artificial delay based on the length of content being regenerated
      const processingTime = getProcessingTime(lastInput.preferences.length);
      const startTime = Date.now();
      
      // Start the API request
      const contentPromise = generateContentMutation.mutateAsync(lastInput);
      
      // Wait for either the minimum processing time or API response, whichever takes longer
      await Promise.all([
        contentPromise,
        new Promise(resolve => {
          const elapsed = Date.now() - startTime;
          const remainingTime = Math.max(0, processingTime - elapsed);
          setTimeout(resolve, remainingTime);
        })
      ]);
    } else {
      toast({
        title: "Cannot regenerate",
        description: "No previous input found to regenerate content.",
        variant: "destructive",
      });
    }
  };

  const improveContent = async () => {
    // For improvements, use a standard 3 second processing time
    const processingTime = 3000;
    const startTime = Date.now();
    
    // Start the API request
    const contentPromise = improveContentMutation.mutateAsync();
    
    // Wait for either the minimum processing time or API response, whichever takes longer
    await Promise.all([
      contentPromise,
      new Promise(resolve => {
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, processingTime - elapsed);
        setTimeout(resolve, remainingTime);
      })
    ]);
  };

  // Ensure the content is properly typed
  const typedContent = currentContent as GeneratedContent | null | undefined;
  
  return {
    generatedContent: typedContent || null,
    humanLikeScore: typedContent?.humanLikeScore || 0,
    generateContent,
    regenerateContent,
    improveContent,
    isGenerating: generateContentMutation.isPending || improveContentMutation.isPending,
  };
}
