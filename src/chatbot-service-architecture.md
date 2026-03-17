# AI-Powered Lead Generation Chatbot Service
## Tech Architecture & Business Plan

---

## Executive Summary

A context-aware chatbot service that extracts target information from prospects while delivering value through intelligent responses powered by a knowledge base. Deployable as an embeddable widget or custom landing page with instant WhatsApp lead notifications and daily reports.

**Target Market**: Small-to-medium businesses in India needing automated lead qualification
**Deployment**: Railway (Hobby Plan optimized)
**Tech Stack**: Anthropic Claude API + Railway + WhatsApp Business API

---

## 1. TECHNICAL ARCHITECTURE

### 1.1 Core Stack

```
Frontend: React + Tailwind CSS (embeddable widget + standalone page)
Backend: Node.js/Express (lightweight, Railway-optimized)
Database: PostgreSQL (Railway managed, included in hobby plan)
AI Engine: Claude Haiku 4.5 (cost-optimized)
Deployment: Railway Hobby Plan
Notifications: WhatsApp Business API (via Twilio/MessageBird)
```

### 1.2 Railway Hobby Plan Optimization

**Plan Limits:**
- Cost: $5/month base + usage over $5
- CPU: 8 vCPU max per service
- RAM: 8GB max per service
- Storage: 5GB per volume
- Projects: Unlimited
- Services: 100 max

**Optimization Strategy:**

**Per-Client Architecture:**
- Each client gets their own Railway project (within 100 service limit)
- Single lightweight service per client (~200-500MB RAM)
- Shared PostgreSQL instance with client-specific schemas
- Estimated capacity: **30-40 clients per Railway account** before hitting practical limits

**Resource Allocation Per Client:**
- Backend service: 256-512MB RAM, 0.5 vCPU
- Database: Shared PostgreSQL (20-50MB per client schema)
- Total per client: ~$0.50-$2/month in Railway costs

**Cost Structure:**
- With $5 included usage, you can serve **5-8 low-traffic clients** within the base plan
- Beyond that: ~$1-2 per additional client per month
- For 20 clients: ~$5 base + $20-30 usage = **$25-35/month total Railway cost**

### 1.3 Claude API Cost Optimization

**Model Selection: Claude Haiku 4.5**
- Input: $1 per million tokens
- Output: $5 per million tokens
- Perfect for conversational chatbots with moderate context

**Per-Client Monthly Estimates:**
- Average conversation: 500 input + 300 output tokens
- 500 conversations/month: ~$1.00 in API costs
- With knowledge base caching: ~$0.50-$0.75

**Prompt Caching Strategy:**
```javascript
// Cache the knowledge base (updated weekly)
system: [
  {
    type: "text",
    text: knowledgeBase,
    cache_control: { type: "ephemeral" }
  }
]
// 90% cost savings on repeated context
```

**Total API Cost Per Client:** $0.50-$1.50/month (for 500 conversations)

---

## 2. SYSTEM ARCHITECTURE

### 2.1 Component Design

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT WEBSITE                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  <script src="https://widget.yourservice.com/        │  │
│  │          client-id.js"></script>                     │  │
│  │                                                       │  │
│  │  [Chat Widget - Bottom Right Corner]                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              RAILWAY BACKEND (Per Client Service)           │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │  Express API   │→ │  Claude Haiku  │→ │  PostgreSQL   │ │
│  │  (Chat Logic)  │  │  (AI Engine)   │  │  (Chat Log)   │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│           │                                       │         │
│           ↓                                       ↓         │
│  ┌────────────────┐                     ┌───────────────┐  │
│  │ WhatsApp API   │                     │ Daily Report  │  │
│  │ (Instant Lead) │                     │ Generator     │  │
│  └────────────────┘                     └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **User Interaction**: Visitor opens chat on client website
2. **Context Loading**: System loads client knowledge base (cached)
3. **Conversation**: Claude responds contextually while extracting lead info
4. **Lead Detection**: System identifies when key info is collected (name, email, phone, intent)
5. **Instant Notification**: WhatsApp message to client with lead details
6. **Storage**: Conversation logged to PostgreSQL with lead scoring
7. **Daily Report**: Aggregated report sent at EOD with all leads

### 2.3 Lead Extraction Strategy

**Information Targets:**
- Name (required)
- Email (required)
- Phone (required)
- Location
- Budget/Timeline
- Specific interest/requirement
- Urgency level

**Extraction Approach:**
```javascript
// Intelligent extraction without feeling like a form
system_prompt: `You are a helpful assistant for ${clientName}. 
Your goal is to naturally gather: name, email, phone, and ${specific_info}
while helping the user. Never ask all at once. Be conversational.
Extract information from context when possible.`
```

---

## 3. FEATURE SET

### 3.1 Core Features

**1. Embeddable Widget**
- Customizable colors/branding per client
- Responsive design (mobile + desktop)
- Minimizable chat interface
- Typing indicators, read receipts
- File upload capability (for property images, etc.)

**2. Knowledge Base Management**
- Client-specific knowledge.txt upload
- Automatic semantic chunking
- Prompt caching for cost efficiency
- Update via dashboard (regenerates cache)

**3. Lead Notifications**
- Instant WhatsApp to client on lead capture
- Customizable notification templates
- Lead quality scoring (hot/warm/cold)
- Escalation for high-intent leads

**4. Analytics Dashboard**
- Daily/weekly/monthly reports
- Conversation analytics
- Lead conversion tracking
- Cost breakdown per conversation

**5. Custom Landing Page**
- Optional standalone chat page
- Shareable link for social media
- Embedded on client's domain or subdomain
- Same chat experience as widget

### 3.2 Advanced Features (Upsell)

- Multi-language support (Hindi, Telugu, English)
- Voice message support
- Calendar integration for appointment booking
- CRM integration (basic webhooks)
- A/B testing different conversation strategies

---

## 4. PRICING MODEL

### 4.1 Cost Analysis Per Client

**Monthly Costs:**
- Railway hosting: $1-2
- Claude API: $0.50-$1.50
- WhatsApp messages: $0.10-$0.50 (50-100 notifications)
- Total: **$2-4 per client per month**

### 4.2 Revenue Model

**Setup Fee:** ₹15,000-25,000 ($180-300) one-time
- Custom knowledge base creation
- Widget customization
- WhatsApp integration
- Training session
- 1 month included

**Monthly Service:** ₹2,500-5,000 ($30-60) per month
- Hosting & maintenance
- 500 conversations included
- Daily reports
- WhatsApp notifications
- Knowledge base updates (2/month)

**Overage:** ₹5 ($0.06) per conversation beyond 500

**Profit Margin Per Client:**
- Setup: ₹15,000 - ₹2,000 (time) = ₹13,000 profit
- Monthly: ₹3,500 - ₹300 (costs) = ₹3,200 profit
- Annual per client: ₹51,400 ($620) profit

### 4.3 Scaling Economics

**20 Clients:**
- Setup revenue: ₹3,00,000 (one-time)
- Monthly recurring: ₹70,000/month
- Annual recurring: ₹8,40,000
- Total costs: ₹72,000/year (Railway + APIs)
- **Net profit: ₹10,68,000/year ($12,800)**

**40 Clients (near Railway limit):**
- Setup revenue: ₹6,00,000 (one-time)
- Monthly recurring: ₹1,40,000/month
- Annual recurring: ₹16,80,000
- Total costs: ₹1,80,000/year
- **Net profit: ₹21,00,000/year ($25,200)**

---

## 5. IMPLEMENTATION PLAN

### 5.1 MVP Development (Week 1-2)

**Week 1:**
- Express backend setup
- Claude API integration with prompt caching
- PostgreSQL schema design
- Basic chat interface (React)

**Week 2:**
- Widget embeddable code
- WhatsApp integration
- Dashboard for client management
- Knowledge base upload/processing

### 5.2 Beta Testing (Week 3-4)

- Deploy 2-3 pilot clients
- Gather feedback
- Optimize conversation flow
- Tune lead extraction accuracy

### 5.3 Production Launch (Week 5+)

- Marketing materials
- Demo environment
- Sales outreach
- Onboarding process automation

---

## 6. TECHNICAL SPECIFICATIONS

### 6.1 Backend Structure

```javascript
// server.js (Express)
const express = require('express');
const { Anthropic } = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const app = express();
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Chat endpoint
app.post('/api/chat/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { message, conversationId } = req.body;
  
  // Load knowledge base (cached)
  const knowledge = await getKnowledgeBase(clientId);
  
  // Load conversation history
  const history = await getHistory(conversationId);
  
  // Call Claude with caching
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-20250514",
    max_tokens: 1000,
    system: [
      {
        type: "text",
        text: knowledge,
        cache_control: { type: "ephemeral" }
      },
      {
        type: "text",
        text: `Extract: name, email, phone, ${clientConfig.extractionFields}`
      }
    ],
    messages: [...history, { role: "user", content: message }]
  });
  
  // Extract lead info
  const leadData = extractLeadInfo(response.content);
  
  // If lead complete, notify
  if (isLeadComplete(leadData)) {
    await notifyWhatsApp(clientId, leadData);
    await scoreAndStore(leadData);
  }
  
  res.json({ message: response.content, leadStatus: leadData });
});
```

### 6.2 Widget Code

```javascript
// widget.js (embeddable)
(function() {
  const clientId = 'CLIENT_ID_HERE';
  const widgetUrl = 'https://widget.yourservice.com';
  
  // Inject chat widget
  const script = document.createElement('div');
  script.innerHTML = `
    <div id="chat-widget" style="position:fixed;bottom:20px;right:20px;z-index:9999">
      <iframe src="${widgetUrl}/chat/${clientId}" 
              width="400" height="600" frameborder="0">
      </iframe>
    </div>
  `;
  document.body.appendChild(script);
})();
```

### 6.3 Database Schema

```sql
-- clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  domain VARCHAR(255),
  knowledge_base TEXT,
  whatsapp_number VARCHAR(20),
  config JSONB,
  created_at TIMESTAMP
);

-- conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  visitor_id VARCHAR(255),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  lead_score INTEGER,
  lead_data JSONB
);

-- messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  role VARCHAR(10), -- 'user' or 'assistant'
  content TEXT,
  created_at TIMESTAMP
);

-- leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  conversation_id UUID REFERENCES conversations(id),
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  extracted_data JSONB,
  score INTEGER,
  status VARCHAR(20),
  created_at TIMESTAMP
);
```

---

## 7. OPERATIONAL GUIDELINES

### 7.1 Client Onboarding Process

1. **Sales Demo** (30 mins)
   - Live chat demonstration
   - Show sample reports
   - Explain pricing

2. **Contract Signed** 
   - Payment: 50% setup + 1st month
   - Delivery timeline: 3-5 days

3. **Onboarding** (1-2 days)
   - Collect knowledge base material
   - Brand customization (colors, logo)
   - WhatsApp number verification
   - Define lead extraction fields

4. **Deployment** (1 day)
   - Widget code generation
   - Installation assistance
   - Testing on staging

5. **Training** (1 hour)
   - Dashboard walkthrough
   - Reading reports
   - Updating knowledge base
   - Support channels

### 7.2 Support & Maintenance

- **Email Support**: 24-48 hour response
- **WhatsApp Support**: Business hours (critical issues)
- **Monthly Review**: Performance call with client
- **Knowledge Base Updates**: Client can update 2x/month
- **Uptime SLA**: 99.5% (Railway standard)

### 7.3 Scaling Operations

**At 20 Clients:**
- 1 developer (full-time)
- 1 support person (part-time)
- Automated monitoring
- Self-service dashboard

**At 40 Clients:**
- 1 developer (full-time)
- 1 support person (full-time)
- 1 sales/onboarding (part-time)
- Upgrade to Railway Pro plan ($20/month base)

**At 60+ Clients:**
- Need second Railway account OR
- Upgrade to Railway Team plan
- Consider multi-tenant architecture

---

## 8. RISK MITIGATION

### 8.1 Technical Risks

**Railway Limits:**
- Monitor usage dashboard weekly
- Set alerts at 80% capacity
- Plan migration to Railway Pro at 35 clients

**API Costs:**
- Implement usage caps per client (500 conv/month)
- Alert clients approaching limit
- Use prompt caching aggressively

**Downtime:**
- Railway has 99.5% uptime
- Implement health check endpoint
- Client notification for major outages

### 8.2 Business Risks

**Client Churn:**
- Deliver monthly value report
- Regular check-ins
- Quick issue resolution
- Continuous feature updates

**Quality Control:**
- Review chat transcripts monthly
- Optimize conversation flow
- A/B test lead extraction approaches

---

## 9. COMPETITIVE ADVANTAGES

1. **India-Focused**: Multi-language support, local payment methods
2. **Cost-Effective**: ₹3,500/month vs ₹10,000+ for alternatives
3. **Easy Setup**: 3-5 days vs weeks for custom development
4. **WhatsApp Integration**: Instant notifications via preferred channel
5. **Knowledge Base**: Client controls content, not generic responses
6. **No Vendor Lock-In**: Client owns their data, can export anytime

---

## 10. SUCCESS METRICS

### 10.1 Technical KPIs

- Widget load time: <2 seconds
- API response time: <1 second
- Uptime: >99.5%
- Lead extraction accuracy: >85%
- Cost per conversation: <₹5

### 10.2 Business KPIs

- Client acquisition: 5-10/month target
- Client retention: >90% annually
- Average setup fee: ₹20,000
- Average monthly fee: ₹3,500
- Profit margin: >80%

---

## NEXT STEPS

1. ✅ Develop MVP (2 weeks)
2. ✅ Deploy 3 beta clients (2 weeks)
3. ✅ Gather feedback and iterate (1 week)
4. ✅ Create marketing materials (1 week)
5. ✅ Begin outbound sales (ongoing)
6. ✅ Target: 10 clients in first 3 months

---

## APPENDIX: Railway Hobby Plan Details

**Included Resources:**
- $5 monthly credit (resets each cycle)
- Pay only for usage beyond $5
- No hard limits, but soft caps:
  - 8GB RAM per service
  - 8 vCPU per service
  - 5GB storage per volume

**Billing:**
- Per-second billing for compute
- ~$10/GB/month for memory
- ~$20/vCPU/month for CPU
- ~$0.16/GB/month for storage

**Best Practices:**
- Use lightweight services
- Optimize memory usage
- Use shared databases where possible
- Monitor usage dashboard regularly

**When to Upgrade to Pro ($20/month):**
- Approaching 100 services limit
- Need priority support
- Want team collaboration features
- Usage consistently >$50/month

