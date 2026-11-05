import mongoose from 'mongoose'
import RagChunk from '../models/RagChunk.js'
import CourseMaterial from '../models/CourseMaterial.js'
import Transcript from '../models/Transcript.js'
import { generateEmbedding, cosineSimilarity } from './embeddingService.js'

const CHROMA_URL = process.env.CHROMA_URL || ''

/**
 * Store and index chunks for a CourseMaterial or Transcript
 * @param {object} params
 * @param {string} params.roomId
 * @param {string} params.sourceId
 * @param {string} params.sourceModel - 'CourseMaterial' | 'Transcript'
 * @param {string} params.docType - 'course_material' | 'previous_lecture' | 'current_lecture'
 * @param {string} params.sourceTitle
 * @param {Array<{ chunkIndex: number, text: string, tokenCount: number, concepts: string[] }>} params.chunks
 */
export async function indexDocumentChunks({
  roomId,
  sourceId,
  sourceModel = 'CourseMaterial',
  docType = 'course_material',
  sourceTitle = '',
  chunks = []
}) {
  if (!chunks || chunks.length === 0) return []

  const roomObjId = new mongoose.Types.ObjectId(roomId)
  const sourceObjId = sourceId ? new mongoose.Types.ObjectId(sourceId) : null

  // Remove any pre-existing chunks for this sourceId
  if (sourceObjId) {
    await RagChunk.deleteMany({ sourceId: sourceObjId })
  }

  const chunkDocs = []

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text)

    chunkDocs.push({
      roomId: roomObjId,
      sourceId: sourceObjId,
      sourceModel,
      docType,
      sourceTitle,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      cleanedText: chunk.text,
      tokenCount: chunk.tokenCount || Math.round(chunk.text.length / 4),
      embedding,
      concepts: chunk.concepts || []
    })
  }

  const saved = await RagChunk.insertMany(chunkDocs)

  // Sync with external ChromaDB if configured
  if (CHROMA_URL) {
    try {
      await syncToChromaDB(saved, roomId)
    } catch (err) {
      console.warn('[VectorStore] ChromaDB sync failed (using internal vector store):', err.message)
    }
  }

  return saved
}

/**
 * Index a lecture transcript segment or full session
 * @param {object} params
 * @param {string} params.roomId
 * @param {string} params.transcriptId
 * @param {string} params.text
 * @param {number} params.segmentIndex
 * @param {string} params.docType - 'current_lecture' | 'previous_lecture'
 */
export async function indexLectureTranscript({
  roomId,
  transcriptId,
  text,
  segmentIndex = 0,
  docType = 'current_lecture'
}) {
  if (!text || text.trim().length === 0) return null

  const { chunkText } = await import('./documentParserService.js')
  const chunks = chunkText(text, { chunkSize: 500, overlap: 80 })

  return indexDocumentChunks({
    roomId,
    sourceId: transcriptId,
    sourceModel: 'Transcript',
    docType,
    sourceTitle: `Lecture Segment ${segmentIndex + 1}`,
    chunks
  })
}

/**
 * Semantic Vector Search across the Classroom RAG Knowledge Base
 * @param {string} query - Natural language search query or topic
 * @param {string} roomId - Room identifier
 * @param {object} options - { topK: 5, docTypes: ['course_material', 'previous_lecture', 'current_lecture'], minScore: 0.15 }
 * @returns {Promise<Array<{ chunk: object, score: number }>>}
 */
export async function querySimilarChunks(query, roomId, options = {}) {
  const {
    topK = 5,
    docTypes = ['course_material', 'previous_lecture', 'current_lecture'],
    minScore = 0.05
  } = options

  if (!query || !roomId) return []

  // Generate embedding for the search query
  const queryEmbedding = await generateEmbedding(query)
  const roomObjId = new mongoose.Types.ObjectId(roomId)

  // Retrieve candidate chunks from MongoDB for this room and requested docTypes
  const candidateFilter = {
    roomId: roomObjId,
    docType: { $in: docTypes }
  }

  const chunks = await RagChunk.find(candidateFilter).lean()
  if (!chunks || chunks.length === 0) return []

  // Extract query keywords (ignore trivial stop words)
  const queryWords = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !/^(the|and|for|with|that|this|from|about|what|which|where|when|how)$/i.test(w))

  // Hybrid scoring: Vector Cosine Similarity (65%) + Keyword Token Overlap (25%) + Concept Tag Match (10%)
  const scoredChunks = chunks.map(chunk => {
    // 1. Vector Cosine Similarity
    const vectorScore = (queryEmbedding && queryEmbedding.length > 0 && chunk.embedding?.length > 0)
      ? Math.max(0, cosineSimilarity(queryEmbedding, chunk.embedding))
      : 0

    // 2. Keyword / Token Overlap Score
    const chunkLower = (chunk.text || '').toLowerCase()
    let keywordHits = 0
    queryWords.forEach(word => {
      if (chunkLower.includes(word)) keywordHits++
    })
    const keywordScore = queryWords.length > 0 ? (keywordHits / queryWords.length) : 0

    // 3. Exact Concept Tag Match
    const chunkConcepts = (chunk.concepts || []).map(c => (c || '').toLowerCase())
    let conceptHits = 0
    queryWords.forEach(word => {
      if (chunkConcepts.some(c => c.includes(word))) conceptHits++
    })
    const conceptScore = queryWords.length > 0 ? Math.min(1, conceptHits / queryWords.length) : 0

    // Hybrid weighted score
    const compositeScore = (vectorScore * 0.65) + (keywordScore * 0.25) + (conceptScore * 0.10)

    return {
      chunk: {
        _id: chunk._id,
        sourceId: chunk.sourceId,
        sourceModel: chunk.sourceModel,
        docType: chunk.docType,
        sourceTitle: chunk.sourceTitle,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        concepts: chunk.concepts || []
      },
      score: Number(compositeScore.toFixed(4)),
      vectorScore: Number(vectorScore.toFixed(4)),
      keywordScore: Number(keywordScore.toFixed(4))
    }
  })

  // Filter by minScore, sort descending, and return top-K
  return scoredChunks
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/**
 * Remove all chunks associated with a specific CourseMaterial
 */
export async function deleteMaterialChunks(materialId) {
  const objId = new mongoose.Types.ObjectId(materialId)
  return RagChunk.deleteMany({ sourceId: objId })
}

/**
 * Get knowledge base summary statistics for a room
 */
export async function getRoomRagStats(roomId) {
  const roomObjId = new mongoose.Types.ObjectId(roomId)

  const [totalChunks, docTypeCounts, materialsCount] = await Promise.all([
    RagChunk.countDocuments({ roomId: roomObjId }),
    RagChunk.aggregate([
      { $match: { roomId: roomObjId } },
      { $group: { _id: '$docType', count: { $sum: 1 } } }
    ]),
    CourseMaterial.countDocuments({ roomId: roomObjId, status: 'indexed' })
  ])

  const countsByType = {
    course_material: 0,
    previous_lecture: 0,
    current_lecture: 0
  }

  docTypeCounts.forEach(item => {
    if (countsByType[item._id] !== undefined) {
      countsByType[item._id] = item.count
    }
  })

  return {
    totalChunks,
    materialsCount,
    countsByType
  }
}

/**
 * Optional ChromaDB REST API sync helper
 */
async function syncToChromaDB(chunks, roomId) {
  if (!CHROMA_URL || !chunks.length) return

  const collectionName = `cognipulse_room_${roomId}`
  // 1. Create or get collection
  const collRes = await fetch(`${CHROMA_URL}/api/v1/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: collectionName, metadata: { roomId } })
  })

  const collData = await collRes.json()
  const collectionId = collData.id || collData.name

  // 2. Add embeddings
  await fetch(`${CHROMA_URL}/api/v1/collections/${collectionId}/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ids: chunks.map(c => c._id.toString()),
      embeddings: chunks.map(c => c.embedding),
      documents: chunks.map(c => c.text),
      metadatas: chunks.map(c => ({
        docType: c.docType,
        sourceTitle: c.sourceTitle || '',
        chunkIndex: c.chunkIndex
      }))
    })
  })
}
