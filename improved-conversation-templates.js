/**
 * Improved Conversation Templates with Proper BANT Flow
 * Each conversation follows the BANT process with contextual responses
 */

// HOT LEAD Templates - Complete BANT information provided naturally
const hotLeadTemplates = [
  {
    name: "Commercial Space Buyer - Clear Requirements",
    messages: [
      { 
        role: 'user', 
        content: "Hi, I need a commercial space for my business. Looking for 5,000-8,000 sq ft with a budget of $2M." 
      },
      // AI should acknowledge budget and ask about other BANT elements
      { 
        role: 'user', 
        content: "I'm the CEO and have full board approval. We need to move within 60 days as our lease expires." 
      },
      // AI should acknowledge authority/timeline and ask about specific needs
      { 
        role: 'user', 
        content: "Must have good street visibility, parking for 30+ cars, and be zoned for retail/office use." 
      },
      // AI should ask for contact information to complete BANT
      { 
        role: 'user', 
        content: "I'm Michael Chen, CEO of TechStart. Reach me at 555-0100 or mchen@techstart.com" 
      }
      // AI should confirm all BANT collected and offer next steps
    ]
  },
  {
    name: "Luxury Home Buyer - Pre-approved and Ready",
    messages: [
      { 
        role: 'user', 
        content: "Hello! We're looking for a luxury home in the $1.5-2M range. We're pre-approved and ready to buy." 
      },
      // AI should acknowledge budget and ask about needs/timeline
      { 
        role: 'user', 
        content: "We need at least 5 bedrooms, a pool, and a home office. Moving from out of state, need to close within 45 days." 
      },
      // AI should acknowledge needs/timeline and ask about authority
      { 
        role: 'user', 
        content: "My wife and I are both on the deed. We've already sold our current home and have cash ready." 
      },
      // AI should ask for contact information
      { 
        role: 'user', 
        content: "I'm David Johnson. My number is 555-0200 and email is djohnson@email.com" 
      }
    ]
  },
  {
    name: "Cash Investor - Multiple Properties",
    messages: [
      { 
        role: 'user', 
        content: "I'm a real estate investor interested in rental properties. Cash buyer with $800K budget." 
      },
      // AI acknowledges budget, asks about specific needs
      { 
        role: 'user', 
        content: "Looking for 2-3 multi-family units with good rental potential. Prefer properties that need minimal work." 
      },
      // AI asks about timeline and decision process
      { 
        role: 'user', 
        content: "I make all investment decisions for my LLC. Want to close on at least one property this month." 
      },
      // AI asks for contact details
      { 
        role: 'user', 
        content: "Sarah Williams, SW Investments. Call me at 555-0300 or email sw@swinvest.com" 
      },
      // Follow-up questions
      { 
        role: 'user', 
        content: "What's the average cap rate for properties in your portfolio?" 
      }
    ]
  },
  {
    name: "Downsizing Couple - Quick Sale Needed",
    messages: [
      { 
        role: 'user', 
        content: "We're empty nesters looking to downsize to a condo. Budget around $500K." 
      },
      // AI acknowledges budget and situation, asks about needs
      { 
        role: 'user', 
        content: "Need 2-3 bedrooms, preferably single-story or with elevator. Low maintenance is key." 
      },
      // AI asks about timeline
      { 
        role: 'user', 
        content: "Our house just sold, we have 30 days to find something. Both my wife and I are on the purchase." 
      },
      // AI asks for contact
      { 
        role: 'user', 
        content: "Robert and Linda Martinez. Please call 555-0400 or email us at martinez@email.com" 
      }
    ]
  },
  {
    name: "First-Time Buyer - Pre-qualified",
    messages: [
      { 
        role: 'user', 
        content: "Hi! First-time buyer here, pre-qualified for $450K. Looking to buy my first home!" 
      },
      // AI welcomes and asks about needs
      { 
        role: 'user', 
        content: "I need 3 bedrooms, 2 baths, and a garage. Good school district is important for the future." 
      },
      // AI asks about timeline
      { 
        role: 'user', 
        content: "My lease ends in 2 months, so I need to close by then. I'm the sole buyer." 
      },
      // AI asks for contact
      { 
        role: 'user', 
        content: "Jennifer Lee, you can reach me at 555-0500 or jlee@email.com" 
      }
    ]
  }
];

// WARM LEAD Templates - Missing some BANT elements
const warmLeadTemplates = [
  {
    name: "Interested Buyer - Exploring Options",
    messages: [
      { 
        role: 'user', 
        content: "I'm thinking about buying a home. What's available in the $300-400K range?" 
      },
      // AI acknowledges budget, asks about needs
      { 
        role: 'user', 
        content: "Looking for 3 bedrooms, 2 baths. Prefer newer construction if possible." 
      },
      // AI asks about timeline
      { 
        role: 'user', 
        content: "Not in a huge rush, maybe in the next 3-4 months. Still getting finances in order." 
      },
      // AI asks about decision-making process
      { 
        role: 'user', 
        content: "It's just me buying, but I want to look at several options first." 
      },
      // AI asks for contact
      { 
        role: 'user', 
        content: "I'm Tom Anderson. Email is best - tanderson@email.com" 
      }
    ]
  },
  {
    name: "Relocating Professional - Planning Ahead",
    messages: [
      { 
        role: 'user', 
        content: "I'm relocating for work in 6 months. Starting to look at housing options." 
      },
      // AI asks about budget
      { 
        role: 'user', 
        content: "Company is providing relocation assistance. Budget will be $600-700K." 
      },
      // AI asks about needs
      { 
        role: 'user', 
        content: "Need 4 bedrooms for my family. Good schools are essential." 
      },
      // AI asks about decision process
      { 
        role: 'user', 
        content: "My spouse and I will decide together after they visit the area." 
      },
      // AI asks for contact
      { 
        role: 'user', 
        content: "Mark Thompson, 555-0600 or mthompson@email.com" 
      }
    ]
  },
  {
    name: "Investment Curious - Research Phase",
    messages: [
      { 
        role: 'user', 
        content: "I'm interested in real estate investment. What opportunities are available?" 
      },
      // AI asks about budget
      { 
        role: 'user', 
        content: "I have about $300K to invest but want to understand the market first." 
      },
      // AI asks about investment goals
      { 
        role: 'user', 
        content: "Looking for passive income through rentals. Maybe a duplex or small apartment." 
      },
      // AI asks about timeline
      { 
        role: 'user', 
        content: "No immediate rush. Want to make the right decision, maybe in the next quarter." 
      },
      // AI asks for contact
      { 
        role: 'user', 
        content: "Alice Chen, reach me at achen@email.com" 
      }
    ]
  },
  {
    name: "Growing Family - Future Planning",
    messages: [
      { 
        role: 'user', 
        content: "We're expecting our second child and will need a bigger home soon." 
      },
      // AI congratulates and asks about timeline
      { 
        role: 'user', 
        content: "Baby due in 6 months. Want to move before then if we find the right place." 
      },
      // AI asks about budget
      { 
        role: 'user', 
        content: "We're approved for up to $550K but prefer to stay under $500K." 
      },
      // AI asks about needs
      { 
        role: 'user', 
        content: "Need 4 bedrooms, a yard for kids, and a safe neighborhood." 
      },
      // AI asks for contact
      { 
        role: 'user', 
        content: "I'm Jessica Brown. Call 555-0700 or email jbrown@email.com" 
      }
    ]
  },
  {
    name: "Condo Shopper - Comparing Options",
    messages: [
      { 
        role: 'user', 
        content: "Looking for a downtown condo. What do you have available?" 
      },
      // AI asks about budget
      { 
        role: 'user', 
        content: "Budget is up to $450K for the right place." 
      },
      // AI asks about specific needs
      { 
        role: 'user', 
        content: "Want 2 bedrooms, modern building with amenities like gym and concierge." 
      },
      // AI asks about timeline
      { 
        role: 'user', 
        content: "My lease is month-to-month so flexible, but prefer to move within 2 months." 
      },
      // AI asks for contact
      { 
        role: 'user', 
        content: "Kevin Park, kpark@email.com or 555-0800" 
      }
    ]
  }
];

// COLD LEAD Templates - Early stage, minimal information
const coldLeadTemplates = [
  {
    name: "Market Researcher - Just Looking",
    messages: [
      { 
        role: 'user', 
        content: "What's the real estate market like these days?" 
      },
      // AI provides market info and asks about interest
      { 
        role: 'user', 
        content: "Just curious about home prices in the area. Not buying yet." 
      },
      // AI offers to provide information when ready
      { 
        role: 'user', 
        content: "Thanks for the info. Maybe next year." 
      }
    ]
  },
  {
    name: "Future Buyer - Long Timeline",
    messages: [
      { 
        role: 'user', 
        content: "I might buy something next year. What areas are good for families?" 
      },
      // AI provides area info and asks about preferences
      { 
        role: 'user', 
        content: "Good to know. Still saving for down payment." 
      },
      // AI offers to stay in touch
      { 
        role: 'user', 
        content: "I'll reach out when I'm ready. Thanks." 
      }
    ]
  },
  {
    name: "Window Shopper - Browsing",
    messages: [
      { 
        role: 'user', 
        content: "Just browsing your listings online. Nice properties!" 
      },
      // AI thanks and asks if they need help
      { 
        role: 'user', 
        content: "Not really in the market, just like looking at houses." 
      }
    ]
  },
  {
    name: "Price Checker - Curious",
    messages: [
      { 
        role: 'user', 
        content: "How much would a 3-bedroom house cost in this area?" 
      },
      // AI provides price range and asks about interest
      { 
        role: 'user', 
        content: "Wow, more than I thought. Need to save more." 
      }
    ]
  },
  {
    name: "Dreamer - Unrealistic Expectations",
    messages: [
      { 
        role: 'user', 
        content: "I want a mansion for $200K. What do you have?" 
      },
      // AI explains market reality and asks about actual budget
      { 
        role: 'user', 
        content: "Oh, I see. Maybe I need to adjust my expectations." 
      }
    ]
  }
];

// NON-CONVERTING Templates - Not interested in buying
const nonConvertingTemplates = [
  {
    name: "Wrong Service Inquiry",
    messages: [
      { 
        role: 'user', 
        content: "Do you handle property management?" 
      },
      // AI explains services and asks if they need sales help
      { 
        role: 'user', 
        content: "Oh, just sales? Never mind then." 
      }
    ]
  },
  {
    name: "Wrong Location",
    messages: [
      { 
        role: 'user', 
        content: "Do you have properties in California?" 
      },
      // AI explains service area
      { 
        role: 'user', 
        content: "I specifically need Los Angeles area. Thanks anyway." 
      }
    ]
  },
  {
    name: "Already Purchased",
    messages: [
      { 
        role: 'user', 
        content: "I just bought a house last month. Do you offer any post-purchase services?" 
      },
      // AI congratulates and explains services
      { 
        role: 'user', 
        content: "Thanks for the information." 
      }
    ]
  },
  {
    name: "Spam/Test Message",
    messages: [
      { 
        role: 'user', 
        content: "Hello testing 123" 
      }
    ]
  }
];

// Helper functions remain the same
function getRandomTemplate(templates) {
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateUserName() {
  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 
                      'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
                      'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa'];
  
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
                     'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}`;
}

function generateEmail(name) {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const username = name.toLowerCase().replace(' ', '.') + Math.floor(Math.random() * 999);
  return `${username}@${domain}`;
}

function generatePhone() {
  const areaCodes = ['415', '510', '408', '650', '925', '707'];
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `${areaCode}-${prefix}-${lineNumber}`;
}

module.exports = {
  hotLeadTemplates,
  warmLeadTemplates,
  coldLeadTemplates,
  nonConvertingTemplates,
  getRandomTemplate,
  generateUserName,
  generateEmail,
  generatePhone
};