/**
 * Performance benchmark script for embedding search optimizations
 * 
 * This script tests the real-world performance improvements from:
 * 1. Query embedding caching
 * 2. Result caching
 * 3. Smart query filtering
 * 4. Parallel processing
 */

const http = require('http');

// Test configuration
const AGENT_ID = 'e70a85ac-8480-4b1d-bd15-2d7b817b2399'; // Update with your agent ID
const API_PORT = 3001;

// Test queries - mix of types
const testQueries = [
  // Queries that need embedding search
  { query: 'What properties are available in Manila?', needsSearch: true },
  { query: 'Show me condos with payment plans', needsSearch: true },
  { query: 'What amenities are near the property?', needsSearch: true },
  { query: 'Tell me about the location', needsSearch: true },
  { query: 'What are the property features?', needsSearch: true },
  
  // Queries that should be filtered (no search needed)
  { query: 'Hi', needsSearch: false },
  { query: 'Thank you', needsSearch: false },
  { query: 'OK', needsSearch: false },
  { query: 'Yes', needsSearch: false },
  { query: 'Goodbye', needsSearch: false },
  
  // Repeated queries (should hit cache)
  { query: 'What properties are available in Manila?', needsSearch: true, repeat: true },
  { query: 'Show me condos with payment plans', needsSearch: true, repeat: true },
  { query: 'What amenities are near the property?', needsSearch: true, repeat: true }
];

// Helper function to make API call
async function testEmbeddingSearch(query) {
  const postData = JSON.stringify({
    message: query,
    agentId: AGENT_ID,
    userId: 'benchmark-user',
    source: 'web'
  });
  
  const options = {
    hostname: 'localhost',
    port: API_PORT,
    path: '/api/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          query,
          duration,
          statusCode: res.statusCode,
          response: data.substring(0, 200) // First 200 chars
        });
      });
    });
    
    req.on('error', (e) => {
      resolve({
        query,
        duration: Date.now() - startTime,
        error: e.message
      });
    });
    
    req.write(postData);
    req.end();
  });
}

// Performance test runner
async function runPerformanceTest() {
  console.log('🚀 Starting Embedding Search Performance Benchmark\n');
  console.log('=' .repeat(70));
  console.log('This test measures the impact of caching and optimization strategies');
  console.log('=' .repeat(70) + '\n');
  
  const results = {
    firstTime: [],      // First-time queries
    cached: [],         // Cached queries (repeats)
    filtered: [],       // Filtered queries (no search needed)
    errors: []
  };
  
  // Run tests sequentially to measure individual performance
  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    console.log(`\n[${i + 1}/${testQueries.length}] Testing: "${test.query}"`);
    
    const result = await testEmbeddingSearch(test.query);
    
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
      results.errors.push(result);
    } else {
      console.log(`   ✅ Response in ${result.duration}ms`);
      
      // Categorize results
      if (!test.needsSearch) {
        console.log(`   📝 Type: Filtered (should be fast)`);
        results.filtered.push(result);
      } else if (test.repeat) {
        console.log(`   📝 Type: Cached (should be faster)`);
        results.cached.push(result);
      } else {
        console.log(`   📝 Type: First-time query`);
        results.firstTime.push(result);
      }
      
      // Analyze performance
      if (result.duration < 500) {
        console.log(`   ⚡ FAST: Likely hit cache or filter`);
      } else if (result.duration < 2000) {
        console.log(`   🚀 OPTIMIZED: Partial optimization applied`);
      } else {
        console.log(`   🐌 SLOW: Full embedding search performed`);
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Calculate statistics
  console.log('\n' + '=' .repeat(70));
  console.log('📊 PERFORMANCE SUMMARY');
  console.log('=' .repeat(70));
  
  // First-time queries
  if (results.firstTime.length > 0) {
    const avgFirstTime = results.firstTime.reduce((sum, r) => sum + r.duration, 0) / results.firstTime.length;
    console.log(`\n📍 First-time Queries (${results.firstTime.length} queries):`);
    console.log(`   Average response time: ${avgFirstTime.toFixed(0)}ms`);
    console.log(`   Min: ${Math.min(...results.firstTime.map(r => r.duration))}ms`);
    console.log(`   Max: ${Math.max(...results.firstTime.map(r => r.duration))}ms`);
  }
  
  // Cached queries
  if (results.cached.length > 0) {
    const avgCached = results.cached.reduce((sum, r) => sum + r.duration, 0) / results.cached.length;
    console.log(`\n♻️  Cached Queries (${results.cached.length} queries):`);
    console.log(`   Average response time: ${avgCached.toFixed(0)}ms`);
    console.log(`   Min: ${Math.min(...results.cached.map(r => r.duration))}ms`);
    console.log(`   Max: ${Math.max(...results.cached.map(r => r.duration))}ms`);
    
    // Calculate improvement
    if (results.firstTime.length > 0) {
      const avgFirstTime = results.firstTime.reduce((sum, r) => sum + r.duration, 0) / results.firstTime.length;
      const improvement = ((avgFirstTime - avgCached) / avgFirstTime * 100).toFixed(1);
      console.log(`   🎯 Cache Improvement: ${improvement}% faster than first-time`);
    }
  }
  
  // Filtered queries
  if (results.filtered.length > 0) {
    const avgFiltered = results.filtered.reduce((sum, r) => sum + r.duration, 0) / results.filtered.length;
    console.log(`\n🔍 Filtered Queries (${results.filtered.length} queries):`);
    console.log(`   Average response time: ${avgFiltered.toFixed(0)}ms`);
    console.log(`   Min: ${Math.min(...results.filtered.map(r => r.duration))}ms`);
    console.log(`   Max: ${Math.max(...results.filtered.map(r => r.duration))}ms`);
    console.log(`   💡 These queries skip embedding search entirely`);
  }
  
  // Overall statistics
  const allResults = [...results.firstTime, ...results.cached, ...results.filtered];
  if (allResults.length > 0) {
    const avgOverall = allResults.reduce((sum, r) => sum + r.duration, 0) / allResults.length;
    const fastQueries = allResults.filter(r => r.duration < 1000).length;
    const cacheHitRate = (results.cached.length + results.filtered.length) / allResults.length * 100;
    
    console.log('\n' + '=' .repeat(70));
    console.log('🏆 OVERALL PERFORMANCE');
    console.log('=' .repeat(70));
    console.log(`Total queries tested: ${allResults.length}`);
    console.log(`Average response time: ${avgOverall.toFixed(0)}ms`);
    console.log(`Fast queries (<1s): ${fastQueries} (${(fastQueries / allResults.length * 100).toFixed(1)}%)`);
    console.log(`Optimization rate: ${cacheHitRate.toFixed(1)}% queries optimized`);
    
    // Performance grade
    let grade;
    if (avgOverall < 1000) {
      grade = 'A+ (Excellent)';
    } else if (avgOverall < 2000) {
      grade = 'A (Very Good)';
    } else if (avgOverall < 3000) {
      grade = 'B (Good)';
    } else if (avgOverall < 4000) {
      grade = 'C (Average)';
    } else {
      grade = 'D (Needs Improvement)';
    }
    
    console.log(`\n🎯 Performance Grade: ${grade}`);
  }
  
  // Errors
  if (results.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${results.errors.length}`);
    results.errors.forEach(e => {
      console.log(`   - ${e.query}: ${e.error}`);
    });
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Benchmark Complete!');
  console.log('=' .repeat(70));
  
  // Recommendations
  console.log('\n📋 OPTIMIZATION RECOMMENDATIONS:');
  if (results.cached.length > 0 && results.firstTime.length > 0) {
    const avgFirstTime = results.firstTime.reduce((sum, r) => sum + r.duration, 0) / results.firstTime.length;
    const avgCached = results.cached.reduce((sum, r) => sum + r.duration, 0) / results.cached.length;
    
    if (avgCached < avgFirstTime * 0.5) {
      console.log('✅ Cache is working effectively (>50% improvement)');
    } else {
      console.log('⚠️  Cache improvement is limited - check cache configuration');
    }
  }
  
  if (results.filtered.length > 0) {
    const avgFiltered = results.filtered.reduce((sum, r) => sum + r.duration, 0) / results.filtered.length;
    if (avgFiltered < 500) {
      console.log('✅ Query filtering is working well');
    } else {
      console.log('⚠️  Filtered queries still slow - check filter implementation');
    }
  }
  
  const avgOverall = allResults.reduce((sum, r) => sum + r.duration, 0) / allResults.length;
  if (avgOverall > 3000) {
    console.log('💡 Consider increasing cache size or TTL for better performance');
    console.log('💡 Review database indexes and query optimization');
  }
}

// Check if server is running and start test
const checkServer = http.get(`http://localhost:${API_PORT}/api/health`, (res) => {
  if (res.statusCode === 200) {
    console.log(`✅ Server is running on port ${API_PORT}\n`);
    runPerformanceTest();
  }
}).on('error', () => {
  console.log(`❌ Server is not running on port ${API_PORT}`);
  console.log('Please start the server with: node server.js');
});