const EMBEDDING_DIM = 1536;

function deterministicHash(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

function seededRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

function normalizeVector(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export function generateFallbackEmbedding(text: string): number[] {
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  const seed = deterministicHash(text);
  const random = seededRandom(seed);

  const vector = new Array(EMBEDDING_DIM).fill(0);

  tokens.forEach((token) => {
    const tokenSeed = deterministicHash(token);
    const tokenRandom = seededRandom(tokenSeed);
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vector[i] += (tokenRandom() * 2 - 1) * (1 / Math.sqrt(tokens.length));
    }
  });

  for (let i = 0; i < EMBEDDING_DIM; i++) {
    vector[i] += (random() * 2 - 1) * 0.001;
  }

  return normalizeVector(vector);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export const embeddingDimension = EMBEDDING_DIM;
