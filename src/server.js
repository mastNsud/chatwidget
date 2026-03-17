// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const { Pool } = require('pg');
const twilio = require('twilio');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// DB Connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID ? twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
) : null;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
});

// OpenRouter Models (Free with fallback)
const MODELS = [
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free'
];

async function callOpenRouter(messages, modelIndex = 0) {
  if (modelIndex >= MODELS.length) {
    throw new Error('All models failed');
  }

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: MODELS[modelIndex],
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'AI Chatbot Service'
      },
      timeout: 10000
    });

    return {
      text: response.data.choices[0].message.content,
      model: MODELS[modelIndex],
      usage: response.data.usage
    };
  } catch (error) {
    logger.warn(`Model ${MODELS[modelIndex]} failed: ${error.message}. Retrying with fallback...`);
    return callOpenRouter(messages, modelIndex + 1);
  }
}

// Routes
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

app.post('/api/chat/:clientId', chatLimiter, async (req, res) => {
  try {
    let { clientId } = req.params;
    const { message, conversationId, visitorId } = req.body;
    
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Client lookup with UUID validation and default fallback
    let clientResult;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId);

    if (isUuid) {
      clientResult = await db.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    } else {
      // Fallback for 'default-client' or invalid UUIDs: Pick the most recent client
      clientResult = await db.query('SELECT * FROM clients ORDER BY created_at DESC LIMIT 1');
    }
    
    if (clientResult.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    const client = clientResult.rows[0];
    clientId = client.id; // Ensure we use the actual UUID for subsequent DB calls

    // Get knowledge base from file if specified, else from DB
    let knowledgeBase = client.knowledge_base;
    try {
      const kbFile = path.join(__dirname, '..', 'knowledge.txt');
      if (fs.existsSync(kbFile)) {
        knowledgeBase = fs.readFileSync(kbFile, 'utf8') + "\n\nClient Specific context:\n" + knowledgeBase;
      }
    } catch (e) {
      logger.error('Error reading knowledge.txt', e);
    }

    // Conversation management
    let convId = conversationId;
    if (!convId) {
      const res = await db.query(
        'INSERT INTO conversations (client_id, visitor_id) VALUES ($1, $2) RETURNING id',
        [clientId, visitorId || 'anonymous']
      );
      convId = res.rows[0].id;
    }

    const history = await db.query(
      'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [convId]
    );

    const messages = [
      { role: 'system', content: `You are a helpful AI assistant for ${client.name}. \n\nKnowledge Base:\n${knowledgeBase}\n\nGuidelines:\n1. Be helpful and expert.\n2. Naturally collect Name, Email, Phone.\n3. Mobile friendly responses (concise).` },
      ...history.rows.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const aiResponse = await callOpenRouter(messages);

    // Save
    await db.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', [convId, 'user', message]);
    await db.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', [convId, 'assistant', aiResponse.text]);

    // Simple extraction
    const leadData = extractLeadInfo(aiResponse.text, message);
    if (leadData.name || leadData.email || leadData.phone) {
       // Update lead data logic here
    }

    res.json({
      message: aiResponse.text,
      conversationId: convId,
      model: aiResponse.model
    });

  } catch (error) {
    logger.error('Chat Error:', error);
    res.status(500).json({ error: 'System error', message: 'Something went wrong.' });
  }
});

function extractLeadInfo(aiText, userText) {
  const combined = (aiText + " " + userText).toLowerCase();
  const data = {};
  const emailMatch = combined.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
  if (emailMatch) data.email = emailMatch[0];
  const phoneMatch = combined.match(/(\+91|0)?[6-9]\d{9}/);
  if (phoneMatch) data.phone = phoneMatch[0];
  return data;
}

app.listen(PORT, () => logger.info(`🚀 Server on ${PORT}`));
