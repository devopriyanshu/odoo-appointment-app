import nodemailer, { Transporter } from 'nodemailer'
import { env } from '../config/env'
import { logger } from '../utils/logger'

let transporter: Transporter | null = null
let initialized = false

function init(): Transporter | null {
  if (initialized) return transporter
  initialized = true

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn('Email disabled: SMTP_HOST/USER/PASS not all set. Emails will be logged only.')
    return null
  }

  const port = parseInt(env.SMTP_PORT, 10)
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })

  // Verify async (do not block startup); log result
  transporter.verify((err) => {
    if (err) {
      logger.error('SMTP verify failed', { host: env.SMTP_HOST, port, message: err.message })
    } else {
      logger.info(`SMTP ready (${env.SMTP_HOST}:${port} as ${env.SMTP_USER})`)
    }
  })

  return transporter
}

export async function sendMail(opts: { to: string; subject: string; text: string; html: string }) {
  const t = init()
  if (!t) {
    logger.info(`[email-stub] To: ${opts.to} | Subject: ${opts.subject}\n${opts.text}`)
    return { stubbed: true }
  }
  try {
    const info = await t.sendMail({
      from: env.FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    })
    logger.info(`Email sent to ${opts.to} (id ${info.messageId})`)
    return { messageId: info.messageId }
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string }
    logger.error('SMTP send failed', { to: opts.to, code: e.code, message: e.message })
    // Don't throw — allow auth flow to continue. Caller decides whether to surface to user.
    return { error: e.message ?? 'send failed' }
  }
}

// ─── Templates ────────────────────────────────────────────────────────

const SHELL = (innerHtml: string, preview: string) => `<!doctype html>
<html><head><meta charset="utf-8"/><title>AppointEase</title></head>
<body style="margin:0;padding:0;background:#f7faf9;font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#0f1f1d;">
<span style="display:none;font-size:1px;color:#f7faf9;">${preview}</span>
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:white;border-radius:16px;border:1px solid #e2e8e6;overflow:hidden;box-shadow:0 4px 24px rgba(15,31,29,0.05);">
    <div style="background:linear-gradient(135deg,#0f766e 0%,#134e4a 100%);padding:20px 28px;color:white;">
      <p style="margin:0;font-size:14px;opacity:0.9;">AppointEase</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:700;">Smart booking, simplified</p>
    </div>
    <div style="padding:28px;">${innerHtml}</div>
    <div style="padding:16px 28px;background:#f1f5f4;border-top:1px solid #e2e8e6;">
      <p style="margin:0;font-size:12px;color:#8a9794;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
  <p style="text-align:center;margin:16px 0 0;font-size:11px;color:#8a9794;">© ${new Date().getFullYear()} AppointEase</p>
</div>
</body></html>`

export async function sendOtpEmail(to: string, name: string, otp: string) {
  const html = SHELL(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f1f1d;">Hi ${escapeHtml(name)},</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5b58;">
      Use the code below to verify your email and finish setting up your account.
      The code expires in <strong>5 minutes</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;padding:16px 28px;background:#ccfbf1;border:1px solid #0f766e;border-radius:12px;font-family:'JetBrains Mono',monospace;font-size:32px;letter-spacing:8px;font-weight:700;color:#0f766e;">
        ${otp}
      </div>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#8a9794;">Don't share this code with anyone — our team will never ask for it.</p>
  `, `Your AppointEase verification code: ${otp}`)
  return sendMail({
    to,
    subject: `${otp} is your AppointEase verification code`,
    text: `Hi ${name},\n\nYour AppointEase verification code is: ${otp}\nIt expires in 5 minutes.\n\nIf you didn't request this, ignore this email.`,
    html,
  })
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const html = SHELL(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f1f1d;">Reset your password</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5b58;">
      Hi ${escapeHtml(name)}, we got a request to reset the password for your AppointEase account.
      The link below expires in <strong>10 minutes</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:#0f766e;color:white;text-decoration:none;font-weight:600;border-radius:12px;font-size:14px;">
        Reset password
      </a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#8a9794;word-break:break-all;">
      Or paste this link in your browser:<br/>
      <a href="${resetUrl}" style="color:#0f766e;">${resetUrl}</a>
    </p>
  `, 'Reset your AppointEase password')
  return sendMail({
    to,
    subject: 'Reset your AppointEase password',
    text: `Hi ${name},\n\nReset your password using this link (valid for 10 minutes):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html,
  })
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string))
}
