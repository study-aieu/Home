import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface LoadingOverlayProps {
  contentLength?: "Short (250 words)" | "Medium (500 words)" | "Long (1000+ words)";
}

export default function LoadingOverlay({ contentLength = "Medium (500 words)" }: LoadingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [timeEstimate, setTimeEstimate] = useState("");
  
  // Set the total time based on content length
  const getTotalTime = (): number => {
    switch (contentLength) {
      case "Short (250 words)":
        return 2; // 2 seconds
      case "Medium (500 words)":
        return 5; // 5 seconds
      case "Long (1000+ words)":
        return 10; // 10 seconds
      default:
        return 5; // default fallback
    }
  };
  
  useEffect(() => {
    const totalTime = getTotalTime() * 1000; // convert to milliseconds
    const intervalTime = 100; // update every 100ms for smooth progress
    const increment = 100 / (totalTime / intervalTime);
    
    const startTime = Date.now();
    
    // Update the message based on content length
    setTimeEstimate(`Estimated time: ${getTotalTime()} seconds`);
    
    const timer = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const calculatedProgress = Math.min(100, (elapsedTime / totalTime) * 100);
      
      setProgress(calculatedProgress);
      
      if (calculatedProgress >= 100) {
        clearInterval(timer);
      }
    }, intervalTime);
    
    return () => clearInterval(timer);
  }, [contentLength]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center max-w-sm mx-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-neutral-dark font-medium text-lg mb-2">Generating {contentLength} Content</p>
        <div className="w-full mb-3">
          <Progress value={progress} className="h-2" />
        </div>
        <p className="text-neutral-medium text-center mb-2">
          {timeEstimate}
        </p>
        <p className="text-neutral-medium text-center text-sm">
          StudyAI is creating your content and analyzing its human-likeness score.
        </p>
      </div>
    </div>
  );
}
