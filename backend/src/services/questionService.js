import dotenv from 'dotenv'
dotenv.config()
import Question from '../models/Question.js'
import Response from '../models/Response.js'
import Room from '../models/Room.js'
import { config, AI_PROVIDERS } from '../config.js'

// Re-export for convenience
export { AI_PROVIDERS }

export const createQuestion = async (data, createdBy) => {
  const question = new Question({
    roomId: data.roomId,  // Use roomId to match Question model
    question: data.question,
    options: data.options,
    type: data.type || 'MCQ',
    status: data.status || 'pending',  // pending for manual, approved for AI
    segmentIndex: data.segmentIndex || 0,
    timeToAnswer: data.timer || data.timeToAnswer || 30,
    points: data.points || 100,
    createdBy
  })

  await question.save()
  return question
}

export const getQuestionById = async (id) => {
  const question = await Question.findById(id).populate('createdBy', 'name email')
  
  if (!question) {
    throw new Error('Question not found')
  }
  
  return question
}

export const getQuestionsByRoom = async (roomId) => {
  return Question.find({ roomId: roomId }).sort({ createdAt: 1 })
}

export const updateQuestion = async (questionId, updates, userId) => {
  const question = await Question.findById(questionId)
  
  if (!question) {
    throw new Error('Question not found')
  }
  
  // Check ownership
  if (question.createdBy.toString() !== userId.toString()) {
    throw new Error('Not authorized to update this question')
  }
  
  Object.assign(question, updates)
  await question.save()
  
  return question
}

export const deleteQuestion = async (questionId, userId) => {
  const question = await Question.findById(questionId)
  
  if (!question) {
    throw new Error('Question not found')
  }
  
  if (question.createdBy.toString() !== userId.toString()) {
    throw new Error('Not authorized to delete this question')
  }
  
  await Question.findByIdAndDelete(questionId)
  
  // Also delete related responses
  await Response.deleteMany({ question: questionId })
  
  return true
}

export const setActiveQuestion = async (roomId, questionId) => {
  // Deactivate all questions in the room
  await Question.updateMany(
    { roomId: roomId },
    { $set: { isActive: false } }
  )
  
  // Activate the specified question
  const question = await Question.findByIdAndUpdate(
    questionId,
    { $set: { isActive: true } },
    { new: true }
  )
  
  if (!question) {
    throw new Error('Question not found')
  }
  
  // Update room's currentQuestion
  await Room.findByIdAndUpdate(roomId, { currentQuestion: questionId })
  
  return question
}

export const submitResponse = async (data, studentId) => {
  const { questionId, selectedOption, responseTime } = data
  
  // Get the question to check correct answer
  const question = await Question.findById(questionId)
  
  if (!question) {
    throw new Error('Question not found')
  }
  
  const isCorrect = selectedOption === question.correctOptionIndex
  
  const response = new Response({
    question: questionId,
    roomId: question.roomId,
    studentId: studentId,
    selectedOption,
    isCorrect,
    responseTime
  })

  await response.save()
  
  return response
}

export const getResponsesByQuestion = async (questionId) => {
  return Response.find({ question: questionId })
    .populate('student', 'name email')
    .sort({ createdAt: -1 })
}

export const getResponsesByRoom = async (roomId) => {
  return Response.find({ roomId: roomId })
    .populate('studentId', 'name email')
    .sort({ createdAt: -1 })
}

export const getQuestionResults = async (questionId) => {
  const responses = await Response.find({ question: questionId })
  
  const totalResponses = responses.length
  
  if (totalResponses === 0) {
    return {
      totalResponses: 0,
      results: {},
      correctPercentage: 0
    }
  }
  
  const results = {}
  let correctCount = 0
  
  responses.forEach(response => {
    const option = response.selectedOption
    results[option] = (results[option] || 0) + 1
    
    if (response.isCorrect) {
      correctCount++
    }
  })
  
  return {
    totalResponses,
    results,
    correctPercentage: Math.round((correctCount / totalResponses) * 100)
  }
}

// Question Type Mix helper
function getQuestionTypeMix(numQuestions) {
  const types = []
  
  if (numQuestions === 1) {
    types.push('MCQ')
  } else if (numQuestions === 2) {
    types.push('MCQ', 'TF')
  } else if (numQuestions === 3) {
    types.push('MCQ', 'TF', 'MSQ')
  } else {
    const mcqCount = Math.round(numQuestions * 0.5)
    const tfCount = Math.round(numQuestions * 0.3)
    const msqCount = numQuestions - mcqCount - tfCount
    
    for (let i = 0; i < mcqCount; i++) types.push('MCQ')
    for (let i = 0; i < tfCount; i++) types.push('TF')
    for (let i = 0; i < msqCount; i++) types.push('MSQ')
  }
  
  return types.slice(0, numQuestions)
}

// Generate question types from provided mix percentages
function generateFromMix(questionTypeMix, numQuestions) {
  const { MCQ = 50, TF = 30, MSQ = 20 } = questionTypeMix
  const total = MCQ + TF + MSQ
  
  const mcqCount = Math.round((MCQ / total) * numQuestions)
  const tfCount = Math.round((TF / total) * numQuestions)
  const msqCount = numQuestions - mcqCount - tfCount
  
  const types = []
  for (let i = 0; i < mcqCount; i++) types.push('MCQ')
  for (let i = 0; i < tfCount; i++) types.push('TF')
  for (let i = 0; i < msqCount; i++) types.push('MSQ')
  
  // Shuffle to mix them up nicely
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]]
  }
  
  return types.slice(0, numQuestions)
}

// Build prompt for question generation
// Clean speech artifacts, filler words, and sign-offs from transcript text
export function cleanTranscriptText(transcript) {
  if (!transcript) return ''
  return transcript
    .replace(/\b(thank you so much|thank you very much|thank you|thanks for listening|thanks for watching|thanks|thank u)\b/gi, '')
    .replace(/\b(hello everyone|can you hear me|let's get started|welcome everyone|good morning|good afternoon)\b/gi, '')
    .replace(/\b(um|uh|er|ah|you know|like i said|as i said|so basically|basically|okay so|right)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Split text into clean, digestible single-idea propositions
export function extractPropositions(cleanText) {
  if (!cleanText) return []
  let pieces = cleanText
    .split(/(?<=[.!?])\s+/)
    .map(p => p.trim())
    .filter(p => p.length > 8)

  const refined = []
  pieces.forEach(p => {
    // Split run-on speech on natural clause connectors
    const subClauses = p
      .split(/\s+(?:,\s*and\b|;\s*|\bwhich\s+allows\b|\bwhich\s+enables\b|\bwhich\s+caused\b|\busing\s+features\s+like\b|\bbecause\b|\bwhile\b|\bthey\s+allow\b|\bthis\s+format\b|\bin\s+contrast\b|\bmoreover\b|\bhowever\b|\bwhere\b)/i)
      .map(s => s.trim().replace(/^(and|or|but|also|so|then|with|using|which|that|they|this)\s+/i, ''))
      .filter(s => s.length > 10)

    if (subClauses.length > 0) {
      refined.push(...subClauses)
    } else {
      const words = p.split(/\s+/)
      if (words.length > 14) {
        for (let i = 0; i < words.length; i += 12) {
          const slice = words.slice(i, i + 12).join(' ').trim()
          if (slice.length > 8) refined.push(slice)
        }
      } else {
        refined.push(p)
      }
    }
  })

  return refined.length > 0 ? refined : [cleanText]
}

// Build prompt for question generation
export function buildQuestionPrompt(transcript, questionTypes, difficulty = 'medium') {
  const cleaned = cleanTranscriptText(transcript)
  const typeInstructions = questionTypes.map((type, index) => {
    switch (type) {
      case 'MCQ':
        return `${index + 1}. MCQ: Create a crisp multiple choice question (10-20 words max) with ONE correct answer and 3 concise wrong options (2-6 words each). Mark the correct answer.`
      case 'TF':
        return `${index + 1}. T/F: Create a short True or False statement (8-16 words max). Mark the correct answer.`
      case 'MSQ':
        return `${index + 1}. MSQ: Create a focused multiple select question (10-20 words max) with 2-3 correct options and 1-2 wrong options. Mark ALL correct options.`
      default:
        return `${index + 1}. MCQ: Create a concise multiple choice question with ONE correct answer and 3 wrong options.`
    }
  }).join('\n')

  let difficultyDirective = ''
  const diffLower = (difficulty || 'medium').toLowerCase()
  if (diffLower === 'easy') {
    difficultyDirective = `DIFFICULTY EMPHASIS: EASY (Understand and Apply) - Focus directly on core facts, direct definitions, key terminology, and foundational principles explicitly taught (do not label or mention them in the question text).`
  } else if (diffLower === 'hard') {
    difficultyDirective = `DIFFICULTY EMPHASIS: HARD (Analyze and Evaluate) - Focus on deep reasoning, evaluating trade-offs, predicting outcomes, causal mechanisms, and comparing key concepts taught (do not label or mention them in the question text).`
  } else {
    difficultyDirective = `DIFFICULTY EMPHASIS: MEDIUM difficulty - Balanced blend of direct factual recall, conceptual understanding, and practical application (do not label or mention them in the question text).`
  }

  return `You are an expert educational assessment specialist. Based EXCLUSIVELY on the provided session content, write ${questionTypes.length} high-quality quiz questions that accurately test the exact concepts, definitions, and mechanisms taught.

SESSION CONTENT:
${cleaned || transcript}

${difficultyDirective}

QUESTION TYPES (follow exactly in order):
${typeInstructions}

CRITICAL GROUNDING, LENGTH AND WORDING RULES:
1. CONCISE & READABLE QUESTIONS: Every question stem must be short, crisp, and direct (10 to 20 words maximum). NEVER copy entire long speech paragraphs, run-on sentences, or conversational fillers (like 'thank you', 'um', 'hello').
2. STRICT FACTUAL ACCURACY: Every question, correct answer, and explanation must be directly grounded in and verifiable from the provided SESSION CONTENT. Do not hallucinate, speculate, or introduce external trivia.
3. BAN META-REFERENCES: Never refer to the "source material", session transcript, "the speaker said", or use words like "speaker", "narrator", "presenter", "author", "video", or "lecture". Write questions directly as clear, standalone academic assessment questions about the subject matter itself (e.g., "What causes the O-ring to fail at low temperatures?" NOT "What did the speaker say caused the O-ring to fail?").
4. HIGH-QUALITY OPTIONS & DISTRACTORS:
   - For MCQ: Exactly 1 unequivocally correct option and 3 plausible, realistic distractors related to the topic (keep options concise, 2-6 words each; no silly distractors; no "All of the above" or "None of the above").
   - For T/F: A clear, single-clause factual statement (8-16 words max) directly testable against what was taught.
   - For MSQ: 2 to 3 concise correct options with clearly incorrect distractors.
5. EXPLANATIONS: Provide concise, clear explanations (1-2 sentences) stating the exact principle or fact taught.

OUTPUT FORMAT (respond ONLY with valid JSON, no markdown outside the JSON block):
{
  "questions": [
    {
      "type": "MCQ",
      "question": "What is the primary function of the discussed component?",
      "options": [
        { "text": "Correct answer concept", "isCorrect": true },
        { "text": "Plausible distractor 1", "isCorrect": false },
        { "text": "Plausible distractor 2", "isCorrect": false },
        { "text": "Plausible distractor 3", "isCorrect": false }
      ],
      "explanation": "Direct explanation of the concept taught."
    }
  ]
}`
}

// Parse questions from AI response
export function parseQuestions(responseText, expectedTypes = []) {
  try {
    let jsonStr = responseText
    
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }
    
    const objMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (!objMatch) {
      return []
    }
    
    const parsed = JSON.parse(objMatch[0])
    const questions = parsed.questions || []
    if (!Array.isArray(questions) || questions.length === 0) {
      return []
    }
    
    return questions.map((q, index) => {
      const qType = q.type || (expectedTypes && expectedTypes[index]) || 'MCQ'
      // Clean question text from filler sign-offs
      let cleanQ = (q.question || 'Question text missing')
        .replace(/\b(thank you|thanks for listening|thanks)\b[.!?]*$/i, '')
        .trim()
      if (!/[.!?]$/.test(cleanQ)) cleanQ += (qType === 'TF' ? '.' : '?')

      return {
        id: `q_${Date.now()}_${index}`,
        type: qType,
        question: cleanQ,
        options: parseOptions(q.options || [], qType),
        explanation: q.explanation || '',
        segmentIndex: 0,
        createdAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Failed to parse questions:', error)
    return []
  }
}

// Parse options ensuring correct structure
export function parseOptions(options, type) {
  if (type === 'TF') {
    // For True/False, standardize order: True first, False second
    if (Array.isArray(options) && options.length >= 2) {
      const trueOpt = options.find(o => (o.text || '').trim().toLowerCase() === 'true')
      const falseOpt = options.find(o => (o.text || '').trim().toLowerCase() === 'false')
      
      if (trueOpt && falseOpt) {
        return [
          { text: 'True', isCorrect: !!trueOpt.isCorrect },
          { text: 'False', isCorrect: !!falseOpt.isCorrect }
        ]
      }
    }
    // Default TF - first true, second false
    return [
      { text: 'True', isCorrect: true },
      { text: 'False', isCorrect: false }
    ]
  }

  if (!Array.isArray(options) || options.length < 2) {
    return [
      { text: 'Option A', isCorrect: true },
      { text: 'Option B', isCorrect: false },
      { text: 'Option C', isCorrect: false },
      { text: 'Option D', isCorrect: false }
    ]
  }

  const mapped = options.map(opt => ({
    text: opt.text || opt.option || 'Unknown',
    isCorrect: !!(opt.isCorrect || opt.correct)
  }))

  if (type === 'MSQ') {
    // Ensure at least 1 is correct for MSQ
    if (!mapped.some(o => o.isCorrect)) {
      if (mapped[0]) mapped[0].isCorrect = true
      if (mapped[1]) mapped[1].isCorrect = true
    }
    return mapped
  }

  // For MCQ, ensure exactly one option is marked correct
  const correctCount = mapped.filter(o => o.isCorrect).length
  if (correctCount === 0 && mapped.length > 0) {
    mapped[0].isCorrect = true
  } else if (correctCount > 1) {
    let foundFirst = false
    mapped.forEach(o => {
      if (o.isCorrect) {
        if (!foundFirst) {
          foundFirst = true
        } else {
          o.isCorrect = false
        }
      }
    })
  }

  return mapped
}

// MiniMax API call
async function generateWithMiniMax(prompt) {
  const response = await fetch('https://api.minimax.io/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.minimaxApiKey}`
    },
    body: JSON.stringify({
      model: 'MiniMax-M3',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`MiniMax API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// OpenAI API call
async function generateWithOpenAI(prompt, model = 'gpt-4o-mini') {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openaiApiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// Anthropic (Claude) API call
async function generateWithAnthropic(prompt, model = 'claude-3-5-sonnet-20241022') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

// Google Gemini API call
async function generateWithGoogle(prompt, model = 'gemini-2.0-flash') {
  const modelsToTry = [model, 'gemini-1.5-flash', 'gemini-1.5-pro']
  for (const m of modelsToTry) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${config.googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text
      }
    } catch {
      // try next model
    }
  }
  throw new Error('Google Gemini API calls failed')
}

// Smart NLP-based question extractor directly anchored to the transcript text
export function generateFallbackQuestions(transcript, questionTypes) {
  const cleanTranscript = cleanTranscriptText(transcript)
  const sentences = extractPropositions(cleanTranscript)

  return questionTypes.map((type, idx) => {
    const targetSentence = sentences[idx % sentences.length] || sentences[0] || 'Online classes facilitate interactive virtual learning.'
    const otherSentences = sentences.filter((_, i) => i !== (idx % sentences.length))
    
    // Check if sentence has a definition or action structure
    const isRelation = /( is | are | was | were | means | refers to | causes | leads to | consists of | creates | prevents | enables | allows | facilitates )/i.exec(targetSentence)
    
    let subject = ''
    let predicate = ''
    
    if (isRelation) {
      const splitIdx = isRelation.index
      subject = targetSentence.substring(0, splitIdx).trim()
      predicate = targetSentence.substring(splitIdx + isRelation[0].length).trim()
    } else {
      const words = targetSentence.split(/\s+/)
      subject = words.slice(0, Math.min(3, words.length)).join(' ')
      predicate = words.slice(3).join(' ') || targetSentence
    }

    // Capitalize and clean subject
    subject = (subject || 'The discussed concept')
      .replace(/^[^a-zA-Z0-9]+/, '')
      .replace(/^(and|or|but|also|so|then|with|using|which|that|they|this)\s+/i, '')
      .trim()
    if (subject) {
      subject = subject.charAt(0).toUpperCase() + subject.slice(1)
    }
    
    // Limit predicate to max 8-10 words
    const predWords = predicate.split(/\s+/).filter(w => w.length > 0)
    const shortPredicate = predWords.slice(0, 8).join(' ').replace(/[.,;:]+$/, '')

    if (type === 'TF') {
      const isTrue = idx % 2 === 0
      let statement = ''
      
      if (isTrue) {
        statement = isRelation 
          ? `${subject} ${isRelation[0].trim()} ${shortPredicate}.`
          : `${targetSentence.split(/\s+/).slice(0, 12).join(' ').replace(/[.,;:]+$/, '')}.`
      } else {
        // Create a crisp, clear false proposition
        if (/\b(increases|accelerates|promotes|allows|enables|facilitates)\b/i.test(targetSentence)) {
          statement = `${subject} restricts or prevents ${shortPredicate || 'system capabilities'}.`
        } else if (/\b(is|was|are)\b/i.test(targetSentence)) {
          statement = `${subject} does not provide ${shortPredicate || 'real-time functionality'}.`
        } else {
          statement = `${subject} operates without ${shortPredicate || 'interactive communication'}.`
        }
      }

      statement = statement.replace(/\s+/g, ' ').replace(/[.!?]*$/, '.')

      return {
        id: `q_${Date.now()}_${idx}`,
        type: 'TF',
        question: statement,
        options: [
          { text: 'True', isCorrect: isTrue },
          { text: 'False', isCorrect: !isTrue }
        ],
        explanation: `As taught in the session: "${targetSentence.slice(0, 90)}"`,
        segmentIndex: 0,
        createdAt: new Date().toISOString()
      }
    } else if (type === 'MSQ') {
      const secondIdea = otherSentences[0] 
        ? otherSentences[0].split(/\s+/).slice(0, 7).join(' ') 
        : `Supports flexible digital interaction`

      return {
        id: `q_${Date.now()}_${idx}`,
        type: 'MSQ',
        question: `Which of the following are true regarding ${subject}?`,
        options: [
          { text: `${subject} ${isRelation ? isRelation[0].trim() : 'provides'} ${shortPredicate}`, isCorrect: true },
          { text: secondIdea, isCorrect: true },
          { text: `Operates strictly without ${subject}`, isCorrect: false },
          { text: `Restricts all interactive features`, isCorrect: false }
        ],
        explanation: `Supported directly by the session: "${targetSentence.slice(0, 90)}"`,
        segmentIndex: 0,
        createdAt: new Date().toISOString()
      }
    } else {
      // Crisp MCQ
      const questionStem = isRelation 
        ? `What is the primary role of ${subject}?`
        : `Which feature is associated with ${subject}?`

      const correctOpt = isRelation 
        ? `${isRelation[0].trim().charAt(0).toUpperCase() + isRelation[0].trim().slice(1)} ${shortPredicate}`
        : `${shortPredicate}`

      const distractor1 = `Requires offline physical attendance only`
      const distractor2 = `Operates without interactive communication`
      const distractor3 = `Has no connection with ${subject}`

      return {
        id: `q_${Date.now()}_${idx}`,
        type: 'MCQ',
        question: questionStem,
        options: [
          { text: correctOpt, isCorrect: true },
          { text: distractor1, isCorrect: false },
          { text: distractor2, isCorrect: false },
          { text: distractor3, isCorrect: false }
        ],
        explanation: `Directly supported by the session: "${targetSentence.slice(0, 90)}"`,
        segmentIndex: 0,
        createdAt: new Date().toISOString()
      }
    }
  })
}

// Main question generation function
export async function generateQuestions(transcript, cfg) {
  const { numQuestions = 2, difficulty = 'medium', provider = 'google', questionTypeMix = null } = cfg || {}

  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is required')
  }

  // Use provided questionTypeMix or generate default based on numQuestions
  const questionTypes = questionTypeMix 
    ? generateFromMix(questionTypeMix, numQuestions)
    : getQuestionTypeMix(numQuestions)
  const prompt = buildQuestionPrompt(transcript, questionTypes, difficulty)

  console.log(`Generating ${numQuestions} questions with provider '${provider}'...`)

  let responseText = null
  const providersToTry = [provider, 'google', 'openai', 'anthropic', 'minimax'].filter((p, index, self) => self.indexOf(p) === index)

  for (const p of providersToTry) {
    try {
      if (p === 'google' && config.googleApiKey) {
        responseText = await generateWithGoogle(prompt)
      } else if (p === 'openai' && config.openaiApiKey) {
        responseText = await generateWithOpenAI(prompt)
      } else if (p === 'anthropic' && config.anthropicApiKey) {
        responseText = await generateWithAnthropic(prompt)
      } else if (p === 'minimax' && config.minimaxApiKey) {
        responseText = await generateWithMiniMax(prompt)
      }
      if (responseText) {
        console.log(`Successfully received AI response using provider '${p}'`)
        break
      }
    } catch (err) {
      console.warn(`Provider '${p}' failed during question generation:`, err.message)
    }
  }

  let questions = []
  if (responseText) {
    questions = parseQuestions(responseText, questionTypes)
  }

  if (!questions || questions.length === 0) {
    console.log('Falling back to structured local question generator...')
    questions = generateFallbackQuestions(transcript, questionTypes)
  }

  console.log(`Generated ${questions.length} questions successfully`)
  return questions
}