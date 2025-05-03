import { ContentPreferences } from "@shared/schema";

/**
 * AI service for content generation and human-likeness analysis
 */
export const aiService = {
  /**
   * Generate content based on the topic, details and preferences
   */
  async generateContent(
    topic: string,
    details: string,
    preferences: ContentPreferences
  ): Promise<{
    content: string;
    title: string;
    humanLikeScore: number;
  }> {
    try {
      // For this implementation, we'll generate some content that varies
      // based on the input parameters
      
      // The topic becomes the title
      const title = topic.trim();
      
      // Generate content based on topic and details
      const prompt = this.buildPrompt(topic, details, preferences);
      
      // In a real implementation, this would call a language model API
      // Instead, we'll construct a simple response
      const paragraphs = 
        preferences.length === "Short (250 words)" ? 2 : 
        preferences.length === "Medium (500 words)" ? 4 : 6;
      
      let content = '';
      
      for (let i = 0; i < paragraphs; i++) {
        // Vary paragraph length based on content style
        const sentenceCount = 
          preferences.style === "Academic" ? 5 : 
          preferences.style === "Creative" ? 3 : 4;
          
        const paragraph = this.generateParagraph(topic, sentenceCount, preferences.style);
        content += paragraph + "\n\n";
      }
      
      // Calculate human-likeness score
      // In a real implementation, this would use a sophisticated AI detection algorithm
      const humanLikeScore = this.calculateHumanLikeScore(content);
      
      return {
        content: content.trim(),
        title,
        humanLikeScore,
      };
    } catch (error) {
      console.error("Error in AI content generation:", error);
      throw new Error("Failed to generate content");
    }
  },

  /**
   * Improve the human-likeness of the provided content
   */
  async improveHumanLikeness(
    content: string,
    topic: string
  ): Promise<{
    content: string;
    humanLikeScore: number;
  }> {
    try {
      // In a real implementation, this would send the content to an AI service
      // that would rewrite it to appear more human-like
      
      // For this implementation, we'll add some variance to the existing content
      // and increase the human-like score
      
      // Split content into paragraphs
      const paragraphs = content.split(/\n\n+/);
      
      // Create a variation with some changes to simulate "more human-like" content
      const improvedParagraphs = paragraphs.map(paragraph => {
        // Add some "human-like" inconsistencies or variations
        return this.makeMoreHumanLike(paragraph);
      });
      
      const improvedContent = improvedParagraphs.join("\n\n");
      
      // Calculate a higher human-likeness score
      const originalScore = this.calculateHumanLikeScore(content);
      const improvement = Math.min(100 - originalScore, 25); // Max 25% improvement
      const newScore = Math.min(originalScore + improvement, 95); // Cap at 95%
      
      return {
        content: improvedContent,
        humanLikeScore: newScore,
      };
    } catch (error) {
      console.error("Error improving human-likeness:", error);
      throw new Error("Failed to improve content human-likeness");
    }
  },

  /**
   * Calculate human-likeness score for the given content
   * This is a simplified version - real implementation would use ML models
   */
  calculateHumanLikeScore(content: string): number {
    // In a real implementation, this would use various NLP techniques
    // to determine how likely the text was written by a human
    
    // For this implementation, we'll use a simple heuristic
    const words = content.split(/\s+/);
    const paragraphs = content.split(/\n\n+/);
    
    // More varied sentence length tends to be more human-like
    const sentences = content.split(/[.!?]+/);
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    
    // Calculate variance in sentence length (more variance = more human-like)
    const avgSentenceLength = sentenceLengths.reduce((sum, len) => sum + len, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length;
    
    // Base score - between 50 and 70
    let score = 50 + Math.floor(Math.random() * 20);
    
    // Adjust score based on variance (higher variance = more human-like)
    if (variance > 10) score += 15;
    else if (variance > 5) score += 10;
    else if (variance > 2) score += 5;
    
    // Very short or very long content gets lower scores
    if (words.length < 100 || words.length > 2000) {
      score -= 10;
    }
    
    // Content with few paragraphs tends to seem less human-like
    if (paragraphs.length < 2) {
      score -= 15;
    }
    
    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, score));
  },

  /**
   * Build a prompt for content generation
   */
  buildPrompt(topic: string, details: string, preferences: ContentPreferences): string {
    const lengthInstruction = 
      preferences.length === "Short (250 words)" ? "around 250 words" : 
      preferences.length === "Medium (500 words)" ? "around 500 words" : 
      "around 1000 words";
      
    return `Write a ${preferences.style.toLowerCase()} piece about ${topic} that is ${lengthInstruction} in length.
    ${details ? `Include the following details: ${details}` : ""}`;
  },

  /**
   * Generate a paragraph of text
   */
  generateParagraph(topic: string, sentenceCount: number, style: string): string {
    const sentences = [];
    
    // First sentence of the paragraph
    sentences.push(`${topic} is an important subject that has many implications for modern society.`);
    
    // Middle sentences
    for (let i = 1; i < sentenceCount - 1; i++) {
      const templates = [
        `This is particularly relevant when considering the broader context of the issue.`,
        `Many researchers have studied this topic and found interesting results.`,
        `The implications of this go beyond what most people initially realize.`,
        `It's worth examining how this impacts different aspects of daily life.`,
        `There are several key factors that contribute to this phenomenon.`
      ];
      
      sentences.push(templates[i % templates.length]);
    }
    
    // Last sentence
    if (style === "Academic") {
      sentences.push(`Further research is needed to fully understand all aspects of this complex topic.`);
    } else if (style === "Creative") {
      sentences.push(`Perhaps we should all take a moment to reflect on what this means for our future.`);
    } else if (style === "Persuasive") {
      sentences.push(`It's clear that immediate action is required to address this pressing issue.`);
    } else {
      sentences.push(`Understanding this topic helps us make better decisions in related areas.`);
    }
    
    return sentences.join(" ");
  },

  /**
   * Make the given paragraph more human-like by introducing variations
   */
  makeMoreHumanLike(paragraph: string): string {
    // In a real implementation, this would use sophisticated NLP techniques
    
    // For this demo, we'll make simple substitutions and add filler words
    const fillerWords = ["actually", "basically", "honestly", "generally", "essentially"];
    const sentences = paragraph.split(/(?<=[.!?]) +/);
    
    if (sentences.length <= 1) return paragraph;
    
    // Randomly select a sentence to modify
    const indexToModify = Math.floor(Math.random() * sentences.length);
    const fillerWord = fillerWords[Math.floor(Math.random() * fillerWords.length)];
    
    // Add a filler word to the beginning of the sentence
    sentences[indexToModify] = `${fillerWord.charAt(0).toUpperCase() + fillerWord.slice(1)}, ${sentences[indexToModify].charAt(0).toLowerCase() + sentences[indexToModify].slice(1)}`;
    
    return sentences.join(" ");
  }
};
