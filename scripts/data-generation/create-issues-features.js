const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Issue templates - 2 per organization
const issueTemplates = [
  // Prime Residential Realty
  {
    org_name: 'Prime Residential Realty',
    issues: [
      {
        title: 'Chat widget not loading on mobile devices',
        description: 'Several customers reported that the chat widget fails to load on mobile browsers, particularly on iOS Safari. This is affecting our lead conversion rate.',
        priority: 'high',
        status: 'open',
        category: 'bug'
      },
      {
        title: 'Lead notifications delayed by 10-15 minutes',
        description: 'Email notifications for new hot leads are arriving 10-15 minutes late, causing delays in agent response times.',
        priority: 'medium',
        status: 'open',
        category: 'performance'
      }
    ]
  },
  // Commercial Property Experts
  {
    org_name: 'Commercial Property Experts',
    issues: [
      {
        title: 'BANT scoring inconsistent for commercial inquiries',
        description: 'The BANT scoring system seems to misclassify commercial property inquiries, marking qualified businesses as cold leads.',
        priority: 'high',
        status: 'in_progress',
        category: 'bug'
      },
      {
        title: 'Unable to export leads to CSV format',
        description: 'The export function throws an error when trying to download leads in CSV format. Excel export works fine.',
        priority: 'low',
        status: 'open',
        category: 'feature'
      }
    ]
  },
  // Luxury Estate Partners
  {
    org_name: 'Luxury Estate Partners',
    issues: [
      {
        title: 'AI agent responses too generic for luxury market',
        description: 'The AI responses don\'t reflect the premium nature of our properties. Need more sophisticated language and luxury-specific features.',
        priority: 'medium',
        status: 'open',
        category: 'enhancement'
      },
      {
        title: 'Image attachments not displaying in conversation history',
        description: 'When clients send property images through chat, they don\'t appear in the conversation history on the dashboard.',
        priority: 'high',
        status: 'open',
        category: 'bug'
      }
    ]
  },
  // Urban Rental Solutions
  {
    org_name: 'Urban Rental Solutions',
    issues: [
      {
        title: 'Duplicate conversations created for same visitor',
        description: 'When a visitor refreshes the page, a new conversation is created instead of continuing the existing one.',
        priority: 'high',
        status: 'open',
        category: 'bug'
      },
      {
        title: 'Dashboard analytics showing incorrect conversion rates',
        description: 'The conversion rate calculation appears to be wrong - showing 150% conversion which is impossible.',
        priority: 'medium',
        status: 'in_progress',
        category: 'bug'
      }
    ]
  }
];

// Feature request templates - 1 per organization
const featureTemplates = [
  {
    org_name: 'Prime Residential Realty',
    feature: {
      title: 'Integration with Zillow and Realtor.com',
      description: 'It would be extremely valuable to have direct integration with Zillow and Realtor.com to automatically pull property listings and sync lead information.',
      priority: 'medium',
      status: 'under_review',
      category: 'integration'
    }
  },
  {
    org_name: 'Commercial Property Experts',
    feature: {
      title: 'Multi-language support for international clients',
      description: 'We have many international business clients. Adding support for Spanish, Mandarin, and French would significantly expand our reach.',
      priority: 'high',
      status: 'planned',
      category: 'enhancement'
    }
  },
  {
    org_name: 'Luxury Estate Partners',
    feature: {
      title: 'Virtual property tour scheduling within chat',
      description: 'Allow the AI agent to schedule virtual property tours directly within the chat interface, integrated with our calendar system.',
      priority: 'high',
      status: 'under_review',
      category: 'feature'
    }
  },
  {
    org_name: 'Urban Rental Solutions',
    feature: {
      title: 'Automated rental application processing',
      description: 'Integrate rental application forms that the AI can help tenants complete, with automatic background check initiation.',
      priority: 'medium',
      status: 'under_review',
      category: 'automation'
    }
  }
];

async function createIssuesAndFeatures() {
  console.log('📝 Starting issues and feature requests creation...');
  const createdIssues = [];
  const createdFeatures = [];
  
  try {
    // Get all organizations with their members
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*');
    
    if (orgsError) {
      throw orgsError;
    }
    
    // Create issues
    console.log('\n🐛 Creating issues...');
    for (const template of issueTemplates) {
      const org = orgs.find(o => o.name === template.org_name);
      
      if (!org) {
        console.error(`❌ Organization not found: ${template.org_name}`);
        continue;
      }
      
      // Get a random agent from this organization to report the issue
      const { data: members, error: memberError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', org.id)
        .eq('role', 'agent');
      
      if (memberError || !members || members.length === 0) {
        console.error(`❌ No agents found for ${org.name}`);
        continue;
      }
      
      for (const issue of template.issues) {
        // Pick a random agent as the reporter
        const reporter = members[Math.floor(Math.random() * members.length)];
        
        const issueData = {
          organization_id: org.id,
          reported_by: reporter.user_id,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          status: issue.status,
          category: issue.category,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: newIssue, error: issueError } = await supabase
          .from('issues')
          .insert(issueData)
          .select()
          .single();
        
        if (issueError) {
          console.error(`❌ Error creating issue:`, issueError);
          continue;
        }
        
        createdIssues.push(newIssue);
        console.log(`✅ Created issue: "${issue.title}" for ${org.name}`);
      }
    }
    
    // Create feature requests
    console.log('\n✨ Creating feature requests...');
    for (const template of featureTemplates) {
      const org = orgs.find(o => o.name === template.org_name);
      
      if (!org) {
        console.error(`❌ Organization not found: ${template.org_name}`);
        continue;
      }
      
      // Get the admin user for this organization to request the feature
      const { data: adminMember, error: memberError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', org.id)
        .eq('role', 'admin')
        .single();
      
      if (memberError || !adminMember) {
        console.error(`❌ Admin not found for ${org.name}`);
        continue;
      }
      
      const featureData = {
        organization_id: org.id,
        requested_by: adminMember.user_id,
        title: template.feature.title,
        description: template.feature.description,
        priority: template.feature.priority,
        status: template.feature.status,
        category: template.feature.category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: newFeature, error: featureError } = await supabase
        .from('feature_requests')
        .insert(featureData)
        .select()
        .single();
      
      if (featureError) {
        console.error(`❌ Error creating feature request:`, featureError);
        continue;
      }
      
      createdFeatures.push(newFeature);
      console.log(`✅ Created feature request: "${template.feature.title}" for ${org.name}`);
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Created ${createdIssues.length} issues`);
    console.log(`✅ Created ${createdFeatures.length} feature requests`);
    
    return { issues: createdIssues, features: createdFeatures };
    
  } catch (error) {
    console.error('❌ Error creating issues/features:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createIssuesAndFeatures().then((result) => {
    console.log('\n🎉 Issues and feature requests creation completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Process failed:', error);
    process.exit(1);
  });
}

module.exports = { createIssuesAndFeatures };