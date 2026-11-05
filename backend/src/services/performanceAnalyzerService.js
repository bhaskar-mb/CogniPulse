import mongoose from 'mongoose'
import '../models/index.js'
import StudentLearningProfile from '../models/StudentLearningProfile.js'
import Response from '../models/Response.js'
import Question from '../models/Question.js'
import Transcript from '../models/Transcript.js'
import { querySimilarChunks } from './vectorStoreService.js'

/**
 * Student Performance Analyzer, ALPS Engine & Weak Concept Detection
 */

/**
 * Calculate the Adaptive Learning Progress Score (ALPS) and update student profile
 * @param {string} studentId
 * @param {string} roomId
 * @returns {Promise<object>} Updated StudentLearningProfile
 */
export async function analyzeStudentPerformance(studentId, roomId) {
  const studentObjId = new mongoose.Types.ObjectId(studentId)
  const roomObjId = new mongoose.Types.ObjectId(roomId)

  // 1. Fetch all student responses in this room
  const responses = await Response.find({
    studentId: studentObjId,
    roomId: roomObjId
  }).lean()

  // 2. Fetch all questions answered by this student
  const questionIds = responses.map(r => r.questionId)
  const questions = await Question.find({ _id: { $in: questionIds } }).lean()
  const questionMap = new Map(questions.map(q => [q._id.toString(), q]))

  // 3. Calculate Accuracy
  const totalAnswered = responses.length
  let correctCount = 0
  let totalResponseTime = 0
  let weightedDifficultySum = 0
  let speedScoreSum = 0

  const conceptStats = {} // concept -> { correct: 0, total: 0, lastMissed: Date }

  responses.forEach(res => {
    const q = questionMap.get(res.questionId.toString())
    if (res.isCorrect) correctCount++
    totalResponseTime += (res.responseTime || 0)

    const allowedTime = (q && q.timeToAnswer) || 30
    const timeRatio = Math.min(1, Math.max(0, (res.responseTime || 0) / allowedTime))
    // Speed score: answering quickly and correctly gives higher bonus
    const speedScore = res.isCorrect ? (1 - (timeRatio * 0.5)) : 0.2
    speedScoreSum += speedScore

    // Difficulty multiplier: easy=0.8, medium=1.0, hard=1.3
    const diff = (q && q.difficulty) || 'medium'
    const diffMultiplier = diff === 'hard' ? 1.3 : (diff === 'easy' ? 0.8 : 1.0)
    weightedDifficultySum += (res.isCorrect ? diffMultiplier : 0.2)

    // Concept tracking
    // Clean concept extraction
    let concepts = (q && q.conceptTags && q.conceptTags.length > 0) ? q.conceptTags : []
    if (concepts.length === 0 && q && q.question) {
      // Extract subject from question
      const cleanQ = q.question
        .replace(/^(what is|what was|what are|which of the following|which statement|how does|why does|explain|describe|consider|based on the lecture|according to the lecture|in today's lecture|regarding)\s*:?\s*/i, '')
        .replace(/^[;:,.\s]+|[?.:!;\s]+$/g, '')
        .trim()
      const words = cleanQ.split(/\s+/)
      const extractedConcept = words.slice(0, 4).join(' ') || 'Lesson Topic'
      concepts = [extractedConcept.charAt(0).toUpperCase() + extractedConcept.slice(1)]
    } else if (concepts.length === 0) {
      concepts = ['Lesson Topic']
    }

    concepts.forEach(concept => {
      if (!conceptStats[concept]) {
        conceptStats[concept] = { correct: 0, total: 0, lastMissed: null }
      }
      conceptStats[concept].total++
      if (res.isCorrect) {
        conceptStats[concept].correct++
      } else {
        conceptStats[concept].lastMissed = res.createdAt || new Date()
      }
    })
  })

  const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered) : 0
  const avgResponseTime = totalAnswered > 0 ? Number((totalResponseTime / totalAnswered).toFixed(1)) : 0
  const avgSpeedScore = totalAnswered > 0 ? (speedScoreSum / totalAnswered) : 0
  const avgDifficultyScore = totalAnswered > 0 ? Math.min(1, weightedDifficultySum / (totalAnswered * 1.3)) : 0

  // 4. Calculate Attendance
  const totalSegments = await Transcript.distinct('segmentIndex', { roomId: roomObjId })
  let attendance = 0
  if (totalSegments.length > 0) {
    const attendedSegments = await Question.distinct('segmentIndex', { _id: { $in: questionIds } })
    attendance = Math.min(1, attendedSegments.length / totalSegments.length)
  } else {
    attendance = totalAnswered > 0 ? 1.0 : 0
  }

  // 5. Compute Adaptive Learning Progress Score (ALPS) (0-100)
  // Formula: Accuracy (40%) + Speed Agility (20%) + Difficulty Weight (20%) + Attendance/Participation (20%)
  const rawAlps = (
    (accuracy * 0.40) +
    (avgSpeedScore * 0.20) +
    (avgDifficultyScore * 0.20) +
    (attendance * 0.20)
  ) * 100

  const alps = Math.min(100, Math.max(0, Math.round(rawAlps)))

  // 6. Detect Weak & Focus Concepts (Ranked by lowest mastery / highest errors)
  const evaluatedConcepts = []
  for (const [concept, stats] of Object.entries(conceptStats)) {
    const conceptAccuracy = stats.total > 0 ? (stats.correct / stats.total) : 0
    const errorCount = stats.total - stats.correct
    evaluatedConcepts.push({
      concept,
      errorCount,
      totalAttempts: stats.total,
      accuracy: Number(conceptAccuracy.toFixed(2)),
      masteryLevel: conceptAccuracy < 0.35 ? 'needs_review' : (conceptAccuracy < 0.7 ? 'developing' : (conceptAccuracy < 0.9 ? 'proficient' : 'mastered')),
      lastMissedAt: stats.lastMissed || new Date()
    })
  }

  // Sort concepts by: errorCount desc, then accuracy asc (lowest mastery first)
  evaluatedConcepts.sort((a, b) => {
    if (b.errorCount !== a.errorCount) return b.errorCount - a.errorCount
    return a.accuracy - b.accuracy
  })

  // Pick topics that actually have errors or have not reached full mastery
  const strugglingConcepts = evaluatedConcepts.filter(c => c.errorCount > 0 || c.masteryLevel !== 'mastered')
  const weakConcepts = strugglingConcepts.slice(0, 5)

  // 7. Personalized Retrieval Recommendations via RAG for lowest mastery concepts
  const recommendations = await generatePersonalizedRecommendations(roomId, weakConcepts.slice(0, 3))

  // 8. Generate Student Lesson Feedback based on Teacher Lesson & Responses
  const lessonFeedback = await generateLessonFeedbackData({
    roomId,
    studentId,
    accuracy,
    alps,
    correctCount,
    totalAnswered,
    weakConcepts,
    recommendations,
    responses,
    questions
  })

  // 9. Update / Upsert StudentLearningProfile
  const profile = await StudentLearningProfile.findOneAndUpdate(
    { studentId: studentObjId, roomId: roomObjId },
    {
      $set: {
        alps,
        metrics: {
          accuracy: Number(accuracy.toFixed(2)),
          avgResponseTime,
          speedScore: Number(avgSpeedScore.toFixed(2)),
          difficultyScore: Number(avgDifficultyScore.toFixed(2)),
          attendance: Number(attendance.toFixed(2)),
          totalAnswered,
          correctCount
        },
        weakConcepts,
        recommendations,
        lessonFeedback,
        updatedAt: new Date()
      },
      $push: {
        history: {
          $each: [{ timestamp: new Date(), alps, accuracy: Number(accuracy.toFixed(2)) }],
          $slice: -20 // keep last 20 history entries
        }
      }
    },
    { upsert: true, new: true }
  )

  return profile
}

/**
 * Generate comprehensive lesson feedback for a student based on the teacher's lesson content
 */
async function generateLessonFeedbackData({
  roomId,
  accuracy,
  alps,
  correctCount,
  totalAnswered,
  weakConcepts = [],
  recommendations = [],
  responses = [],
  questions = []
}) {
  const roomObjId = new mongoose.Types.ObjectId(roomId)

  // Fetch recent transcripts to understand the lesson context
  const transcripts = await Transcript.find({ roomId: roomObjId }).sort({ segmentIndex: 1 }).lean()
  const fullTranscript = transcripts.map(t => t.text).join(' ')
  
  let lessonOverview = ''
  if (fullTranscript.length > 30) {
    const sentences = fullTranscript.split(/(?<=[.!?])\s+/).filter(s => s.length > 20)
    lessonOverview = sentences.slice(0, 2).join(' ')
  } else {
    lessonOverview = 'Today\'s session focused on core lecture concepts, practical examples, and interactive knowledge checks.'
  }

  // 1. Identify Strengths (Concepts student answered correctly)
  const questionMap = new Map(questions.map(q => [q._id.toString(), q]))
  const strengths = []
  const correctResponses = responses.filter(r => r.isCorrect)

  correctResponses.forEach(r => {
    const q = questionMap.get(r.questionId.toString())
    if (q) {
      const tag = q.conceptTags?.[0] || (q.question ? q.question.slice(0, 45) + '...' : 'Key Topic')
      if (!strengths.includes(tag) && strengths.length < 4) {
        strengths.push(tag)
      }
    }
  })

  if (strengths.length === 0 && correctCount > 0) {
    strengths.push('Demonstrated solid understanding of fundamental session principles')
  }

  // 2. Identify Weak Areas with exact teacher lesson pointers
  const weakAreas = weakConcepts.map(wc => {
    const matchingRec = recommendations.find(r => r.concept === wc.concept)
    if (matchingRec && matchingRec.excerpt) {
      return `"${wc.concept}": ${matchingRec.actionableAdvice || 'Review teacher lecture notes and definitions.'}`
    }
    return `"${wc.concept}": Missed in interactive checks. Review related lecture section.`
  })

  // 3. Synthesize AI Teacher Note
  let teacherNote = ''
  if (accuracy >= 0.85) {
    teacherNote = `Outstanding mastery of today's lesson! You scored ${Math.round(accuracy * 100)}% accuracy with an ALPS score of ${alps}/100. You grasped the primary mechanisms and core terminology thoroughly.`
  } else if (accuracy >= 0.60) {
    teacherNote = `Good progress in today's lesson with ${Math.round(accuracy * 100)}% accuracy (${correctCount}/${totalAnswered} questions). To reach full mastery, focus on revising the specific concepts highlighted in your action plan.`
  } else if (totalAnswered > 0) {
    teacherNote = `You actively participated in today's session (${totalAnswered} questions attempted). Dedicating 10-15 minutes to review the lesson excerpts below will help solidify the key concepts covered by your teacher.`
  } else {
    teacherNote = `No responses recorded yet for this lesson. Make sure to participate in live interactive questions during the lecture!`
  }

  // 4. Action Items
  const actionItems = []
  if (weakConcepts.length > 0) {
    actionItems.push(`Review the lesson excerpts for: ${weakConcepts.slice(0, 3).map(w => w.concept).join(', ')}`)
    actionItems.push('Re-check the explanation notes provided in the Question-wise Analysis')
  }
  if (recommendations.length > 0) {
    actionItems.push(`Read the targeted course study section from: ${recommendations[0].sourceTitle || 'Classroom Materials'}`)
  }
  if (actionItems.length === 0) {
    actionItems.push('Continue maintaining your high consistency across upcoming lecture sessions!')
    actionItems.push('Try challenging higher-difficulty practice questions to test deeper edge cases.')
  }

  return {
    lessonOverview,
    strengths,
    weakAreas: weakAreas.slice(0, 4),
    teacherNote,
    actionItems,
    generatedAt: new Date()
  }
}

/**
 * Retrieve targeted learning snippets from Course Materials & Transcripts for weak concepts
 */
async function generatePersonalizedRecommendations(roomId, weakConcepts = []) {
  if (!weakConcepts || weakConcepts.length === 0) return []

  const recommendations = []

  for (const wc of weakConcepts) {
    try {
      const topChunks = await querySimilarChunks(wc.concept, roomId, {
        topK: 2,
        docTypes: ['course_material', 'previous_lecture', 'current_lecture'],
        minScore: 0.05
      })

      if (topChunks && topChunks.length > 0) {
        const bestChunk = topChunks[0].chunk
        const snippet = bestChunk.text.slice(0, 300) + (bestChunk.text.length > 300 ? '...' : '')

        recommendations.push({
          concept: wc.concept,
          sourceTitle: bestChunk.sourceTitle || (bestChunk.docType === 'course_material' ? 'Course Materials' : 'Lecture Transcript'),
          docType: bestChunk.docType,
          excerpt: snippet,
          actionableAdvice: `Review the section on "${wc.concept}". Pay special attention to: ${bestChunk.concepts?.slice(0, 3).join(', ') || 'key principles'}.`,
          relevanceScore: topChunks[0].score,
          generatedAt: new Date()
        })
      } else {
        recommendations.push({
          concept: wc.concept,
          sourceTitle: 'Classroom Lecture Notes',
          docType: 'course_material',
          excerpt: `Key concepts regarding ${wc.concept} were discussed during class. Review core definitions and formulas.`,
          actionableAdvice: `Practice questions related to ${wc.concept} to strengthen your understanding.`,
          relevanceScore: 0.5,
          generatedAt: new Date()
        })
      }
    } catch (err) {
      console.warn(`[PerformanceAnalyzer] Recommendation retrieval error for ${wc.concept}:`, err.message)
    }
  }

  return recommendations
}

/**
 * Public export to fetch or generate student lesson feedback
 */
export async function getStudentLessonFeedback(studentId, roomId) {
  const profile = await analyzeStudentPerformance(studentId, roomId)
  return {
    studentId,
    roomId,
    alps: profile.alps,
    metrics: profile.metrics,
    weakConcepts: profile.weakConcepts || [],
    recommendations: profile.recommendations || [],
    feedback: profile.lessonFeedback || {
      lessonOverview: 'Lesson overview unavailable',
      strengths: [],
      weakAreas: [],
      teacherNote: 'Great effort participating in the lecture session.',
      actionItems: []
    }
  }
}

/**
 * Get class-wide ALPS analytics and weak concepts distribution
 */
export async function getClassRagAnalytics(roomId) {
  const roomObjId = new mongoose.Types.ObjectId(roomId)

  const profiles = await StudentLearningProfile.find({ roomId: roomObjId })
    .populate('studentId', 'name email profileImage')
    .lean()

  if (!profiles || profiles.length === 0) {
    return {
      totalProfiles: 0,
      averageAlps: 0,
      minAlps: 0,
      maxAlps: 0,
      distribution: {},
      topWeakConcepts: [],
      studentProfiles: []
    }
  }

  const alpsValues = profiles.map(p => p.alps || 0)
  const averageAlps = Math.round(alpsValues.reduce((a, b) => a + b, 0) / alpsValues.length)
  const minAlps = Math.min(...alpsValues)
  const maxAlps = Math.max(...alpsValues)

  // Distribution buckets (0-9, 10-19, ..., 90-100)
  const distribution = {}
  for (let i = 0; i <= 90; i += 10) distribution[i] = 0
  alpsValues.forEach(v => {
    const bucket = Math.min(90, Math.floor(v / 10) * 10)
    distribution[bucket] = (distribution[bucket] || 0) + 1
  })

  // Aggregate weak concepts across all students
  const conceptCounts = {}
  profiles.forEach(p => {
    (p.weakConcepts || []).forEach(w => {
      if (w.errorCount === 0 && w.masteryLevel === 'mastered') return
      if (!conceptCounts[w.concept]) {
        conceptCounts[w.concept] = { count: 0, totalErrors: 0, studentsAffected: 0 }
      }
      conceptCounts[w.concept].count++
      conceptCounts[w.concept].totalErrors += (typeof w.errorCount === 'number' ? w.errorCount : 1)
      conceptCounts[w.concept].studentsAffected++
    })
  })

  const topWeakConcepts = Object.entries(conceptCounts)
    .map(([concept, data]) => ({
      concept,
      ...data,
      impactPercentage: Math.round((data.studentsAffected / profiles.length) * 100)
    }))
    .sort((a, b) => b.totalErrors - a.totalErrors)
    .slice(0, 8)

  return {
    totalProfiles: profiles.length,
    averageAlps,
    minAlps,
    maxAlps,
    distribution,
    topWeakConcepts,
    studentProfiles: profiles.map(p => ({
      studentId: p.studentId?._id || p.studentId,
      name: p.studentId?.name || 'Student',
      email: p.studentId?.email,
      alps: p.alps,
      metrics: p.metrics,
      weakConceptsCount: (p.weakConcepts || []).length,
      weakConcepts: p.weakConcepts || [],
      recommendations: p.recommendations || [],
      lessonFeedback: p.lessonFeedback || null
    })).sort((a, b) => b.alps - a.alps)
  }
}
