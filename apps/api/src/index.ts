import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { logger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { generalLimiter } from './middleware/rateLimiter'

import authRoutes from './routes/auth.routes'
import userRoutes from './routes/users.routes'
import serviceRoutes from './routes/services.routes'
import slotRoutes from './routes/slots.routes'
import bookingRoutes from './routes/bookings.routes'
import analyticsRoutes from './routes/analytics.routes'
import aiRoutes from './routes/ai.routes'

const app = express()

app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(generalLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/slots', slotRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/ai', aiRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }))

app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info(`🚀 API server running on port ${env.PORT}`)
})

export default app
