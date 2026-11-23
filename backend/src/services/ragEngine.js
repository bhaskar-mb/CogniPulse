import { config } from '../config.js'
import { querySimilarChunks } from './vectorStoreService.js'
import StudentLearningProfile from '../models/StudentLearningProfile.js'

/**
 * Adaptive Classroom RAG Engine & Context Fusion Layer
 */

/**
 * Build fused context prompt combining Course Materials, Previous Lectures,
 * Current Lecture Transcript, and Student Learning Profile.
 */
export async function buildFusedContext({
  roomId,
  currentTranscript = '',
  searchTopic = '',
  includeCourseMaterials = true,
  includePreviousLectures = true,
  targetStudentId = null,
  difficulty = 'medium',
  category = 'MCQ', // 'MCQ' | 'CODING' | 'CONCEPT' | 'MIXED'
  numQuestions = 2
}) {
  const docTypes = []
  if (includeCourseMaterials) docTypes.push('course_material')
  if (includePreviousLectures) docTypes.push('previous_lecture')
  docTypes.push('current_lecture')

  const query = searchTopic || currentTranscript.slice(0, 300) || 'Core lecture concepts'

  // 1. Vector Search for relevant chunks
  let retrievedChunks = []
  if (roomId) {
    retrievedChunks = await querySimilarChunks(query, roomId, {
      topK: 4,
      docTypes,
      minScore: 0.08
    })
  }

  // 2. Fetch Student / Class Learning Profile to detect weak areas
  let weakConcepts = []
  let adaptiveProfileNote = ''

  if (targetStudentId && roomId) {
    const profile = await StudentLearningProfile.findOne({ studentId: targetStudentId, roomId }).lean()
    if (profile && profile.weakConcepts?.length > 0) {
      weakConcepts = profile.weakConcepts.map(w => w.concept)
      adaptiveProfileNote = `TARGET STUDENT PROFILE: Weak in concepts [${weakConcepts.join(', ')}]. Overall ALPS Score: ${profile.alps || 'N/A'}/100. Target questions to reinforce these weak concepts.`
    }
  } else if (roomId) {
    // Class-wide weak concepts
    const profiles = await StudentLearningProfile.find({ roomId }).lean()
    const conceptCounts = {}
    profiles.forEach(p => {
      p.weakConcepts?.forEach(w => {
        conceptCounts[w.concept] = (conceptCounts[w.concept] || 0) + (w.errorCount || 1)
      })
    })
    const topWeak = Object.entries(conceptCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c)
    if (topWeak.length > 0) {
      weakConcepts = topWeak
      adaptiveProfileNote = `CLASS-WIDE ADAPTIVE FOCUS: Students commonly struggle with [${topWeak.join(', ')}]. Tailor questions to address these key concepts.`
    }
  }

  // 3. Assemble Fused Context
  const materialContext = retrievedChunks
    .filter(r => r.chunk.docType === 'course_material')
    .map((r, i) => `[Course Material: ${r.chunk.sourceTitle || 'Notes'}]\n${r.chunk.text}`)
    .join('\n\n')

  const prevLectureContext = retrievedChunks
    .filter(r => r.chunk.docType === 'previous_lecture')
    .map((r, i) => `[Previous Lecture: ${r.chunk.sourceTitle || 'Past Session'}]\n${r.chunk.text}`)
    .join('\n\n')

  const fusedPrompt = buildRagQuestionPrompt({
    currentTranscript,
    materialContext,
    prevLectureContext,
    adaptiveProfileNote,
    category,
    difficulty,
    numQuestions
  })

  return {
    prompt: fusedPrompt,
    retrievedChunks,
    weakConcepts,
    contextSummary: {
      hasCourseMaterials: !!materialContext,
      hasPrevLectures: !!prevLectureContext,
      hasCurrentTranscript: !!currentTranscript,
      retrievedCount: retrievedChunks.length
    }
  }
}

/**
 * Construct the LLM prompt for RAG question generation
 */
function buildRagQuestionPrompt({
  currentTranscript,
  materialContext,
  prevLectureContext,
  adaptiveProfileNote,
  category,
  difficulty,
  numQuestions
}) {
  let categoryInstructions = ''
  
  if (category === 'CODING') {
    categoryInstructions = `Generate ${numQuestions} REAL-TIME CODING QUESTIONS.
- Question text MUST BE CRISP, DIRECT, and UNDER 80 CHARACTERS.
- Include a short, clean code snippet (3-6 lines max).
- Options must be concise outputs, edge cases, or short bug fixes (under 40 chars each).`
  } else if (category === 'CONCEPT') {
    categoryInstructions = `Generate ${numQuestions} REAL-TIME CONCEPT QUESTIONS.
- Question text MUST BE CRISP, DIRECT, and UNDER 80 CHARACTERS (e.g. "What is the primary purpose of X?").
- Focus on core principles from the teacher's lesson.
- Options must be short and clear (under 50 chars each). Exactly one correct option.`
  } else if (category === 'MIXED') {
    categoryInstructions = `Generate ${numQuestions} REAL-TIME QUESTIONS combining MCQ, Concept checks, and Coding problems.
- All question texts MUST be under 80 characters.
- Keep options concise and realistic (under 50 chars each).`
  } else {
    categoryInstructions = `Generate ${numQuestions} REAL-TIME MULTIPLE CHOICE QUESTIONS (MCQ).
- Question text MUST BE CONCISE, DIRECT, and UNDER 80 CHARACTERS.
- Exactly 4 options (A, B, C, D) with 1 correct answer.
- Options must be short, realistic phrases (under 50 chars each).`
  }

  return `You are the CogniPulse Adaptive Classroom Real-Time Quiz Engine. Generate realistic, exam-standard questions based strictly on the teacher's lesson context:

=== CONTEXT 1: TEACHER LECTURE TRANSCRIPT ===
${currentTranscript || 'No live transcript provided; rely on Course Materials.'}

=== CONTEXT 2: RETRIEVED COURSE MATERIALS ===
${materialContext || 'No additional course materials uploaded.'}

=== CONTEXT 3: PREVIOUS LECTURES CONTEXT ===
${prevLectureContext || 'No previous lecture history.'}

=== ADAPTIVE LEARNING PROFILE ===
${adaptiveProfileNote || 'Target general classroom comprehension.'}

=== GENERATION RULES ===
1. QUESTION LENGTH: Max 80 characters. Be direct, clear, and realistic.
2. OPTIONS: Exactly 4 options. Max 50 characters per option.
3. GROUNDING: Must test exact concepts from the teacher's session.
4. Difficulty: ${difficulty.toUpperCase()} | Category: ${category} | Count: ${numQuestions}

${categoryInstructions}

OUTPUT FORMAT:
Respond ONLY with a valid JSON object in this exact schema:
{
  "questions": [
    {
      "type": "MCQ",
      "question": "What is the primary role of [Topic]?",
      "codeSnippet": "",
      "language": "javascript",
      "difficulty": "${difficulty.toLowerCase()}",
      "conceptTags": ["TopicName"],
      "options": [
        { "text": "Correct definition or role", "isCorrect": true },
        { "text": "Common misconception A", "isCorrect": false },
        { "text": "Distractor B", "isCorrect": false },
        { "text": "Distractor C", "isCorrect": false }
      ],
      "explanation": "Clear 1-2 sentence explanation based on the lecture."
    }
  ]
}`
}

/**
 * Clean and truncate string to a maximum length cleanly
 */
function cleanShorten(str, maxLen = 80) {
  if (!str) return ''
  const trimmed = str.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= maxLen) return trimmed
  const truncated = trimmed.slice(0, maxLen - 3)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 30) {
    return truncated.slice(0, lastSpace) + '?'
  }
  return truncated + '...?'
}

/**
 * Format and parse LLM response into standardized question objects
 */
function parseAndFormatQuestions(responseText, category, difficulty) {
  try {
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) jsonStr = jsonMatch[1]

    const objMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (!objMatch) throw new Error('No JSON object found')

    const parsed = JSON.parse(objMatch[0])
    const questions = parsed.questions || []

    return questions.map((q, idx) => {
      let qText = (q.question || 'Question text').trim()
      if (qText.length > 85) {
        qText = cleanShorten(qText, 80)
      }

      return {
        id: `rag_${Date.now()}_${idx}`,
        type: q.type || (category === 'CODING' ? 'CODING' : (category === 'CONCEPT' ? 'CONCEPT' : 'MCQ')),
        question: qText,
        codeSnippet: q.codeSnippet || '',
        language: q.language || 'javascript',
        difficulty: q.difficulty || difficulty,
        conceptTags: (q.conceptTags && q.conceptTags.length > 0) ? q.conceptTags.map(t => t.slice(0, 30)) : ['Lesson Topic'],
        options: (q.options || []).map(opt => ({
          text: (opt.text || 'Option').slice(0, 60),
          isCorrect: !!opt.isCorrect
        })),
        explanation: (q.explanation || '').slice(0, 200),
        createdAt: new Date().toISOString()
      }
    })
  } catch (err) {
    console.error('[RagEngine] Failed to parse questions:', err.message)
    return []
  }
}

/**
 * Execute LLM call with provider cascade (Gemini -> OpenAI -> Claude -> MiniMax -> Fallback)
 */
export async function generateRagQuestions(fusedContextConfig) {
  const { prompt, retrievedChunks, weakConcepts, contextSummary } = await buildFusedContext(fusedContextConfig)
  const { provider = 'google', numQuestions = 2, category = 'MCQ', difficulty = 'medium' } = fusedContextConfig

  console.log(`[RagEngine] Generating ${numQuestions} ${category} questions with RAG context...`)

  let responseText = null
  const providersToTry = [provider, 'google', 'openai', 'anthropic', 'minimax'].filter((p, i, self) => self.indexOf(p) === i)

  for (const p of providersToTry) {
    try {
      if (p === 'google' && config.googleApiKey) {
        responseText = await callGoogle(prompt)
      } else if (p === 'openai' && config.openaiApiKey) {
        responseText = await callOpenAI(prompt)
      } else if (p === 'anthropic' && config.anthropicApiKey) {
        responseText = await callAnthropic(prompt)
      } else if (p === 'minimax' && config.minimaxApiKey) {
        responseText = await callMiniMax(prompt)
      }
      if (responseText) {
        console.log(`[RagEngine] Received AI response via '${p}'`)
        break
      }
    } catch (err) {
      console.warn(`[RagEngine] Provider '${p}' error:`, err.message)
    }
  }

  let questions = []
  if (responseText) {
    questions = parseAndFormatQuestions(responseText, category, difficulty)
  }

  // If AI generation failed, generate smart local fallback questions
  if (!questions || questions.length === 0) {
    console.log('[RagEngine] Using local fallback question generator...')
    questions = generateLocalRagFallback({
      currentTranscript: fusedContextConfig.currentTranscript,
      retrievedChunks,
      category,
      difficulty,
      numQuestions
    })
  }

  return {
    questions,
    retrievedChunks,
    weakConcepts,
    contextSummary
  }
}

/**
 * Local Fallback generator when all AI providers are offline
 * Produces crisp, realistic <=80 char questions grounded in lecture text
 */
function generateLocalRagFallback({ currentTranscript, retrievedChunks, category, difficulty, numQuestions }) {
  const contextSnippet = currentTranscript || (retrievedChunks?.[0]?.chunk?.text) || 'Core principles of software architecture and algorithms'
  const sentences = contextSnippet
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim().replace(/^[^a-zA-Z0-9]+/, ''))
    .filter(s => s.length > 15 && !s.toLowerCase().startsWith('um') && !s.toLowerCase().startsWith('uh'))

  const validSentences = sentences.length > 0 ? sentences : [
    contextSnippet || 'Core principles of modern programming architecture and algorithmic efficiency'
  ]

  const questions = []
  for (let i = 0; i < numQuestions; i++) {
    const targetSentence = validSentences[i % validSentences.length] || validSentences[0]
    
    // Clean out conversational filler prefixes from speech-to-text
    const cleanedSentence = targetSentence
      .replace(/^(today we are (covering|discussing|looking at)|in this lecture we (will|are going to)?|let us (look at|discuss|understand)|we are going to talk about|as we (know|discussed)|first of all|so basically|now let's see|remember that|note that)\s+/i, '')
      .trim()

    // Extract key topic from sentence
    const isRelation = /( is | are | was | were | means | refers to | causes | leads to | consists of | creates | prevents | enables | requires )/i.exec(cleanedSentence)
    let rawTopic = ''
    let keyDetail = ''
    
    if (isRelation) {
      rawTopic = cleanedSentence.substring(0, isRelation.index).trim()
      keyDetail = cleanedSentence.substring(isRelation.index + isRelation[0].length).trim()
    } else {
      const words = cleanedSentence.split(/\s+/)
      rawTopic = words.slice(0, Math.min(4, words.length)).join(' ')
      keyDetail = words.slice(4, 12).join(' ') || 'core lecture concept'
    }

    // Clean topic name
    let topic = rawTopic
      .replace(/^(the|a|an|in|on|at|for|to|with|about)\s+/i, '')
      .replace(/[.,:;?!]+$/, '')
      .trim()
    if (topic.length > 25) topic = topic.slice(0, 25)
    if (topic) {
      topic = topic.charAt(0).toUpperCase() + topic.slice(1)
    } else {
      topic = 'Lecture Concept'
    }

    // Concise option text (<= 55 chars)
    let correctText = keyDetail.slice(0, 50)
    if (!correctText || correctText.length < 5) correctText = `Defines the primary role of ${topic}`
    correctText = correctText.charAt(0).toUpperCase() + correctText.slice(1)

    const distractor1 = `Executes only during system initialization`
    const distractor2 = `Bypasses validation checks automatically`
    const distractor3 = `Has no direct impact on runtime state`

    const questionTemplates = [
      `What is the primary purpose of ${topic}?`,
      `Which statement correctly defines ${topic}?`,
      `How is ${topic} utilized in this lesson?`,
      `What is the core function of ${topic}?`
    ]
    const qText = questionTemplates[i % questionTemplates.length]

    if (category === 'CODING') {
      questions.push({
        id: `rag_fb_${Date.now()}_${i}`,
        type: 'CODING',
        question: `What is the expected outcome of ${topic}?`,
        codeSnippet: `// Implementation check\nfunction check${topic.replace(/\s+/g, '')}(val) {\n  return val ? true : false;\n}`,
        language: 'javascript',
        difficulty,
        conceptTags: [topic, 'Code Logic'],
        options: [
          { text: correctText, isCorrect: true },
          { text: distractor1, isCorrect: false },
          { text: distractor2, isCorrect: false },
          { text: distractor3, isCorrect: false }
        ],
        explanation: `Based on lesson session: "${targetSentence.slice(0, 100)}"`,
        createdAt: new Date().toISOString()
      })
    } else if (category === 'CONCEPT') {
      questions.push({
        id: `rag_fb_${Date.now()}_${i}`,
        type: 'CONCEPT',
        question: qText.slice(0, 80),
        codeSnippet: '',
        language: 'javascript',
        difficulty,
        conceptTags: [topic, 'Core Concept'],
        options: [
          { text: correctText, isCorrect: true },
          { text: distractor1, isCorrect: false },
          { text: distractor2, isCorrect: false },
          { text: distractor3, isCorrect: false }
        ],
        explanation: `Directly supported by lesson: "${targetSentence.slice(0, 100)}"`,
        createdAt: new Date().toISOString()
      })
    } else {
      questions.push({
        id: `rag_fb_${Date.now()}_${i}`,
        type: 'MCQ',
        question: qText.slice(0, 80),
        codeSnippet: '',
        language: 'javascript',
        difficulty,
        conceptTags: [topic],
        options: [
          { text: correctText, isCorrect: true },
          { text: distractor1, isCorrect: false },
          { text: distractor2, isCorrect: false },
          { text: distractor3, isCorrect: false }
        ],
        explanation: `Directly grounded in session transcript: "${targetSentence.slice(0, 100)}"`,
        createdAt: new Date().toISOString()
      })
    }
  }

  return questions
}

// Provider Call Helpers
async function callGoogle(prompt) {
  const models = [
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash-lite'
  ]
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${config.googleApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
        })
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text
      }
    } catch {
      // try next model
    }
  }
  throw new Error('Google Gemini endpoints failed')
}

async function callOpenAI(prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.openaiApiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.7 })
  })
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callAnthropic(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.anthropicApiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', messages: [{ role: 'user', content: prompt }], max_tokens: 2500 })
  })
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

async function callMiniMax(prompt) {
  const res = await fetch('https://api.minimax.io/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.minimaxApiKey}` },
    body: JSON.stringify({ model: 'MiniMax-M3', messages: [{ role: 'user', content: prompt }], temperature: 0.7 })
  })
  if (!res.ok) throw new Error(`MiniMax API error ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}
