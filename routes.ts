import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService } from "./services/ai-service";
import { contentGenerationSchema, contentImprovementSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Content generation endpoint
  app.post("/api/content/generate", async (req, res) => {
    try {
      const validatedData = contentGenerationSchema.parse(req.body);
      
      // Generate content based on the validated input
      const { content, title, humanLikeScore } = await aiService.generateContent(
        validatedData.topic,
        validatedData.details || "",
        validatedData.preferences
      );
      
      // Store the generated content
      const savedContent = await storage.saveGeneratedContent({
        title,
        body: content,
        topic: validatedData.topic,
        prompt: validatedData.details,
        humanLikeScore,
        preferences: validatedData.preferences,
      });
      
      return res.status(200).json({
        title,
        body: content,
        humanLikeScore,
        contentId: savedContent.id,
        preferences: validatedData.preferences,
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error generating content:", error);
      return res.status(500).json({ message: "Failed to generate content" });
    }
  });

  // Content improvement endpoint
  app.post("/api/content/improve", async (req, res) => {
    try {
      // Get the latest content to improve
      const latestContent = await storage.getLatestContent();
      
      if (!latestContent) {
        return res.status(404).json({ message: "No content found to improve" });
      }
      
      // Generate more human-like content
      const { content, humanLikeScore } = await aiService.improveHumanLikeness(
        latestContent.body,
        latestContent.topic
      );
      
      // Store the improved content
      const savedContent = await storage.saveGeneratedContent({
        title: latestContent.title,
        body: content,
        topic: latestContent.topic,
        prompt: latestContent.prompt,
        humanLikeScore,
        preferences: latestContent.preferences,
        improvedFrom: latestContent.id,
      });
      
      return res.status(200).json({
        title: savedContent.title,
        body: content,
        humanLikeScore,
        contentId: savedContent.id,
        preferences: latestContent.preferences,
      });
    } catch (error: unknown) {
      console.error("Error improving content:", error);
      return res.status(500).json({ message: "Failed to improve content" });
    }
  });

  // Get latest generated content
  app.get("/api/content/latest", async (req, res) => {
    try {
      const latestContent = await storage.getLatestContent();
      
      if (!latestContent) {
        return res.status(404).json({ message: "No content found" });
      }
      
      return res.status(200).json({
        title: latestContent.title,
        body: latestContent.body,
        humanLikeScore: latestContent.humanLikeScore,
        contentId: latestContent.id,
        preferences: latestContent.preferences,
      });
    } catch (error: unknown) {
      console.error("Error retrieving latest content:", error);
      return res.status(500).json({ message: "Failed to retrieve content" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
