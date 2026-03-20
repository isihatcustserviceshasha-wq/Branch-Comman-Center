import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Webhook Endpoint for WhatsApp (Mock for now)
  // In a real scenario, you would point your WhatsApp API provider here
  app.post("/api/webhook/whatsapp", (req, res) => {
    const { branch, message, type } = req.body;
    console.log(`Received WhatsApp message for ${branch}: ${message}`);
    
    // In a real app, you would use firebase-admin here to update Firestore
    // For this demo, we'll let the client handle the simulation for simplicity
    // but the endpoint is ready for real integration.
    
    res.json({ status: "success", received: { branch, message, type } });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
