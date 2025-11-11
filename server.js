// Ask AYO v3 Backend - AI-Powered Financial Explainer
// Now with "Real Talk" translations!

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// CORS configuration - allow all origins for Chrome extension
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parser
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Main explanation endpoint
app.post('/api/explain', async (req, res) => {
  try {
    const { text, context } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    // Call OpenAI to analyze and explain
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are Ask AYO, a friendly financial explainer for young professionals in the UK and Europe.

Your job is to determine if the highlighted text is financial jargon, and if so, explain it in TWO parts:

1. **Definition**: A clear, accurate explanation (1-2 sentences)
2. **Real Talk**: A warm, relatable translation that makes it click instantly

REAL TALK TONE GUIDELINES:
- Like Sandra Bullock explaining to a friend - warm intelligence, not performative cleverness
- Use relatable analogies from everyday life
- UK/European sensibility (avoid American slang like "y'all", "awesome sauce")
- Slightly knowing, never silly or patronizing
- Honest about how things actually work
- 1-2 sentences maximum
- Make it memorable and instantly understandable

GOOD EXAMPLES:
- "Everyone thinks they're above average — math disagrees"
- "Umbrella covers, but your shoes still get wet"
- "Stop digging when in a hole"
- "Money is money — labels are traps"

AVOID:
- Overly silly analogies (no "Voltron for businesses")
- Corporate jargon
- Being condescending
- Trying too hard to be funny

If it's NOT financial jargon, politely say so.

Format your response as JSON:
{
  "isFinancial": true/false,
  "term": "the term",
  "definition": "clear explanation",
  "realTalk": "warm, relatable translation",
  "message": "if not financial, explain why"
}`
        },
        {
          role: 'user',
          content: `Highlighted text: "${text}"\nContext: "${context || 'No context provided'}"\n\nIs this financial jargon? If yes, explain it with both a definition and Real Talk translation.`
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const response = completion.choices[0].message.content;
    
    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(response);
    } catch (e) {
      // If JSON parsing fails, create a structured response
      parsed = {
        isFinancial: true,
        term: text,
        definition: response,
        realTalk: null
      };
    }

    if (parsed.isFinancial) {
      // Format the explanation with Definition and Real Talk
      let explanation = `**${parsed.definition}**`;
      
      if (parsed.realTalk) {
        explanation += `\n\n💬 **Real Talk:** ${parsed.realTalk}`;
      }
      
      res.json({
        success: true,
        isFinancial: true,
        term: parsed.term || text,
        explanation: explanation
      });
    } else {
      res.json({
        success: true,
        isFinancial: false,
        message: parsed.message || "This doesn't appear to be financial jargon. Try highlighting terms like 'dividend', 'equity', or 'portfolio'."
      });
    }

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate explanation'
    });
  }
});

// Feedback endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    const { term, helpful, timestamp } = req.body;
    
    // Log feedback (in production, save to database)
    console.log('Feedback received:', { term, helpful, timestamp });
    
    res.json({
      success: true,
      message: 'Feedback recorded'
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record feedback'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
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
  console.log(`🎯 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
