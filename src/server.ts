import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import eventsRoutes from './routes/events.routes';
import { EventsController } from './controllers/events.controller';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: [
    'https://kedada.vercel.app',
    'https://kedada-git-main-lucas-projects-d3b7a1b1.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Kedada API!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/events', eventsRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);

  // Initialize cache in background (don't block server startup)
  setTimeout(() => {
    EventsController.initializeCache();
  }, 5000); // Wait 5 seconds for server to stabilize
});

export default app;