const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'BACKEND/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDocumentUpload() {
  console.log('Testing Document Upload System\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Check if storage bucket exists
    console.log('\n1. Checking Storage Buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      console.log('Available buckets:', buckets.map(b => b.name));
      
      const agentDocsBucket = buckets.find(b => b.name === 'agent-documents');
      if (\!agentDocsBucket) {
        console.log('agent-documents bucket not found\! Creating...');
        
        const { data: newBucket, error: createError } = await supabase.storage.createBucket('agent-documents', {
          public: false,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: ['application/pdf', 'text/plain', 'image/jpeg', 'image/png']
        });
        
        if (createError) {
          console.error('Error creating bucket:', createError);
        } else {
          console.log('Created agent-documents bucket successfully');
        }
      } else {
        console.log('agent-documents bucket exists');
      }
    }
    
    // 2. Check agent_documents table
    console.log('\n2. Checking agent_documents table...');
    const { data: docs, error: docsError } = await supabase
      .from('agent_documents')
      .select('*')
      .limit(5);
    
    if (docsError) {
      console.error('Error querying agent_documents:', docsError);
      console.log('Table may need to be created. Check your database schema.');
    } else {
      console.log('agent_documents table exists with', docs ? docs.length : 0, 'documents');
      if (docs && docs.length > 0) {
        console.log('Sample document:', JSON.stringify(docs[0], null, 2));
      }
    }
    
    // 3. Check agent_embeddings table
    console.log('\n3. Checking agent_embeddings table...');
    const { data: embeddings, error: embeddingsError } = await supabase
      .from('agent_embeddings')
      .select('*')
      .limit(5);
    
    if (embeddingsError) {
      console.error('Error querying agent_embeddings:', embeddingsError);
      console.log('agent_embeddings table may need to be created');
    } else {
      console.log('agent_embeddings table exists with', embeddings ? embeddings.length : 0, 'embeddings');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('Summary completed');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testDocumentUpload();
EOF < /dev/null