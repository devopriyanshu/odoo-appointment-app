import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { ZodError } from 'zod'

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    })
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    })
  }

  if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Resource already exists' })
  }

  logger.error('Unhandled error', { error: err })
  res.status(500).json({ success: false, message: 'Internal server error' })
}
