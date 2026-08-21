/**
 * Automated Benchmark Runner for Voice RAG Pipeline
 * Run via: npx tsx scripts/benchmark.ts
 */

const TEST_QUERIES = [
  "What is my name?",
  "Who built this pipeline?",
  "What is the target latency?",
  "Tell me about the knowledge base.",
  "What is the system architecture?",
  "What stack is used in this project?",
  "How does full-text search work in PostgreSQL?",
  "What model is used for speech-to-text?",
  "Explain chunk overlap in RAG.",
  "What is the fallback mechanism for ungrounded queries?",
];

interface BenchmarkResult {
  query: string;
  latencyMs: number;
  statusCode: number;
}

function calculatePercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function runBenchmark() {
  console.log(`Starting benchmark across ${TEST_QUERIES.length} test queries...\n`);
  const results: BenchmarkResult[] = [];

  for (const query of TEST_QUERIES) {
    const start = performance.now();
    try {
      const response = await fetch("http://localhost:3000/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, stream: false }),
      });

      const end = performance.now();
      results.push({
        query,
        latencyMs: Math.round(end - start),
        statusCode: response.status,
      });
    } catch {
      results.push({ query, latencyMs: -1, statusCode: 500 });
    }
  }

  const validLatencies = results
    .filter((r) => r.statusCode === 200 && r.latencyMs > 0)
    .map((r) => r.latencyMs)
    .sort((a, b) => a - b);

  const p50 = calculatePercentile(validLatencies, 50);
  const p70 = calculatePercentile(validLatencies, 70);
  const p100 = calculatePercentile(validLatencies, 100);
  const mean = Math.round(
    validLatencies.reduce((acc, v) => acc + v, 0) / validLatencies.length
  );

  console.log("==========================================");
  console.log("          LATENCY BENCHMARK REPORT        ");
  console.log("==========================================");
  console.log(`Sample Size: ${validLatencies.length} queries`);
  console.log(`Mean Latency: ${mean}ms`);
  console.log(`P50 (Median): ${p50}ms`);
  console.log(`P70:          ${p70}ms`);
  console.log(`P100 (Max):   ${p100}ms`);
  console.log("==========================================\n");
}

runBenchmark();