require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Basic auth routes without database
const authRouter = express.Router();

authRouter.post('/register', (req, res) => {
  res.json({
    success: true,
    message: 'Registration endpoint (mock)',
    data: { user: { id: 1, email: 'test@example.com' } }
  });
});

authRouter.post('/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login endpoint (mock)',
    data: { user: { id: 1, email: 'test@example.com' }, token: 'mock-token' }
  });
});

app.use('/api/auth', authRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Basic Blog Publishing API is running',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Basic Blog Publishing API server is running!');
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});