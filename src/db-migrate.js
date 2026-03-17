// src/db/migrate.js
// Database migration script for PostgreSQL

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migration...');
    
    await client.query('BEGIN');
    
    // Create clients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255),
        knowledge_base TEXT,
        whatsapp_number VARCHAR(20),
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created clients table');
    
    // Create conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        visitor_id VARCHAR(255),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        lead_score INTEGER DEFAULT 0,
        lead_data JSONB DEFAULT '{}',
        total_messages INTEGER DEFAULT 0
      )
    `);
    console.log('✅ Created conversations table');
    
    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(10) CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        tokens_used INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created messages table');
    
    // Create leads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        extracted_data JSONB DEFAULT '{}',
        score INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created leads table');
    
    // Create analytics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        total_conversations INTEGER DEFAULT 0,
        total_leads INTEGER DEFAULT 0,
        hot_leads INTEGER DEFAULT 0,
        warm_leads INTEGER DEFAULT 0,
        cold_leads INTEGER DEFAULT 0,
        avg_conversation_length FLOAT,
        api_cost FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, date)
      )
    `);
    console.log('✅ Created analytics table');
    
    // Create api_usage table for cost tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        input_tokens BIGINT DEFAULT 0,
        output_tokens BIGINT DEFAULT 0,
        cost FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, date)
      )
    `);
    console.log('✅ Created api_usage table');
    
    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_conversations_started ON conversations(started_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_analytics_client_date ON analytics(client_id, date)');
    console.log('✅ Created indexes');
    
    // Insert sample client for testing
    const sampleClient = await client.query(`
      INSERT INTO clients (name, domain, knowledge_base, whatsapp_number, config)
      VALUES (
        'Sample Real Estate Agency',
        'sample-realestate.com',
        'We are a leading real estate agency in Vijayawada offering residential and commercial properties. 
        
Our services include:
- Property buying and selling
- Rental services
- Property valuation
- Legal documentation assistance
- Home loan assistance

Featured Properties:
1. 3BHK Apartment in Patamata - ₹45 Lakhs
2. Independent Villa in Benz Circle - ₹85 Lakhs
3. Commercial Space in MG Road - ₹1.2 Crores

Contact us for site visits and more information.',
        '+919876543210',
        '{"colors": {"primary": "#2563eb", "secondary": "#1e40af"}, "greeting": "Hello! Looking for your dream property?", "extraction_focus": "property type, budget, and location preference"}'
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
    
    if (sampleClient.rows.length > 0) {
      console.log('✅ Created sample client:', sampleClient.rows[0].id);
    }
    
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('🎉 Database is ready!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration error:', error);
    process.exit(1);
  });
