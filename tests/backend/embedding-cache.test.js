// Test suite for embedding vector search optimizations
const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');
const sinon = require('sinon');

// Import the cache implementations (to be created)
const {
  EmbeddingCache,
  ResultCache,
  BatchEmbeddingProcessor,
  SmartQueryFilter,
  ParallelEmbeddingSearch
} = require('../lib/embedding-optimizations');

describe('Embedding Optimization Tests', () => {
  
  describe('EmbeddingCache', () => {
    let cache;
    let clock;
    
    beforeEach(() => {
      cache = new EmbeddingCache({ maxSize: 100, ttl: 3600000 }); // 1 hour TTL
      clock = sinon.useFakeTimers();
    });
    
    afterEach(() => {
      clock.restore();
    });
    
    it('should cache query embeddings', async () => {
      const query = 'test property search';
      const embedding = [0.1, 0.2, 0.3]; // Mock embedding
      
      // First call should miss cache
      const miss = await cache.get(query);
      assert.strictEqual(miss, null);
      
      // Set embedding in cache
      await cache.set(query, embedding);
      
      // Second call should hit cache
      const hit = await cache.get(query);
      assert.deepStrictEqual(hit, embedding);
    });
    
    it('should respect TTL expiration', async () => {
      const query = 'test query';
      const embedding = [0.1, 0.2, 0.3];
      
      await cache.set(query, embedding);
      
      // Should be in cache
      let result = await cache.get(query);
      assert.deepStrictEqual(result, embedding);
      
      // Advance time past TTL
      clock.tick(3600001); // 1 hour + 1ms
      
      // Should have expired
      result = await cache.get(query);
      assert.strictEqual(result, null);
    });
    
    it('should implement LRU eviction', async () => {
      const smallCache = new EmbeddingCache({ maxSize: 3, ttl: 3600000 });
      
      // Fill cache to capacity
      await smallCache.set('query1', [0.1]);
      await smallCache.set('query2', [0.2]);
      await smallCache.set('query3', [0.3]);
      
      // Access query1 and query3 to make them recently used
      await smallCache.get('query1');
      await smallCache.get('query3');
      
      // Add new item, should evict query2 (least recently used)
      await smallCache.set('query4', [0.4]);
      
      assert.deepStrictEqual(await smallCache.get('query1'), [0.1]); // Still in cache
      assert.strictEqual(await smallCache.get('query2'), null); // Evicted
      assert.deepStrictEqual(await smallCache.get('query3'), [0.3]); // Still in cache
      assert.deepStrictEqual(await smallCache.get('query4'), [0.4]); // New item
    });
    
    it('should provide cache statistics', () => {
      cache.set('query1', [0.1]);
      cache.get('query1'); // Hit
      cache.get('query2'); // Miss
      
      const stats = cache.getStats();
      assert.strictEqual(stats.hits, 1);
      assert.strictEqual(stats.misses, 1);
      assert.strictEqual(stats.hitRate, 0.5);
      assert.strictEqual(stats.size, 1);
    });
  });
  
  describe('ResultCache', () => {
    let cache;
    let clock;
    
    beforeEach(() => {
      cache = new ResultCache({ maxSize: 50, ttl: 1800000 }); // 30 min TTL
      clock = sinon.useFakeTimers();
    });
    
    afterEach(() => {
      clock.restore();
    });
    
    it('should cache complete embedding search results', async () => {
      const agentId = 'agent-123';
      const query = 'property search';
      const results = [
        { content: 'Result 1', similarity: 0.9 },
        { content: 'Result 2', similarity: 0.8 }
      ];
      
      const cacheKey = cache.generateKey(agentId, query);
      
      // Cache miss
      assert.strictEqual(await cache.get(agentId, query), null);
      
      // Set results
      await cache.set(agentId, query, results);
      
      // Cache hit
      const cached = await cache.get(agentId, query);
      assert.deepStrictEqual(cached, results);
    });
    
    it('should invalidate cache for specific agent on document upload', async () => {
      const agentId = 'agent-123';
      const query1 = 'query1';
      const query2 = 'query2';
      
      await cache.set(agentId, query1, ['result1']);
      await cache.set(agentId, query2, ['result2']);
      await cache.set('agent-456', query1, ['result3']); // Different agent
      
      // Invalidate cache for agent-123
      await cache.invalidateAgent(agentId);
      
      // agent-123 cache should be cleared
      assert.strictEqual(await cache.get(agentId, query1), null);
      assert.strictEqual(await cache.get(agentId, query2), null);
      
      // agent-456 cache should remain
      assert.deepStrictEqual(await cache.get('agent-456', query1), ['result3']);
    });
    
    it('should generate consistent cache keys', () => {
      const agentId = 'agent-123';
      const query = 'test query';
      
      const key1 = cache.generateKey(agentId, query);
      const key2 = cache.generateKey(agentId, query);
      
      assert.strictEqual(key1, key2);
    });
  });
  
  describe('BatchEmbeddingProcessor', () => {
    let processor;
    let openaiMock;
    
    beforeEach(() => {
      processor = new BatchEmbeddingProcessor();
      openaiMock = {
        embeddings: {
          create: sinon.stub()
        }
      };
    });
    
    it('should batch multiple queries into single API call', async () => {
      const queries = [
        'property search',
        'payment plans',
        'location amenities'
      ];
      
      const mockResponse = {
        data: [
          { embedding: [0.1, 0.2] },
          { embedding: [0.3, 0.4] },
          { embedding: [0.5, 0.6] }
        ]
      };
      
      openaiMock.embeddings.create.resolves(mockResponse);
      
      const embeddings = await processor.generateBatch(queries, openaiMock);
      
      // Should call OpenAI API only once
      assert.strictEqual(openaiMock.embeddings.create.callCount, 1);
      
      // Should pass all queries in single call
      const call = openaiMock.embeddings.create.firstCall;
      assert.deepStrictEqual(call.args[0].input, queries);
      
      // Should return embeddings in correct order
      assert.strictEqual(embeddings.length, 3);
      assert.deepStrictEqual(embeddings[0], [0.1, 0.2]);
      assert.deepStrictEqual(embeddings[1], [0.3, 0.4]);
      assert.deepStrictEqual(embeddings[2], [0.5, 0.6]);
    });
    
    it('should handle batch size limits', async () => {
      // Create 150 queries (OpenAI limit is typically 100)
      const queries = Array(150).fill(null).map((_, i) => `query ${i}`);
      
      const mockResponse1 = {
        data: Array(100).fill(null).map((_, i) => ({ embedding: [i] }))
      };
      
      const mockResponse2 = {
        data: Array(50).fill(null).map((_, i) => ({ embedding: [i + 100] }))
      };
      
      openaiMock.embeddings.create
        .onFirstCall().resolves(mockResponse1)
        .onSecondCall().resolves(mockResponse2);
      
      const embeddings = await processor.generateBatch(queries, openaiMock);
      
      // Should split into 2 API calls
      assert.strictEqual(openaiMock.embeddings.create.callCount, 2);
      
      // Should return all embeddings
      assert.strictEqual(embeddings.length, 150);
    });
  });
  
  describe('SmartQueryFilter', () => {
    let filter;
    
    beforeEach(() => {
      filter = new SmartQueryFilter();
    });
    
    it('should identify queries that dont need embedding search', () => {
      const skipQueries = [
        'hi',
        'hello',
        'thank you',
        'thanks',
        'goodbye',
        'bye',
        'ok',
        'yes',
        'no'
      ];
      
      skipQueries.forEach(query => {
        assert.strictEqual(
          filter.needsEmbeddingSearch(query),
          false,
          `Query "${query}" should not need embedding search`
        );
      });
    });
    
    it('should identify queries that need embedding search', () => {
      const searchQueries = [
        'what properties are available',
        'show me condos in manila',
        'payment plans for townhouse',
        'amenities near the property',
        'location details'
      ];
      
      searchQueries.forEach(query => {
        assert.strictEqual(
          filter.needsEmbeddingSearch(query),
          true,
          `Query "${query}" should need embedding search`
        );
      });
    });
    
    it('should provide default responses for skipped queries', () => {
      const response = filter.getDefaultResponse('thank you');
      assert.ok(response);
      assert.ok(response.includes('welcome') || response.includes('pleasure'));
    });
  });
  
  describe('ParallelEmbeddingSearch', () => {
    let parallel;
    let searchMock;
    
    beforeEach(() => {
      parallel = new ParallelEmbeddingSearch();
      searchMock = sinon.stub();
    });
    
    it('should execute multiple searches in parallel', async () => {
      const searches = [
        { agentId: 'agent1', query: 'query1', topK: 3 },
        { agentId: 'agent1', query: 'query2', topK: 3 },
        { agentId: 'agent2', query: 'query3', topK: 5 }
      ];
      
      // Mock search function with delays
      searchMock.callsFake(async (agentId, query, topK) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API delay
        return [`Results for ${query}`];
      });
      
      const startTime = Date.now();
      const results = await parallel.searchMultiple(searches, searchMock);
      const duration = Date.now() - startTime;
      
      // Should complete in ~100ms (parallel) not ~300ms (sequential)
      assert.ok(duration < 200, `Parallel search took ${duration}ms, should be < 200ms`);
      
      // Should return all results
      assert.strictEqual(results.length, 3);
      assert.deepStrictEqual(results[0], ['Results for query1']);
      assert.deepStrictEqual(results[1], ['Results for query2']);
      assert.deepStrictEqual(results[2], ['Results for query3']);
    });
    
    it('should handle errors gracefully', async () => {
      const searches = [
        { agentId: 'agent1', query: 'query1', topK: 3 },
        { agentId: 'agent1', query: 'query2', topK: 3 }
      ];
      
      searchMock
        .onFirstCall().resolves(['Success'])
        .onSecondCall().rejects(new Error('Search failed'));
      
      const results = await parallel.searchMultiple(searches, searchMock);
      
      // Should return successful result and empty array for failed
      assert.strictEqual(results.length, 2);
      assert.deepStrictEqual(results[0], ['Success']);
      assert.deepStrictEqual(results[1], []); // Failed search returns empty
    });
  });
  
  describe('Integration Tests', () => {
    it('should improve performance with caching', async () => {
      const embeddingCache = new EmbeddingCache({ maxSize: 100, ttl: 3600000 });
      const resultCache = new ResultCache({ maxSize: 50, ttl: 1800000 });
      
      // Simulate search with caching
      const search = async (agentId, query) => {
        // Check result cache first
        const cachedResult = await resultCache.get(agentId, query);
        if (cachedResult) return { result: cachedResult, source: 'result-cache' };
        
        // Check embedding cache
        const cachedEmbedding = await embeddingCache.get(query);
        if (cachedEmbedding) {
          // Use cached embedding (skip OpenAI call)
          const result = await mockSupabaseSearch(agentId, cachedEmbedding);
          await resultCache.set(agentId, query, result);
          return { result, source: 'embedding-cache' };
        }
        
        // No cache hit - full search
        const embedding = await mockOpenAIEmbedding(query);
        await embeddingCache.set(query, embedding);
        const result = await mockSupabaseSearch(agentId, embedding);
        await resultCache.set(agentId, query, result);
        return { result, source: 'no-cache' };
      };
      
      // Mock functions
      const mockOpenAIEmbedding = async (query) => {
        await new Promise(r => setTimeout(r, 500)); // Simulate API delay
        return [Math.random(), Math.random()];
      };
      
      const mockSupabaseSearch = async (agentId, embedding) => {
        await new Promise(r => setTimeout(r, 700)); // Simulate DB delay
        return ['Result 1', 'Result 2'];
      };
      
      // First search - no cache
      let start = Date.now();
      let result = await search('agent1', 'test query');
      let duration = Date.now() - start;
      assert.strictEqual(result.source, 'no-cache');
      assert.ok(duration >= 1200, `First search should take ~1200ms, took ${duration}ms`);
      
      // Second search - result cache hit
      start = Date.now();
      result = await search('agent1', 'test query');
      duration = Date.now() - start;
      assert.strictEqual(result.source, 'result-cache');
      assert.ok(duration < 50, `Cached search should take <50ms, took ${duration}ms`);
      
      // Third search - different agent, same query - embedding cache hit
      start = Date.now();
      result = await search('agent2', 'test query');
      duration = Date.now() - start;
      assert.strictEqual(result.source, 'embedding-cache');
      assert.ok(duration < 750, `Embedding cached search should take ~700ms, took ${duration}ms`);
    });
  });
});

// Performance benchmark tests
describe('Performance Benchmarks', () => {
  it('should demonstrate cache hit rate improvement', async () => {
    const cache = new EmbeddingCache({ maxSize: 100, ttl: 3600000 });
    
    // Simulate realistic query pattern
    const queries = [
      'property in manila',
      'condo price',
      'payment plans',
      'property in manila', // Repeat
      'amenities',
      'condo price', // Repeat
      'location details',
      'property in manila', // Repeat
      'payment plans' // Repeat
    ];
    
    let hits = 0;
    let misses = 0;
    
    for (const query of queries) {
      const cached = await cache.get(query);
      if (cached) {
        hits++;
      } else {
        misses++;
        await cache.set(query, [Math.random()]); // Mock embedding
      }
    }
    
    const hitRate = hits / (hits + misses);
    assert.ok(hitRate >= 0.4, `Hit rate should be >= 40%, got ${(hitRate * 100).toFixed(1)}%`);
    
    // Log benchmark results
    console.log('Cache Performance Benchmark:');
    console.log(`  Total queries: ${queries.length}`);
    console.log(`  Cache hits: ${hits}`);
    console.log(`  Cache misses: ${misses}`);
    console.log(`  Hit rate: ${(hitRate * 100).toFixed(1)}%`);
  });
  
  it('should demonstrate parallel processing improvement', async function() {
    this.timeout(5000); // Increase timeout for this test
    const parallel = new ParallelEmbeddingSearch();
    
    // Mock search with 500ms delay
    const slowSearch = async (agentId, query, topK) => {
      await new Promise(r => setTimeout(r, 500));
      return [`Result for ${query}`];
    };
    
    // Sequential execution
    const sequentialStart = Date.now();
    const results1 = [];
    for (let i = 0; i < 3; i++) {
      const result = await slowSearch('agent1', `query${i}`, 3);
      results1.push(result);
    }
    const sequentialTime = Date.now() - sequentialStart;
    
    // Parallel execution
    const searches = [
      { agentId: 'agent1', query: 'query0', topK: 3 },
      { agentId: 'agent1', query: 'query1', topK: 3 },
      { agentId: 'agent1', query: 'query2', topK: 3 }
    ];
    
    const parallelStart = Date.now();
    const results2 = await parallel.searchMultiple(searches, slowSearch);
    const parallelTime = Date.now() - parallelStart;
    
    const improvement = ((sequentialTime - parallelTime) / sequentialTime) * 100;
    
    console.log('Parallel Processing Benchmark:');
    console.log(`  Sequential time: ${sequentialTime}ms`);
    console.log(`  Parallel time: ${parallelTime}ms`);
    console.log(`  Improvement: ${improvement.toFixed(1)}%`);
    
    assert.ok(improvement > 60, `Parallel should be >60% faster, got ${improvement.toFixed(1)}%`);
  });
});