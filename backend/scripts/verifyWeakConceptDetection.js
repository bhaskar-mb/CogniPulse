import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import StudentLearningProfile from '../src/models/StudentLearningProfile.js'
import Response from '../src/models/Response.js'
import Question from '../src/models/Question.js'
import Room from '../src/models/Room.js'
import '../src/models/index.js'
import { analyzeStudentPerformance, getClassRagAnalytics } from '../src/services/performanceAnalyzerService.js'

async function checkWeakConceptDetection() {
  console.log('====================================================')
  console.log('🔍 VERIFYING WEAK CONCEPT DETECTION FOR EVERY STUDENT')
  console.log('====================================================\n')

  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('No MONGODB_URI found')
    process.exit(1)
  }

  await mongoose.connect(mongoUri)
  console.log('✓ Connected to MongoDB')

  // 1. Check existing rooms and responses
  const rooms = await Room.find({}).limit(10).lean()
  console.log(`✓ Total rooms found: ${rooms.length}`)

  let roomWithResponses = null
  for (const r of rooms) {
    const resCount = await Response.countDocuments({ roomId: r._id })
    if (resCount > 0) {
      console.log(`  - Room: "${r.name}" (${r.code || r._id}) has ${resCount} student responses`)
      if (!roomWithResponses) {
        roomWithResponses = r
      }
    }
  }

  // 2. Run analysis on all rooms with responses
  for (const r of rooms) {
    const resCount = await Response.countDocuments({ roomId: r._id })
    if (resCount === 0) continue

    console.log(`\n----------------------------------------------------`)
    console.log(`Room: "${r.name}" (${r.code}) | Total Responses: ${resCount}`)
    const distinctStudents = await Response.distinct('studentId', { roomId: r._id })
    console.log(`Students with answers: ${distinctStudents.length}`)

    for (const sId of distinctStudents) {
      const user = await mongoose.model('User').findById(sId).select('name email role').lean()
      const profile = await analyzeStudentPerformance(sId.toString(), r._id.toString())
      console.log(`\n  👤 Student: ${user?.name || sId} (${user?.email || 'N/A'})`)
      console.log(`     ALPS Score: ${profile.alps}/100`)
      console.log(`     Accuracy: ${(profile.metrics?.accuracy * 100).toFixed(0)}% (${profile.metrics?.correctCount}/${profile.metrics?.totalAnswered})`)
      console.log(`     Weak Concepts:`, profile.weakConcepts?.map(w => `${w.concept} (${w.errorCount} errors, ${w.accuracy * 100}% acc, mastery: ${w.masteryLevel})`))
      console.log(`     Recommendations Count: ${profile.recommendations?.length || 0}`)
      console.log(`     Action Items:`, profile.lessonFeedback?.actionItems)
    }

    const classAnalytics = await getClassRagAnalytics(r._id.toString())
    console.log(`\n📊 Room "${r.name}" Class Summary:`)
    console.log(`   Total Profiles: ${classAnalytics.totalProfiles}`)
    console.log(`   Average Class ALPS: ${classAnalytics.averageAlps}/100`)
    console.log(`   Top Weak Concepts Heatmap:`, classAnalytics.topWeakConcepts.map(w => `${w.concept}: ${w.studentsAffected} students affected (${w.impactPercentage}%)`))
  }

  // 3. Test multi-student error detection scenario (isolated temporary validation)
  console.log('\n----------------------------------------------------')
  console.log('🧪 RUNNING ISOLATED TEST: Students with struggling concepts...')
  const testRoomId = new mongoose.Types.ObjectId()
  const studentStruggling = new mongoose.Types.ObjectId()

  const qA = await Question.create({
    roomId: testRoomId,
    type: 'MCQ',
    question: 'How does binary search achieve O(log n)?',
    conceptTags: ['Binary Search', 'Algorithm Efficiency'],
    difficulty: 'medium',
    timeToAnswer: 30
  })
  const qB = await Question.create({
    roomId: testRoomId,
    type: 'MCQ',
    question: 'What is a closure in JavaScript?',
    conceptTags: ['Closures', 'Scope'],
    difficulty: 'hard',
    timeToAnswer: 30
  })

  // Student gets Binary Search wrong, Closures right
  await Response.create([
    { roomId: testRoomId, questionId: qA._id, studentId: studentStruggling, selectedOption: 0, isCorrect: false, responseTime: 20 },
    { roomId: testRoomId, questionId: qB._id, studentId: studentStruggling, selectedOption: 1, isCorrect: true, responseTime: 12 }
  ])

  const profileStruggling = await analyzeStudentPerformance(studentStruggling.toString(), testRoomId.toString())
  console.log(`  👤 Struggling Student ALPS: ${profileStruggling.alps}/100`)
  console.log(`     Accuracy: ${(profileStruggling.metrics?.accuracy * 100).toFixed(0)}%`)
  console.log(`     Weak Concepts Detected:`, profileStruggling.weakConcepts.map(w => `${w.concept} (errors: ${w.errorCount}, mastery: ${w.masteryLevel})`))
  console.log(`     Recommendations:`, profileStruggling.recommendations.map(r => `[${r.concept}] ${r.actionableAdvice}`))
  console.log(`     Action Items:`, profileStruggling.lessonFeedback?.actionItems)

  // Clean up isolated test records
  await Question.deleteMany({ roomId: testRoomId })
  await Response.deleteMany({ roomId: testRoomId })
  await StudentLearningProfile.deleteMany({ roomId: testRoomId })
  console.log('✓ Isolated test complete and cleaned up safely!')

  await mongoose.disconnect()
  console.log('\n====================================================')
  console.log('✅ WEAK CONCEPT DETECTION VERIFICATION COMPLETE')
  console.log('====================================================')
}

checkWeakConceptDetection().catch(err => {
  console.error('Error during check:', err)
  process.exit(1)
})
