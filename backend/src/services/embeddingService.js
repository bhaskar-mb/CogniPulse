import { config } from '../config.js'

let localEmbedder = null
let isModelLoading = false

/**
 * Lazy-load local HuggingFace / Transformers.js model
 */
async function getLocalEmbedder() {
  if (localEmbedder) return localEmbedder
  if (isModelLoading) {
    // Wait for existing load to finish
    while (isModelLoading) {
      await new Promise(r => setTimeout(r, 100))
    }
    return localEmbedder
  }

  try {
    isModelLoading = true
    const { pipeline } = await import('@xenova/transformers')
    localEmbedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    console.log('[EmbeddingService] Loaded Xenova/all-MiniLM-L6-v2 pipeline')
    return localEmbedder
  } catch (err) {
    console.warn('[EmbeddingService] Could not initialize local @xenova/transformers pipeline:', err.message)
    return null
  } finally {
    isModelLoading = false
  }
}

/**
 * Generate embedding for a single text string using Google Gemini API
 */
async function generateGoogleEmbedding(text) {
  if (!config.googleApiKey) throw new Error('No Google API key configured')

  const truncatedText = text.slice(0, 7000)

  // Try text-embedding-004 or embedding-001
  const models = ['text-embedding-004', 'embedding-001']
  for (const m of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:embedContent?key=${config.googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: truncatedText }] }
          })
        }
      )

      if (response.ok) {
        const data = await response.json()
        const values = data.embedding?.values
        if (values && Array.isArray(values)) return values
      }
    } catch {
      // try next
    }
  }

  throw new Error('Google Embedding endpoints unavailable')
}

/**
 * Generate embedding using local Xenova model
 */
async function generateLocalEmbedding(text) {
  const embedder = await getLocalEmbedder()
  if (!embedder) throw new Error('Local embedder not available')

  const output = await embedder(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

/**
 * Deterministic fallback embedding generator (128 dimensions)
 */
function generateFallbackEmbedding(text) {
  const words = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  const dim = 128
  const vec = new Array(dim).fill(0)
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    let hash = 0
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j)
      hash |= 0
    }
    const idx = Math.abs(hash) % dim
    vec[idx] += 1
  }

  // Normalize
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1
  return vec.map(v => Number((v / magnitude).toFixed(6)))
}

/**
 * Main embedding generator - tries Google Gemini -> Local Transformers -> Semantic Fallback
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) {
    return new Array(128).fill(0)
  }

  // 1. Try Google Gemini Embeddings
  if (config.googleApiKey) {
    try {
      const emb = await generateGoogleEmbedding(text)
      return emb
    } catch (err) {
      console.warn('[EmbeddingService] Google Gemini Embedding failed, trying fallback:', err.message)
    }
  }

  // 2. Try Local Transformers Embedder
  try {
    const emb = await generateLocalEmbedding(text)
    return emb
  } catch (err) {
    // Fall back to deterministic vector
  }

  // 3. Fallback
  return generateFallbackEmbedding(text)
}

/**
 * Batch generate embeddings for multiple texts
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function generateBatchEmbeddings(texts) {
  const results = []
  for (const text of texts) {
    const emb = await generateEmbedding(text)
    results.push(emb)
  }
  return results
}

/**
 * Calculate Cosine Similarity between two numerical vectors
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Score between -1 and 1 (1 = identical)
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0
  
  // If dimensions mismatch (e.g. comparing 768 to 128), truncate or project to min length
  const minDim = Math.min(vecA.length, vecB.length)
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < minDim; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0
  return dotProduct / denominator
}
