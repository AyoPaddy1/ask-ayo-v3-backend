const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS first to avoid conflicts
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour per IP
  message: { success: false, error: 'Too many requests, please try again later.' }
});

app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// AI Explanation endpoint
app.post('/api/explain', async (req, res) => {
  try {
    const { text, context } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    // Call OpenAI API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful financial assistant. When given text, determine if it contains financial jargon or terms. If yes, provide a simple, clear explanation in 2-3 sentences suitable for beginners. If no, respond with "Not financial jargon". Be concise and friendly.'
          },
          {
            role: 'user',
            content: context 
              ? `Explain this financial term: "${text}" (used in context: "${context}")`
              : `Explain this financial term: "${text}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get explanation from AI'
      });
    }

    const data = await response.json();
    const explanation = data.choices[0].message.content.trim();

    // Check if it's not financial jargon
    if (explanation.toLowerCase().includes('not financial jargon')) {
      return res.json({
        success: true,
        isFinancial: false,
        message: "This doesn't appear to be financial jargon."
      });
    }

    // Log for analytics (optional)
    console.log(`Explained: "${text}"`);

    res.json({
      success: true,
      isFinancial: true,
      term: text,
      explanation: explanation
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ask AYO v3 API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
