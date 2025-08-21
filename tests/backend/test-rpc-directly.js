const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabaseUrl = 'https://kbmsygyawpiqegemzetp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTc3ODgyMiwiZXhwIjoyMDY3MzU0ODIyfQ.Ul6La44d01oi6GYep4fvFOGeP2rBUEh57kfWLDB4uBI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get OpenAI API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testRPCDirectly() {
  console.log('='.repeat(60));
  console.log('TESTING RPC FUNCTION DIRECTLY');
  console.log('='.repeat(60));
  
  const agentId = 'e70a85ac-8480-4b1d-bd15-2d7b817b2399';
  
  // Test different queries
  const queries = [
    "M Residences Katipunan",
    "amenities",
    "FAQ",
    "townhouse",
    "Victor Consunji"
  ];
  
  for (const query of queries) {
    console.log(`\n📝 Testing query: "${query}"`);
    
    try {
      // Create embedding using OpenAI
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });
      const queryEmbedding = embeddingRes.data[0].embedding;
      
      console.log(`   ✅ Created embedding with ${queryEmbedding.length} dimensions`);
      
      // Call RPC function
      const { data, error } = await supabase.rpc('match_agent_embeddings', {
        agent_id_param: agentId,
        query_embedding: queryEmbedding,
        match_count: 3
      });
      
      if (error) {
        console.log(`   ❌ RPC Error: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`   ✅ Found ${data.length} matches:`);
        data.forEach((match, i) => {
          console.log(`      ${i + 1}. Similarity: ${match.similarity.toFixed(4)}`);
          console.log(`         Content: ${match.content.substring(0, 80)}...`);
        });
      } else {
        console.log(`   ⚠️ No matches found (0 results)`);
      }
      
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('RPC TEST COMPLETE');
  console.log('='.repeat(60));
}

testRPCDirectly().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});