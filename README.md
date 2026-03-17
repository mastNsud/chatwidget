# AI Lead Generation Chatbot Service 🤖

A context-aware AI chatbot service for lead generation with instant WhatsApp notifications and daily reports. Built with Claude Haiku 4.5, optimized for Railway Hobby Plan.

## 🎯 Features

- **Embeddable Widget**: Easy integration with any website
- **Knowledge Base**: Upload custom Q&A content per client
- **Lead Extraction**: Natural conversation-based information gathering
- **WhatsApp Notifications**: Instant alerts on lead capture
- **Daily Reports**: Automated analytics and summaries
- **Cost Optimized**: Prompt caching for 90% cost savings
- **Multi-Client**: Support 30-40 clients on Railway Hobby Plan

## 🏗️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **AI**: Anthropic Claude Haiku 4.5
- **Notifications**: Twilio WhatsApp API
- **Deployment**: Railway
- **Frontend**: React (widget)

## 📋 Prerequisites

- Node.js 20+ installed
- Railway account ([signup here](https://railway.app))
- Anthropic API key ([get here](https://console.anthropic.com))
- Twilio account for WhatsApp ([setup guide](https://www.twilio.com/docs/whatsapp))

## 🚀 Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <your-repo-url>
cd ai-lead-chatbot-service
npm install
\`\`\`

### 2. Environment Setup

\`\`\`bash
cp .env.example .env
# Edit .env with your credentials
\`\`\`

Required variables:
- `CLAUDE_API_KEY`: Your Anthropic API key
- `DATABASE_URL`: PostgreSQL connection string
- `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN`: Twilio credentials
- `TWILIO_WHATSAPP_NUMBER`: Your Twilio WhatsApp number

### 3. Local Development

\`\`\`bash
# Start PostgreSQL (or use Railway for dev database)
# Run migrations
npm run migrate

# Start development server
npm run dev
\`\`\`

Server runs on http://localhost:3000

### 4. Test the API

\`\`\`bash
# Health check
curl http://localhost:3000/health

# Widget config
curl http://localhost:3000/api/widget/<sample-client-id>

# Send a test message
curl -X POST http://localhost:3000/api/chat/<sample-client-id> \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi, I am interested in properties"}'
\`\`\`

## 🚂 Railway Deployment

### Option A: CLI Deployment

\`\`\`bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add

# Set environment variables
railway variables set CLAUDE_API_KEY=sk-ant-xxx
railway variables set TWILIO_ACCOUNT_SID=xxx
railway variables set TWILIO_AUTH_TOKEN=xxx
railway variables set TWILIO_WHATSAPP_NUMBER=+1xxx

# Deploy
railway up

# Run migrations
railway run npm run migrate
\`\`\`

### Option B: GitHub Integration

1. Push code to GitHub
2. Go to [Railway Dashboard](https://railway.app/dashboard)
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Add PostgreSQL database
6. Set environment variables in Railway dashboard
7. Deploy automatically on push

### Railway Configuration

Create `railway.json` in project root:

\`\`\`json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
\`\`\`

## 📊 Cost Breakdown

### Per Client Monthly Costs
- Railway hosting: $1-2
- Claude API: $0.50-$1.50 (500 conversations)
- WhatsApp API: $0.10-$0.50
- **Total: $2-4 per client**

### Revenue Model
- Setup fee: ₹18,000-22,000 ($215-265)
- Monthly fee: ₹3,500-4,500 ($42-54)
- **Profit: ~80% margin**

### Scaling on Railway Hobby Plan
- **Max clients**: 30-40 (before hitting limits)
- **Monthly cost**: $25-35 for 20 clients
- **Upgrade to Pro**: When reaching 35+ clients

## 🎨 Client Onboarding

### 1. Create Client

\`\`\`bash
npm run generate-client --name="Real Estate Agency" --domain="example.com"
\`\`\`

This generates:
- Client ID
- Widget embed code
- Knowledge base template

### 2. Customize Knowledge Base

Edit the knowledge base in database or admin dashboard:

\`\`\`sql
UPDATE clients 
SET knowledge_base = 'Your custom Q&A content here...'
WHERE id = '<client-id>';
\`\`\`

### 3. Widget Integration

Provide client with embed code:

\`\`\`html
<!-- Add before closing </body> tag -->
<script src="https://your-service.railway.app/widget.js"></script>
<script>
  ChatWidget.init({
    clientId: 'YOUR-CLIENT-ID',
    position: 'bottom-right'
  });
</script>
\`\`\`

## 📱 WhatsApp Setup

1. Sign up for [Twilio](https://www.twilio.com/try-twilio)
2. Enable WhatsApp in Twilio Console
3. Follow [WhatsApp setup guide](https://www.twilio.com/docs/whatsapp/quickstart/node)
4. Get your credentials:
   - Account SID
   - Auth Token
   - WhatsApp-enabled number
5. Set in Railway environment variables

## 🔧 API Endpoints

### Chat
\`POST /api/chat/:clientId\`
- Body: `{ message, conversationId?, visitorId? }`
- Response: `{ message, conversationId, leadStatus }`

### Widget Config
\`GET /api/widget/:clientId\`
- Response: `{ companyName, colors, greeting, position }`

### Leads
\`GET /api/leads/:clientId\`
- Query: `?status=new&limit=50&offset=0`
- Response: `{ leads: [...], total }`

### Reports
\`GET /api/reports/:clientId\`
- Query: `?startDate=2024-01-01&endDate=2024-01-31&type=daily`
- Response: `{ reports: [...], summary }`

## 📈 Monitoring

### Built-in Logging
- Winston logger writes to `combined.log` and `error.log`
- View logs in Railway dashboard

### Cost Tracking
- API usage logged per client per day
- Check `api_usage` table for costs
- Set up alerts for high usage

### Performance Metrics
- Response time
- Conversation count
- Lead conversion rate
- API cost per conversation

## 🛡️ Security

- Rate limiting (100 req/min per endpoint)
- CORS configuration
- Helmet.js security headers
- Environment variable encryption
- Database connection SSL in production

## 🐛 Troubleshooting

### Widget not loading
- Check CORS settings
- Verify client ID is correct
- Ensure Railway service is running

### WhatsApp not sending
- Verify Twilio credentials
- Check WhatsApp number format (+1xxxxxxxxxx)
- Ensure client's WhatsApp number is verified

### High API costs
- Check for conversation loops
- Verify prompt caching is enabled
- Review knowledge base size (should be <50KB)

### Database connection issues
- Verify DATABASE_URL in Railway
- Check SSL configuration
- Test connection: `railway run psql`

## 📚 Documentation

- [Architecture Overview](./chatbot-service-architecture.md)
- [Prospect List](./initial-prospects-list.md)
- [Railway Config](./railway-deployment-config.json)
- [Anthropic Docs](https://docs.anthropic.com)
- [Railway Docs](https://docs.railway.app)

## 🤝 Support

- Email: support@yourservice.com
- WhatsApp: +91-XXXXXXXXXX
- Documentation: docs.yourservice.com

## 📄 License

MIT License - feel free to use for your business

## 🎯 Next Steps

1. ✅ Deploy to Railway
2. ✅ Set up first client
3. ✅ Test widget integration
4. ✅ Configure WhatsApp notifications
5. ✅ Monitor performance
6. ✅ Scale to 10+ clients
7. ✅ Build admin dashboard (optional)

---

Built with ❤️ for Indian SMBs | Powered by Claude AI
