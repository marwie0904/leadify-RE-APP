/**
 * Conversation Templates for AI Real Estate Conversations
 * Provides varied conversation starters and follow-ups for different lead types
 */

// HOT LEAD Templates - High intent, ready to buy
const hotLeadTemplates = [
  {
    name: "Urgent Buyer - Pre-approved",
    messages: [
      { role: 'user', content: "Hi, I'm pre-approved for $750,000 and need to find a home within the next 30 days. Can you help?" },
      { role: 'user', content: "I'm looking for a 4-bedroom house with at least 2,500 sq ft. School district is very important." },
      { role: 'user', content: "Yes, I'm the primary decision maker. My spouse and I are ready to move quickly on the right property." },
      { role: 'user', content: "We're currently renting and our lease ends next month. This is urgent for us." },
      { role: 'user', content: "What properties do you have available right now that match our criteria?" },
      { role: 'user', content: "Can we schedule viewings this weekend? We want to make a decision soon." },
      { role: 'user', content: "My name is John Smith and you can reach me at 555-0100. What's the next step?" },
      { role: 'user', content: "Do you have any properties in Oakwood Heights? We love that area." }
    ]
  },
  {
    name: "Cash Investor - Multiple Properties",
    messages: [
      { role: 'user', content: "I'm a real estate investor looking to purchase 2-3 rental properties. Cash buyer, budget up to $1.2M total." },
      { role: 'user', content: "I need properties with good rental potential. Prefer multi-family or houses that can be easily rented." },
      { role: 'user', content: "Yes, I make all investment decisions for my company. We close quickly - usually within 2 weeks." },
      { role: 'user', content: "Looking to close on at least one property this month, and the others within 60 days." },
      { role: 'user', content: "What's the average rental income for properties in your portfolio?" },
      { role: 'user', content: "Can you send me a list of investment properties with their cap rates?" },
      { role: 'user', content: "I'm David Chen, email me at dchen.investments@email.com or call 555-0200." },
      { role: 'user', content: "Do you have any off-market deals? I'm interested in those as well." },
      { role: 'user', content: "What areas do you recommend for the best ROI right now?" }
    ]
  },
  {
    name: "Luxury Home Buyer - Specific Requirements",
    messages: [
      { role: 'user', content: "We're looking for a luxury home in the $1.5-2M range. Need at least 5 bedrooms and a pool." },
      { role: 'user', content: "Must have a home office and preferably a wine cellar. Modern kitchen is essential." },
      { role: 'user', content: "My husband and I are both involved in the decision. We've already sold our current home." },
      { role: 'user', content: "We need to move within 45 days. Already have financing secured from our private banker." },
      { role: 'user', content: "Are there any properties in gated communities? Privacy is important to us." },
      { role: 'user', content: "Can you arrange private showings? We prefer not to attend open houses." },
      { role: 'user', content: "I'm Sarah Williams, 555-0300. When can we start viewing properties?" },
      { role: 'user', content: "We also need a 3-car garage minimum. Do you have anything that matches?" },
      { role: 'user', content: "What about smart home features? We want a fully automated home." },
      { role: 'user', content: "Can you also recommend a good home inspector for the luxury market?" }
    ]
  },
  {
    name: "Commercial Property - Immediate Need",
    messages: [
      { role: 'user', content: "I need a commercial space for my growing business. Looking for 5,000-8,000 sq ft, budget $2M." },
      { role: 'user', content: "Must have good street visibility and parking for at least 30 cars. Zoned for retail/office." },
      { role: 'user', content: "I'm the CEO and have full authority to make this purchase. Board has already approved." },
      { role: 'user', content: "We need to move in within 60 days. Our current lease is expiring and we can't renew." },
      { role: 'user', content: "What properties are available in the business district?" },
      { role: 'user', content: "Can you provide traffic studies for the locations you have?" },
      { role: 'user', content: "Michael Torres, CEO of TechStart Inc. Reach me at 555-0400 or mtorres@techstart.com" },
      { role: 'user', content: "Do any of the properties have existing build-outs we could use?" }
    ]
  },
  {
    name: "Downsizing Couple - Quick Sale Needed",
    messages: [
      { role: 'user', content: "We're empty nesters looking to downsize. Need a 2-3 bedroom condo, budget around $500K." },
      { role: 'user', content: "Prefer single-story or building with elevator. Low maintenance is key for us." },
      { role: 'user', content: "My wife and I make decisions together. We've already listed our house and have offers." },
      { role: 'user', content: "Need to close within 30-45 days to align with our home sale." },
      { role: 'user', content: "Are there any 55+ communities you'd recommend?" },
      { role: 'user', content: "What about HOA fees? We want to keep those reasonable." },
      { role: 'user', content: "Robert and Linda Johnson, call us at 555-0500. We're very motivated buyers." },
      { role: 'user', content: "We'd also like amenities like a gym and pool if possible." }
    ]
  }
];

// WARM LEAD Templates - Interested but need nurturing
const warmLeadTemplates = [
  {
    name: "First-Time Buyer - Researching",
    messages: [
      { role: 'user', content: "Hi, I'm thinking about buying my first home. Not sure where to start. Budget is around $400K." },
      { role: 'user', content: "I'd like something with 3 bedrooms. Still figuring out which areas are best." },
      { role: 'user', content: "I'll need to discuss with my partner before making any decisions." },
      { role: 'user', content: "We're thinking maybe in the next 3-4 months? Need to save a bit more for down payment." },
      { role: 'user', content: "What's the typical down payment percentage these days?" },
      { role: 'user', content: "Can you explain the buying process? I'm new to this." }
    ]
  },
  {
    name: "Relocating Professional - Planning Ahead",
    messages: [
      { role: 'user', content: "I'm relocating for work in about 6 months. Starting to look at housing options." },
      { role: 'user', content: "Budget will be $600-700K depending on my relocation package. Need 3-4 bedrooms." },
      { role: 'user', content: "I'll be the primary decision maker but want my family to visit first." },
      { role: 'user', content: "Planning to buy within 2-3 months of arrival, so probably 8-9 months from now." },
      { role: 'user', content: "What neighborhoods are good for families with young children?" }
    ]
  },
  {
    name: "Investment Curious - Exploring Options",
    messages: [
      { role: 'user', content: "I'm interested in real estate investment. Have about $300K to invest but new to this." },
      { role: 'user', content: "Looking for properties that can generate passive income. Maybe a duplex?" },
      { role: 'user', content: "Need to research more and possibly partner with other investors." },
      { role: 'user', content: "Probably looking at making a move in the next quarter." },
      { role: 'user', content: "What kind of returns are typical for rental properties in this area?" },
      { role: 'user', content: "Do you have resources about property management?" }
    ]
  },
  {
    name: "Growing Family - Future Planning",
    messages: [
      { role: 'user', content: "We're expecting our second child and will need a bigger home. Currently in a 2-bedroom." },
      { role: 'user', content: "Looking for 4 bedrooms, good schools. Budget probably $550-650K." },
      { role: 'user', content: "My spouse and I need to agree on everything. Still discussing priorities." },
      { role: 'user', content: "Baby due in 6 months, so maybe looking to move in 4-5 months?" },
      { role: 'user', content: "What areas have the best elementary schools?" },
      { role: 'user', content: "Are there any family-friendly neighborhoods you'd recommend?" }
    ]
  },
  {
    name: "Condo Buyer - Comparing Options",
    messages: [
      { role: 'user', content: "Looking for a condo downtown. Want to be close to work. Budget up to $450K." },
      { role: 'user', content: "Prefer 2 bedrooms with a nice view. Modern building with amenities." },
      { role: 'user', content: "Just me making the decision, but want to see multiple options first." },
      { role: 'user', content: "Not in a rush, maybe in the next 2-3 months if I find the right place." },
      { role: 'user', content: "What buildings do you recommend downtown?" }
    ]
  }
];

// COLD LEAD Templates - Early stage, just browsing
const coldLeadTemplates = [
  {
    name: "Market Researcher - Just Looking",
    messages: [
      { role: 'user', content: "What's the real estate market like these days? Just curious about prices." },
      { role: 'user', content: "How much would a 3-bedroom house typically cost?" }
    ]
  },
  {
    name: "Future Planner - Long Timeline",
    messages: [
      { role: 'user', content: "I might be interested in buying something next year. What areas are up and coming?" },
      { role: 'user', content: "Just want to understand the market better for now." },
      { role: 'user', content: "Thanks for the info. I'll reach out when I'm ready." }
    ]
  },
  {
    name: "Window Shopper - No Intent",
    messages: [
      { role: 'user', content: "Just browsing your listings. Nice properties!" },
      { role: 'user', content: "These are way out of my price range but beautiful homes." }
    ]
  },
  {
    name: "Dreamer - Unrealistic Expectations",
    messages: [
      { role: 'user', content: "I want a mansion for $200K. What do you have?" },
      { role: 'user', content: "Really? Nothing available? That's disappointing." }
    ]
  },
  {
    name: "Information Gatherer",
    messages: [
      { role: 'user', content: "Do you have any market reports I could look at?" },
      { role: 'user', content: "Interesting. I'll think about it. Thanks." }
    ]
  }
];

// NON-CONVERTING Templates - General questions, no buying intent
const nonConvertingTemplates = [
  {
    name: "Service Inquiry",
    messages: [
      { role: 'user', content: "Do you also handle property management?" },
      { role: 'user', content: "Oh, just sales? Okay, thanks for letting me know." }
    ]
  },
  {
    name: "Wrong Location",
    messages: [
      { role: 'user', content: "Do you have properties in California? I'm looking in Los Angeles." },
      { role: 'user', content: "Oh you only cover this area? Never mind then." }
    ]
  },
  {
    name: "Competitor Research",
    messages: [
      { role: 'user', content: "What makes your agency different from others?" },
      { role: 'user', content: "Interesting approach. Thanks for the information." }
    ]
  },
  {
    name: "Already Purchased",
    messages: [
      { role: 'user', content: "I just bought a house last month. Do you provide any post-purchase services?" }
    ]
  }
];

/**
 * Get random templates for each lead type
 */
function getRandomTemplate(templates) {
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate varied user names
 */
function generateUserName() {
  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 
                      'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
                      'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
                      'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
                      'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Joshua', 'Michelle',
                      'Kenneth', 'Laura', 'Kevin', 'Emily', 'Brian', 'Kimberly', 'George', 'Deborah'];
  
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
                     'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
                     'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
                     'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
                     'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
                     'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}`;
}

/**
 * Generate varied email addresses
 */
function generateEmail(name) {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 
                   'icloud.com', 'protonmail.com', 'mail.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const username = name.toLowerCase().replace(' ', '.') + Math.floor(Math.random() * 999);
  return `${username}@${domain}`;
}

/**
 * Generate phone numbers
 */
function generatePhone() {
  const areaCodes = ['415', '510', '408', '650', '925', '707', '831', '209'];
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