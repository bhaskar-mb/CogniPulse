import { sendRegistrationOtp } from '../src/services/emailService.js'

const testEmail = process.argv[2] || process.env.SMTP_EMAIL

if (!testEmail) {
  console.error('❌ Please specify an email address to test. Example:\n   node scripts/testEmail.js your_email@gmail.com')
  process.exit(1)
}

console.log(`📡 Attempting to send a test verification email to: ${testEmail}...`)

const testOtp = Math.floor(100000 + Math.random() * 900000).toString()

try {
  const result = await sendRegistrationOtp(testEmail, 'Test User', testOtp)
  console.log(`✅ Verification email sent successfully to ${testEmail}! (Code was: ${testOtp})`)
} catch (error) {
  console.error(`❌ Failed to send email:`, error.message)
}
