
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ClockIcon } from "lucide-react";
import { ContentInput } from "@/pages/home";

interface InputSectionProps {
  onGenerateContent: (input: ContentInput) => void;
  isGenerating: boolean;
}

export default function InputSection({ onGenerateContent, isGenerating }: InputSectionProps) {
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [contentLength, setContentLength] = useState<"Short (250 words)" | "Medium (500 words)" | "Long (1000+ words)">("Medium (500 words)");
  const [contentStyle, setContentStyle] = useState<"Academic" | "Informative" | "Creative" | "Persuasive">("Informative");

  useEffect(() => {
    setCharCount(details.length);
  }, [details]);

  const handleSubmit = () => {
    if (!topic.trim()) return;
    
    onGenerateContent({
      topic,
      details,
      preferences: {
        length: contentLength,
        style: contentStyle
      }
    });
  };

  const handleClear = () => {
    setTopic("");
    setDetails("");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <div className="mb-4">
        <Label htmlFor="topic" className="block text-sm font-medium text-neutral-dark mb-1">
          Topic or Assignment
        </Label>
        <Input
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="E.g., The impact of social media on teenagers"
          className="w-full rounded-lg shadow-sm focus:border-primary py-3 px-4"
        />
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <Label htmlFor="details" className="block text-sm font-medium text-neutral-dark">
            Details or Requirements
          </Label>
          <span className={`text-xs ${charCount > 500 ? "text-destructive" : "text-neutral-medium"}`}>
            {charCount}/500
          </span>
        </div>
        <Textarea
          id="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={8}
          placeholder="Add any specific requirements, points to cover, or details about your assignment..."
          className="w-full rounded-lg shadow-sm focus:border-primary py-3 px-4 resize-none"
        />
      </div>

      <div className="mb-6">
        <Label className="block text-sm font-medium text-neutral-dark mb-2">Content Preferences</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center">
              <span className="text-sm text-neutral-dark mr-2">Length:</span>
              <Select value={contentLength} onValueChange={(value) => setContentLength(value as "Short (250 words)" | "Medium (500 words)" | "Long (1000+ words)")}>
                <SelectTrigger className="rounded-lg shadow-sm py-2 px-3 text-sm w-full">
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Short (250 words)">Short (250 words)</SelectItem>
                  <SelectItem value="Medium (500 words)">Medium (500 words)</SelectItem>
                  <SelectItem value="Long (1000+ words)">Long (1000+ words)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <div className="flex items-center">
              <span className="text-sm text-neutral-dark mr-2">Style:</span>
              <Select value={contentStyle} onValueChange={(value) => setContentStyle(value as "Academic" | "Informative" | "Creative" | "Persuasive")}>
                <SelectTrigger className="rounded-lg shadow-sm py-2 px-3 text-sm w-full">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="Informative">Informative</SelectItem>
                  <SelectItem value="Creative">Creative</SelectItem>
                  <SelectItem value="Persuasive">Persuasive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isGenerating || !topic.trim()}
          className="flex-1 bg-primary hover:bg-indigo-600 text-white font-medium py-4 px-6 rounded-full shadow-sm hover:shadow-md transition-all"
        >
          <span className="flex items-center justify-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            Generate Content
          </span>
        </Button>
        <Button
          type="button"
          onClick={handleClear}
          variant="outline"
          className="flex-none py-4 px-6 border border-gray-300 rounded-full text-neutral-dark hover:bg-gray-50 transition-all"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}


## Blog Publishing Mobile App

This repository contains:

- `backend/` – Node.js Express API powering authentication and WordPress integration.
- `mobile/` – React Native (Expo) mobile application.

Follow individual READMEs in each folder for setup instructions.
