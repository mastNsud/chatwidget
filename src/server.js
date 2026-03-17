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

// Client Configurations (The "Secret Code" Mapping)
const CLIENT_CONFIGS = {
  "VIP2026": {
    id: "3abcb41c-0225-43eb-a09a-8dffc432d976", // Matches sample client UUID
    name: "Standard Demo",
    colors: { primary: "#2563eb", secondary: "#1e40af" },
    knowledge: "General AI Chatbot Service information..."
  },
  "REALESTATE": {
    id: "real-estate-demo-uuid",
    name: "Luxury Homes Properties",
    colors: { primary: "#065f46", secondary: "#064e3b" },
    knowledge: "Real Estate focus: buying, selling, and valuation in Vijayawada..."
  }
};

// Logger
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err),
  warn: (msg) => console.warn(`[WARN] ${msg}`)
};

// OpenRouter Models (Priority: Mistral-7B, Fallback: Gemini Flash)
const MODELS = [
  'mistralai/mistral-7b-instruct:free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'google/gemma-2-9b-it:free'
];

// Twilio WhatsApp Helper
async function sendWhatsAppNotification(to, body) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_WHATSAPP_NUMBER || !to) return;
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      body: body
    });
    logger.info(`WhatsApp sent to ${to}`);
  } catch (err) {
    logger.error('WhatsApp failed', err);
  }
}

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
    const { clientId } = req.params; // This is the Access Code now
    const { message, conversationId, visitorId } = req.body;
    
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // 1. Get Client Config (Static First for Speed/Reliability)
    let client = CLIENT_CONFIGS[clientId];
    
    // 2. Fallback to DB if not in static config and DB is ready
    if (!client && isDbReady) {
      const dbRes = await db.query('SELECT * FROM clients WHERE id::text = $1', [clientId]);
      if (dbRes.rows.length > 0) client = dbRes.rows[0];
    }

    // 3. Last Fallback: Default client
    if (!client) {
      client = CLIENT_CONFIGS["VIP2026"];
    }

    // Prepare prompt
    const knowledgeBase = client.knowledge || client.knowledge_base || "";
    const messages = [
      { role: 'system', content: `You are a helpful assistant for ${client.name}.\n\nKB:\n${knowledgeBase}\n\nGOAL: Be concise and collect name/email if possible.` },
      { role: 'user', content: message }
    ];

    const aiResponse = await callOpenRouter(messages);

    // Save to DB in background if ready
    if (isDbReady) {
      db.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', 
        [conversationId || 'temporary', 'user', message]).catch(() => {});
    }

    // WhatsApp Notification on lead detection
    const leadData = extractLeadInfo(aiResponse.text, message);
    if ((leadData.email || leadData.phone) && process.env.ADMIN_WHATSAPP) {
      await sendWhatsAppNotification(process.env.ADMIN_WHATSAPP, 
        `🔥 New Lead for ${client.name}!\n\nEmail: ${leadData.email || 'N/A'}\nPhone: ${leadData.phone || 'N/A'}\nMessage: ${message}`);
    }

    res.json({
      message: aiResponse.text,
      conversationId: conversationId || 'temporary',
      model: aiResponse.model,
      branding: client.colors
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
