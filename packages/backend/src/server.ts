import express from 'express';
import cors from 'cors';
import { router } from './api/router';
import { APIGatewayEvent } from './api/types';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Convert Express request to APIGatewayEvent and route through our router
app.all('*', async (req, res) => {
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
    
    // Set headers from response
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    
    res.status(response.statusCode);
    
    if (response.body) {
      // If body is JSON string, parse and send as JSON
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
🚀 Cantina POS Backend Server
📡 Running at: http://localhost:${PORT}
🏥 Health check: http://localhost:${PORT}/health
📝 API endpoints: http://localhost:${PORT}/*

Ready to receive requests!
  `);
});
