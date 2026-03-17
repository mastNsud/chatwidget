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

// Trust Railway Proxy
app.set('trust proxy', 1);

// Global state for fail-safes
let isDbReady = false;
let dbError = null;

// Logger (Console Only for maximal compatibility)
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err),
  warn: (msg) => console.warn(`[WARN] ${msg}`)
};

// DB Pool (Initialized but not connecting yet)
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
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Root route to ensure landing page loads
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

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

    // FAIL-SAFE: If DB isn't ready, provide a limited but WORKING experience
    if (!isDbReady) {
      const aiResponse = await callOpenRouter([
        { role: 'system', content: 'You are a helpful assistant. Note: Database is currently in maintenance mode.' },
        { role: 'user', content: message }
      ]);
      return res.json({
        message: aiResponse.text + "\n\n(Note: We're currently in limited mode, but your message was processed!)",
        conversationId: 'temporary',
        model: aiResponse.model
      });
    }

    // Normal flow with DB
    let clientResult;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId);

    if (isUuid) {
      clientResult = await db.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    } else {
      clientResult = await db.query('SELECT * FROM clients ORDER BY created_at DESC LIMIT 1');
    }
    
    if (clientResult.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    const client = clientResult.rows[0];
    clientId = client.id;

    // ... (rest of the logic remains similar but wrapped in try-catches)
    let knowledgeBase = client.knowledge_base;
    try {
      const kbFile = path.join(__dirname, '..', 'knowledge.txt');
      if (fs.existsSync(kbFile)) {
        knowledgeBase = fs.readFileSync(kbFile, 'utf8') + "\n\nClient Specific context:\n" + knowledgeBase;
      }
    } catch (e) { logger.error('Error reading KB', e); }

    let convId = conversationId;
    if (!convId) {
      const dbRes = await db.query('INSERT INTO conversations (client_id, visitor_id) VALUES ($1, $2) RETURNING id', [clientId, visitorId || 'anonymous']);
      convId = dbRes.rows[0].id;
    }

    const history = await db.query('SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [convId]);
    const messages = [
      { role: 'system', content: `You are a helpful assistant for ${client.name}.\n\nKB:\n${knowledgeBase}` },
      ...history.rows.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const aiResponse = await callOpenRouter(messages);

    // Save logs asynchronously to not block user
    db.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', [convId, 'user', message]).catch(e => logger.error('DB Log Error', e));
    db.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', [convId, 'assistant', aiResponse.text]).catch(e => logger.error('DB Log Error', e));

    res.json({
      message: aiResponse.text,
      conversationId: convId,
      model: aiResponse.model
    });

  } catch (error) {
    logger.error('Chat Error:', error);
    res.json({ 
      message: "I'm currently undergoing some maintenance. [Work in Progress]", 
      isSystemMessage: true 
    });
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

// Improved in-app migration
async function runBackgroundMigration() {
  const client = await db.connect();
  try {
    logger.info('🔄 Running background migration...');
    await client.query(`CREATE TABLE IF NOT EXISTS clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, domain VARCHAR(255), knowledge_base TEXT, whatsapp_number VARCHAR(20), config JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await client.query(`CREATE TABLE IF NOT EXISTS conversations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID REFERENCES clients(id) ON DELETE CASCADE, visitor_id VARCHAR(255), started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ended_at TIMESTAMP, lead_score INTEGER DEFAULT 0, lead_data JSONB DEFAULT '{}', total_messages INTEGER DEFAULT 0)`);
    await client.query(`CREATE TABLE IF NOT EXISTS messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE, role VARCHAR(10) CHECK (role IN ('user', 'assistant')), content TEXT NOT NULL, tokens_used INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await client.query(`CREATE TABLE IF NOT EXISTS leads (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID REFERENCES clients(id) ON DELETE CASCADE, conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL, name VARCHAR(255), email VARCHAR(255), phone VARCHAR(20), extracted_data JSONB DEFAULT '{}', score INTEGER DEFAULT 0, status VARCHAR(20) DEFAULT 'new', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    
    // Ensure at least one client exists
    await client.query(`INSERT INTO clients (name, knowledge_base) VALUES ('Default Client', 'General knowledge...') ON CONFLICT DO NOTHING`);
    
    isDbReady = true;
    logger.info('✅ Database Ready');
  } catch (err) {
    dbError = err.message;
    logger.error('⚠️ Database migration failed, using limited mode:', err.message);
  } finally {
    client.release();
  }
}

// Start Server Immediately
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server listening on 0.0.0.0:${PORT}`);
  runBackgroundMigration().catch(e => logger.error('Migration crash', e));
});
