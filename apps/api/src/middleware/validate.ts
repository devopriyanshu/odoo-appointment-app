import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { ApiError } from '../utils/ApiError'

export const validate =
  (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors as Record<string, string[]>
      return next(new ApiError(422, 'Validation failed', errors))
    }
    req[source] = result.data
    next()
  }
