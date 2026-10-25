import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter, aiLimiter, spaLimiter } from './middleware/rateLimiter';

// Import Route Handlers
import authRoutes from './routes/authRoutes';
import organizationRoutes from './routes/organizationRoutes';
import employeeRoutes from './routes/employeeRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import leaveRoutes from './routes/leaveRoutes';
import payrollRoutes from './routes/payrollRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import aiRoutes from './routes/aiRoutes';
import commsRoutes from './routes/commsRoutes';

import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Explicit, non-permissive CORS configuration
const allowedOrigins = [
  'https://saylani-hr-system.netlify.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.replace(/\/$/, '')] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. serverless functions, curl, mobile clients)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^https:\/\/([a-z0-9-]+--)?saylani-hr-system\.netlify\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed from this origin'), false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply Rate Limiters
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/setup', authLimiter);
app.use('/api/ai', aiLimiter);

// Health Check
app.get('/api/health', apiLimiter, (req, res) => {
  res.json({
    status: 'ok',
    service: 'HCM Lite Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Ensure database is ready before processing API requests (handles cold starts in serverless/Vercel)
let dbConnected = false;
let dbPromise: Promise<void> | null = null;

const ensureDB = async () => {
  if (dbConnected) return;
  if (!dbPromise) {
    dbPromise = connectDB().then(() => {
      dbConnected = true;
    });
  }
  return dbPromise;
};

app.use('/api', async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Register Modular API Endpoints
app.use('/api', authRoutes);
app.use('/api', organizationRoutes);
app.use('/api', employeeRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', leaveRoutes);
app.use('/api', payrollRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', aiRoutes);
app.use('/api', commsRoutes);

// Serve frontend static build in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// For Single Page Application (SPA) routing, route non-API paths to index.html with rate limiting
app.get('*', spaLimiter, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      next();
    }
  });
});

// Centralized Safe Error Handling Middleware
app.use(errorHandler);

// Start Server after Database Connection
const startServer = async () => {
  try {
    await connectDB();
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`🚀 HCM Lite Server running on http://127.0.0.1:${PORT}`);
      console.log(`🌐 Ready to serve Hackathon Evaluation requests`);
      console.log(`====================================================`);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start Server in standalone mode (local dev, Render, Docker). On Vercel serverless, app is handled directly.
if (
  !process.env.NETLIFY &&
  !process.env.VERCEL &&
  !process.env.AWS_LAMBDA_FUNCTION_NAME
) {
  startServer();
}
export default app;
