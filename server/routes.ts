import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAccessLogSchema, insertMonitoringStatusSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all access logs
  app.get("/api/access-logs", async (req, res) => {
    try {
      const logs = await storage.getAccessLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch access logs" });
    }
  });

  // Create new access log
  app.post("/api/access-logs", async (req, res) => {
    try {
      const validatedData = insertAccessLogSchema.parse(req.body);
      const log = await storage.createAccessLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create access log" });
      }
    }
  });

  // Clear all access logs
  app.delete("/api/access-logs", async (req, res) => {
    try {
      await storage.clearAccessLogs();
      res.json({ message: "Access logs cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear access logs" });
    }
  });

  // Get monitoring status
  app.get("/api/monitoring-status", async (req, res) => {
    try {
      const status = await storage.getMonitoringStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monitoring status" });
    }
  });

  // Update monitoring status
  app.put("/api/monitoring-status", async (req, res) => {
    try {
      const validatedData = insertMonitoringStatusSchema.parse(req.body);
      const status = await storage.updateMonitoringStatus(validatedData);
      res.json(status);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update monitoring status" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
