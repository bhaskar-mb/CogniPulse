import fs from 'fs'
import path from 'path'

/**
 * Universal document parser and chunker for CogniPulse RAG pipeline.
 * Supports PDF, DOCX, TXT, Markdown, and PPTX summaries.
 */

/**
 * Parse a file from disk or buffer based on file extension / mime type.
 * @param {string} filePath - Absolute path to uploaded file
 * @param {string} originalName - Original filename
 * @returns {Promise<{ text: string, metadata: object }>}
 */
export async function parseDocument(filePath, originalName) {
  const ext = (path.extname(originalName || filePath) || '').toLowerCase().replace('.', '')
  
  let rawText = ''
  let pageCount = 1

  try {
    if (ext === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath)
      // Dynamic import to support ESM environments
      const pdfParse = (await import('pdf-parse')).default || (await import('pdf-parse'))
      const pdfData = await pdfParse(dataBuffer)
      rawText = pdfData.text || ''
      pageCount = pdfData.numpages || 1
    } else if (ext === 'docx') {
      const mammoth = (await import('mammoth')).default || (await import('mammoth'))
      const result = await mammoth.extractRawText({ path: filePath })
      rawText = result.value || ''
    } else if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'json') {
      rawText = fs.readFileSync(filePath, 'utf-8')
    } else {
      // Fallback: try reading as UTF-8 text
      try {
        rawText = fs.readFileSync(filePath, 'utf-8')
      } catch (err) {
        throw new Error(`Unsupported document format .${ext}`)
      }
    }
  } catch (parseErr) {
    console.error(`Document parser error for ${originalName}:`, parseErr)
    throw new Error(`Failed to parse document ${originalName}: ${parseErr.message}`)
  }

  const cleanedText = cleanText(rawText)
  
  if (!cleanedText || cleanedText.trim().length === 0) {
    throw new Error(`Parsed document ${originalName} contains no readable text`)
  }

  return {
    text: cleanedText,
    metadata: {
      fileName: originalName,
      fileType: ext || 'other',
      pageCount,
      charCount: cleanedText.length,
      wordCount: cleanedText.split(/\s+/).filter(Boolean).length
    }
  }
}

/**
 * Clean and normalize text extracted from documents or transcripts.
 */
export function cleanText(text) {
  if (!text) return ''
  return text
    // Replace non-breaking spaces and other unicode spaces
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Replace carriage returns
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove repeated page header/footer markers (e.g. Page X of Y)
    .replace(/\n\s*page\s+\d+(\s+of\s+\d+)?\s*\n/gi, '\n')
    // Replace 3+ consecutive newlines with 2
    .replace(/\n{3,}/g, '\n\n')
    // Normalize excessive horizontal whitespace
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/**
 * Chunk text into semantic pieces with configurable size and overlap.
 * @param {string} text - Cleaned document text
 * @param {object} options - { chunkSize: 600, overlap: 100 }
 * @returns {Array<{ chunkIndex: number, text: string, tokenCount: number, concepts: string[] }>}
 */
export function chunkText(text, options = {}) {
  const { chunkSize = 700, overlap = 120 } = options
  
  if (!text || text.trim().length === 0) return []

  const paragraphs = text.split(/\n\s*\n/)
  const chunks = []
  let currentChunk = ''
  let chunkIndex = 0

  for (const para of paragraphs) {
    const trimmedPara = para.trim()
    if (!trimmedPara) continue

    // If adding this paragraph exceeds chunkSize and currentChunk is non-empty
    if (currentChunk.length + trimmedPara.length > chunkSize && currentChunk.length > 0) {
      const finalChunkText = currentChunk.trim()
      chunks.push({
        chunkIndex,
        text: finalChunkText,
        tokenCount: Math.round(finalChunkText.length / 4),
        concepts: extractKeyConcepts(finalChunkText)
      })
      chunkIndex++

      // Carry forward overlap from the end of the current chunk
      const words = finalChunkText.split(/\s+/)
      const overlapWords = words.slice(Math.max(0, words.length - Math.round(overlap / 5))).join(' ')
      currentChunk = overlapWords + '\n\n' + trimmedPara
    } else {
      currentChunk += (currentChunk.length ? '\n\n' : '') + trimmedPara
    }
  }

  // Add the trailing chunk
  if (currentChunk.trim().length > 0) {
    const finalChunkText = currentChunk.trim()
    chunks.push({
      chunkIndex,
      text: finalChunkText,
      tokenCount: Math.round(finalChunkText.length / 4),
      concepts: extractKeyConcepts(finalChunkText)
    })
  }

  return chunks
}

/**
 * Simple key concept / keyword extractor for chunk metadata tagging
 */
export function extractKeyConcepts(text) {
  if (!text) return []
  
  // Find capitalized multi-word terms, technical phrases, and frequent nouns
  const stopwords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'with', 'as', 'by',
    'that', 'this', 'it', 'from', 'be', 'are', 'was', 'were', 'or', 'can', 'will', 'an', 'if', 'we',
    'you', 'they', 'he', 'she', 'has', 'have', 'had', 'do', 'does', 'did', 'but', 'not', 'what', 'all'
  ])

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w))

  const freq = {}
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1
  }

  // Top 5-8 salient words/concepts
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([word]) => word)
}
