import crypto from 'crypto'
import nodemailer from 'nodemailer'

interface OTPRecord {
  codeHash: string
  expiresAt: number
  attempts: number
}

const otpStore = new Map<string, OTPRecord>()

export const emailService = {
  transporter: nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  }),

  generateSecureOTP(): string {
    // Cryptographically secure 6-digit number between 100000 and 999999
    return crypto.randomInt(100000, 1000000).toString()
  },

  async sendOTP(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim()
    const otp = this.generateSecureOTP()
    const codeHash = crypto.createHash('sha256').update(otp).digest('hex')
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes from now

    // Save hashed OTP in store with zero attempts
    otpStore.set(normalizedEmail, { codeHash, expiresAt, attempts: 0 })

    const mailOptions = {
      from: process.env.SMTP_FROM || `"AgriKart" <${process.env.SMTP_USER}>`,
      to: normalizedEmail,
      subject: 'AgriKart Password Reset Verification Code',
      text: `Your password reset verification code is: ${otp}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #16a34a; text-align: center;">AgriKart Password Reset</h2>
          <p style="color: #475569; font-size: 16px;">We received a request to reset your password. Use the following 6-digit verification code to proceed:</p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e293b;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 14px; text-align: center;">This code will expire in 5 minutes.</p>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    }

    try {
      if (process.env.NODE_ENV !== 'test') {
        await this.transporter.sendMail(mailOptions)
      }
    } catch (err) {
      console.error('Failed to send email:', err)
      throw new Error('Failed to send verification email')
    }
  },

  async verifyOTP(email: string, code: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim()
    const storedRecord = otpStore.get(normalizedEmail)

    if (!storedRecord) {
      return false
    }

    if (Date.now() > storedRecord.expiresAt) {
      otpStore.delete(normalizedEmail)
      return false
    }

    // Limit to 5 attempts to prevent brute force
    if (storedRecord.attempts >= 5) {
      otpStore.delete(normalizedEmail)
      return false
    }

    storedRecord.attempts += 1

    const incomingHash = crypto.createHash('sha256').update(code.trim()).digest('hex')
    const isValid = crypto.timingSafeEqual(
      Buffer.from(storedRecord.codeHash),
      Buffer.from(incomingHash)
    )

    if (isValid) {
      otpStore.delete(normalizedEmail)
      return true
    }

    return false
  },

  async clearOTP(email: string): Promise<void> {
    otpStore.delete(email.toLowerCase().trim())
  },
}
