import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import * as bi from '../services/intelligence.service'
import * as parser from '../services/intelligence.parser'

export const query = asyncHandler(async (req: Request, res: Response) => {
  const user = { id: req.user!.id, role: req.user!.role }
  const { prompt, spec } = req.body as { prompt?: string; spec?: unknown }

  let resolved: bi.QuerySpec | null = null
  let parsedFrom: 'spec' | 'regex' | 'llm' | undefined

  if (spec && typeof spec === 'object') {
    resolved = parser.validateSpec(spec)
    parsedFrom = 'spec'
  } else if (typeof prompt === 'string' && prompt.trim()) {
    resolved = await parser.parsePromptToSpec(prompt, user)
    parsedFrom = resolved ? 'regex' : undefined
    if (!resolved) {
      resolved = await parser.llmParse(prompt)
      if (resolved) parsedFrom = 'llm'
    }
    if (!resolved) {
      throw new ApiError(
        422,
        "I couldn't translate that into a report. Try: \"revenue last 30 days\" or \"bookings by service\".",
      )
    }
  } else {
    throw new ApiError(400, 'Provide either a prompt or a spec')
  }

  const report = await bi.runReport(resolved, user)
  res.json({ success: true, ...report, parsedFrom })
})

export const headlines = asyncHandler(async (req: Request, res: Response) => {
  const user = { id: req.user!.id, role: req.user!.role }
  const kpis = await bi.getHeadlineKPIs(user)
  res.json({ success: true, kpis })
})
