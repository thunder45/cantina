import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { router } from './api/router';
import { APIGatewayEvent } from './api/types';
import { authRouter } from './auth';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (handled by Express directly)
app.use('/api/auth', authRouter);

// API routes (handled by our custom router)
app.all('/api/*', async (req, res) => {
  const event: APIGatewayEvent = {
    httpMethod: req.method,
    path: req.path,
    pathParameters: req.params,
    queryStringParameters: req.query as Record<string, string>,
    body: req.body ? JSON.stringify(req.body) : undefined,
    headers: req.headers as Record<string, string>,
    requestContext: {
      authorizer: {
        claims: {
          sub: 'local-test-user',
          'cognito:username': 'testuser',
        },
      },
    },
  };

  try {
    const response = await router(event);
    
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    
    res.status(response.statusCode);
    
    if (response.body) {
      try {
        const parsed = JSON.parse(response.body);
        res.json(parsed);
      } catch {
        res.send(response.body);
      }
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      code: 'ERR_INTERNAL',
      message: 'Internal server error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`
🚀 Cantina ADVM Backend Server
📡 Running at: http://localhost:${PORT}
🏥 Health check: http://localhost:${PORT}/health
🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*
📝 API endpoints: http://localhost:${PORT}/api/*

Ready to receive requests!
  `);
});
