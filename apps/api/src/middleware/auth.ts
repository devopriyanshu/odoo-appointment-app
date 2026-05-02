import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { redis } from '../config/redis'
import { ApiError } from '../utils/ApiError'

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string }
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '')

    if (!token) throw new ApiError(401, 'Authentication required')

    const blacklisted = await redis.get(`blacklist:${token}`)
    if (blacklisted) throw new ApiError(401, 'Token has been revoked')

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string
      email: string
      role: string
    }
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role }
    next()
  } catch (err) {
    if (err instanceof ApiError) return next(err)
    next(new ApiError(401, 'Invalid or expired token'))
  }
}

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '')

    if (!token) return next()

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string
      email: string
      role: string
    }
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role }
    next()
  } catch {
    next()
  }
}
