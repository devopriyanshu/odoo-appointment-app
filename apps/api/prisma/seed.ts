import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { addDays, addMinutes, startOfDay, subDays } from 'date-fns'

const prisma = new PrismaClient()

// ─── Deterministic PRNG (mulberry32) ───────────────────────────────────
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const r = rng(20260503) // fixed seed for reproducibility

const pick = <T>(arr: T[]) => arr[Math.floor(r() * arr.length)]
const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const chance = (p: number) => r() < p

async function hash(password: string) {
  return bcrypt.hash(password, 12)
}

// Round to nearest slot grid (minutes)
function snapToSlot(date: Date, durationMinutes: number): Date {
  const d = new Date(date)
  const m = d.getMinutes()
  d.setMinutes(Math.floor(m / durationMinutes) * durationMinutes, 0, 0)
  return d
}

// ─── Customer & organiser names ────────────────────────────────────────
const ORGANISERS = [
  { email: 'dr.sharma@demo.com', name: 'Dr. Priya Sharma',  category: 'health',    phone: '+919876543210' },
  { email: 'glow@demo.com',      name: 'Aanya Kapoor',      category: 'beauty',    phone: '+919876543220' },
  { email: 'peakfit@demo.com',   name: 'Vikram Singh',      category: 'fitness',   phone: '+919876543230' },
  { email: 'consult@demo.com',   name: 'Rohan Iyer',        category: 'business',  phone: '+919876543240' },
  { email: 'tutoring@demo.com',  name: 'Meera Joshi',       category: 'education', phone: '+919876543250' },
  { email: 'venue@demo.com',     name: 'Karan Patel',       category: 'events',    phone: '+919876543260' },
]

const CUSTOMER_NAMES = [
  'Rahul Mehta', 'Anjali Desai', 'Arjun Nair', 'Sneha Reddy', 'Vikas Gupta',
  'Pooja Bansal', 'Aditya Rao', 'Divya Pillai', 'Manish Khanna', 'Shweta Saxena',
  'Karthik Menon', 'Nisha Verma', 'Sahil Choudhary', 'Riya Malhotra', 'Aman Bose',
  'Tanvi Bhatt', 'Yash Trivedi', 'Kavya Krishnan', 'Harsh Wadia', 'Ishita Roy',
]

// ─── Service catalog ───────────────────────────────────────────────────
interface ServiceSpec {
  name: string
  description: string
  durationMinutes: number
  price?: number
  capacity?: number
  resources: string[] // provider names; empty -> use organiser
  manualConfirm?: boolean
  location?: string
}

const SERVICE_CATALOG: Record<string, ServiceSpec[]> = {
  health: [
    {
      name: 'Dental Checkup',
      description: 'Comprehensive dental examination, cleaning, and X-ray with personalised treatment plan.',
      durationMinutes: 30, price: 500,
      resources: ['Dr. Priya Sharma', 'Dr. Aman Verma'],
      location: 'Sharma Dental Clinic, FC Road, Pune 411005',
    },
    {
      name: 'General Consultation',
      description: '30-minute video or in-person consultation with a primary-care physician.',
      durationMinutes: 30, price: 800,
      resources: ['Dr. Priya Sharma'],
      location: 'Online or FC Road, Pune',
    },
  ],
  beauty: [
    {
      name: 'Hair Styling',
      description: 'Cut, blow-dry, and styling by senior stylists. Includes shampoo and conditioning.',
      durationMinutes: 45, price: 600,
      resources: ['Aanya Kapoor', 'Riya Suri'],
      location: 'GlowUp Studio, Koregaon Park, Pune',
    },
    {
      name: 'Spa Massage (60 min)',
      description: 'Relaxing aromatherapy full-body massage with essential oils.',
      durationMinutes: 60, price: 1500,
      resources: ['Therapist 1', 'Therapist 2'],
      location: 'GlowUp Studio, Koregaon Park, Pune',
    },
    {
      name: 'Manicure & Pedicure',
      description: 'Premium nail care with gel polish and hand/foot massage.',
      durationMinutes: 30, price: 400,
      resources: ['Aanya Kapoor'],
      location: 'GlowUp Studio, Koregaon Park, Pune',
    },
  ],
  fitness: [
    {
      name: 'Personal Training',
      description: '1-on-1 strength and conditioning session with custom programming.',
      durationMinutes: 60, price: 800,
      resources: ['Vikram Singh', 'Coach Aakash'],
      location: 'PeakFit Studio, Aundh, Pune',
    },
    {
      name: 'Yoga Class',
      description: 'Hatha yoga group class for all levels. Mats and props provided.',
      durationMinutes: 60, price: 300, capacity: 15,
      resources: ['Vikram Singh'],
      location: 'PeakFit Studio, Aundh, Pune',
    },
    {
      name: 'HIIT Group Class',
      description: 'High-intensity interval training in groups of up to 12.',
      durationMinutes: 45, price: 500, capacity: 12,
      resources: ['Coach Aakash'],
      location: 'PeakFit Studio, Aundh, Pune',
    },
  ],
  business: [
    {
      name: 'Strategy Consultation',
      description: 'In-depth business strategy session covering go-to-market, pricing, growth.',
      durationMinutes: 60, price: 2000,
      resources: ['Rohan Iyer'],
      location: 'Online (Google Meet)',
      manualConfirm: true,
    },
    {
      name: 'Tax Advisory',
      description: 'Personal and SME tax planning, returns, and compliance review.',
      durationMinutes: 45, price: 1500,
      resources: ['Rohan Iyer', 'CA Sneha Joshi'],
      location: 'Online or Baner Office, Pune',
    },
  ],
  education: [
    {
      name: 'Math Tutoring (Class 9–12)',
      description: '1-on-1 math tutoring covering CBSE, ICSE, and state board syllabi.',
      durationMinutes: 60, price: 500,
      resources: ['Meera Joshi'],
      location: 'Online (Zoom)',
    },
    {
      name: 'IELTS Preparation',
      description: 'Group prep class covering reading, writing, listening, speaking. Limit 6.',
      durationMinutes: 90, price: 800, capacity: 6,
      resources: ['Meera Joshi'],
      location: 'Kothrud, Pune (Online available)',
    },
  ],
  events: [
    {
      name: 'Conference Room A',
      description: 'Premium boardroom with AV, whiteboards, and high-speed internet. Capacity 10.',
      durationMinutes: 60, capacity: 10,
      resources: ['Conference Room A'],
      location: 'Floor 3, Innovation Hub, Baner, Pune',
    },
    {
      name: 'Banquet Hall',
      description: 'Spacious banquet hall for events, capacity 80. Includes catering coordination.',
      durationMinutes: 240, capacity: 80,
      resources: ['Banquet Hall'],
      location: 'Innovation Hub Banquet, Baner, Pune',
      manualConfirm: true,
    },
    {
      name: 'Photography Studio',
      description: 'Professional photo studio with backdrops, lighting, and wardrobe storage.',
      durationMinutes: 60, price: 1200, capacity: 4,
      resources: ['Studio 1'],
      location: 'Innovation Hub Studio, Baner, Pune',
    },
  ],
}

// ─── Realistic booking distribution ────────────────────────────────────
// Hours of the day with weights (peak 10-12 and 16-18)
const HOUR_WEIGHTS: Array<[number, number]> = [
  [9, 1.0], [10, 2.0], [11, 2.2], [12, 1.4],
  [13, 0.8], [14, 1.3], [15, 1.6], [16, 2.1], [17, 2.0],
  [18, 1.4], [19, 0.6],
]
const HOUR_TOTAL = HOUR_WEIGHTS.reduce((s, [, w]) => s + w, 0)

function pickHour(): number {
  let x = r() * HOUR_TOTAL
  for (const [h, w] of HOUR_WEIGHTS) {
    x -= w
    if (x <= 0) return h
  }
  return 10
}

// Day-of-week weight (Mon=1..Fri=5 busier)
const DOW_WEIGHTS = [0.5, 1.4, 1.5, 1.5, 1.5, 1.4, 0.7] // Sun..Sat
const DOW_TOTAL = DOW_WEIGHTS.reduce((a, b) => a + b, 0)

function pickDayOffset(maxDaysBack: number): number {
  // Sample backwards with a slight bias toward recent (growth trend)
  // Probability of picking k days back ∝ 1 - (k / maxDaysBack)*0.6
  for (let attempt = 0; attempt < 10; attempt++) {
    const k = Math.floor(r() * maxDaysBack)
    const accept = 1 - (k / maxDaysBack) * 0.6
    if (r() < accept) {
      const candidate = subDays(startOfDay(new Date()), k)
      const dow = candidate.getDay()
      const dowAccept = DOW_WEIGHTS[dow] / Math.max(...DOW_WEIGHTS)
      if (r() < dowAccept) return k
    }
  }
  return Math.floor(r() * maxDaysBack)
}

// ─── Status mix ────────────────────────────────────────────────────────
type Status = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'PENDING'

function pickStatusForPast(): Status {
  const x = r()
  if (x < 0.70) return 'COMPLETED'
  if (x < 0.83) return 'CONFIRMED'  // mid-flight that wasn't marked
  if (x < 0.93) return 'CANCELLED'
  return 'NO_SHOW'
}

function pickStatusForFuture(manualConfirm: boolean): Status {
  if (manualConfirm) {
    return chance(0.4) ? 'PENDING' : 'CONFIRMED'
  }
  return chance(0.95) ? 'CONFIRMED' : 'PENDING'
}

// ─── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding database with rich demo data...')

  // 1. Clear tables in dependency order
  await prisma.bookingAuditLog.deleteMany()
  await prisma.bookingAnswer.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.aIChatSession.deleteMany()
  await prisma.bookingQuestion.deleteMany()
  await prisma.workingHours.deleteMany()
  await prisma.flexibleSlot.deleteMany()
  await prisma.resource.deleteMany()
  await prisma.appointmentType.deleteMany()
  await prisma.serviceCategory.deleteMany()
  await prisma.user.deleteMany()

  // 2. Categories
  const cats = await Promise.all([
    prisma.serviceCategory.create({ data: { slug: 'health',    name: 'Health & Wellness',     description: 'Doctors, dentists, therapists',     icon: 'Stethoscope',    color: '#10b981', sortOrder: 1 } }),
    prisma.serviceCategory.create({ data: { slug: 'beauty',    name: 'Beauty & Spa',          description: 'Salon, spa, grooming services',     icon: 'Sparkles',       color: '#ec4899', sortOrder: 2 } }),
    prisma.serviceCategory.create({ data: { slug: 'fitness',   name: 'Fitness & Sports',      description: 'Trainers, yoga, sports coaching',   icon: 'Dumbbell',       color: '#f59e0b', sortOrder: 3 } }),
    prisma.serviceCategory.create({ data: { slug: 'business',  name: 'Business & Consulting', description: 'Meetings, consultations, advisory', icon: 'Briefcase',      color: '#6366f1', sortOrder: 4 } }),
    prisma.serviceCategory.create({ data: { slug: 'education', name: 'Education & Tutoring',  description: 'Classes, lessons, mentorship',      icon: 'GraduationCap',  color: '#0ea5e9', sortOrder: 5 } }),
    prisma.serviceCategory.create({ data: { slug: 'events',    name: 'Events & Venues',       description: 'Conference rooms, event spaces',    icon: 'Calendar',       color: '#8b5cf6', sortOrder: 6 } }),
  ])
  const catBySlug = new Map(cats.map((c) => [c.slug, c]))

  // 3. Admin user
  const admin = await prisma.user.create({
    data: { email: 'admin@demo.com', password: await hash('Admin@1234'), name: 'Admin User', role: 'ADMIN', isActive: true },
  })

  // 4. Organisers
  const organisers = await Promise.all(
    ORGANISERS.map((o) =>
      prisma.user.create({
        data: {
          email: o.email, password: bcrypt.hashSync('Organiser@1234', 12),
          name: o.name, role: 'ORGANISER', isActive: true, phone: o.phone,
        },
      })
    )
  )
  const organiserByCategory = new Map(ORGANISERS.map((o, i) => [o.category, organisers[i]]))

  // 5. Customers
  const customerHashes = await Promise.all(
    CUSTOMER_NAMES.map(() => hash('Customer@1234'))
  )
  const customers = await Promise.all(
    CUSTOMER_NAMES.map((name, i) => {
      const slug = name.toLowerCase().split(' ')[0]
      return prisma.user.create({
        data: {
          email: i === 0 ? 'customer@demo.com'
               : i === 1 ? 'customer2@demo.com'
               : `${slug}${i}@demo.com`,
          password: customerHashes[i],
          name, role: 'CUSTOMER', isActive: true,
          phone: `+9198765${String(50000 + i).padStart(5, '0')}`,
        },
      })
    })
  )

  // 6. Services + resources + working hours + questions
  interface SeededService {
    id: string
    spec: ServiceSpec
    organiserId: string
    categoryId: string
    resources: { id: string; name: string }[]
    questionIds: string[]
  }
  const services: SeededService[] = []

  for (const [slug, list] of Object.entries(SERVICE_CATALOG)) {
    const cat = catBySlug.get(slug)!
    const org = organiserByCategory.get(slug)!

    for (const spec of list) {
      const svc = await prisma.appointmentType.create({
        data: {
          organiserId: org.id,
          categoryId: cat.id,
          name: spec.name,
          description: spec.description,
          durationMinutes: spec.durationMinutes,
          resourceType: ['health', 'beauty', 'fitness', 'business', 'education'].includes(slug) ? 'USER' : 'RESOURCE',
          slotScheduleType: 'WEEKLY',
          maxCapacityPerSlot: spec.capacity ?? 1,
          manageCapacity: !!spec.capacity && spec.capacity > 1,
          requiresManualConfirm: !!spec.manualConfirm,
          requiresAdvancePayment: !!spec.price,
          advancePaymentAmount: spec.price ? new Prisma.Decimal(spec.price) : null,
          isPublished: true,
          shareToken: randomUUID(),
          location: spec.location,
        },
      })

      // Resources — userId left null to avoid the @unique constraint on Resource.userId
      // (a single User can only own one Resource row globally; for seed we don't need that link)
      const resources = await Promise.all(
        spec.resources.map((rname) =>
          prisma.resource.create({
            data: {
              appointmentTypeId: svc.id,
              userId: null,
              name: rname,
              resourceType: ['health', 'beauty', 'fitness', 'business', 'education'].includes(slug) ? 'USER' : 'RESOURCE',
            },
          })
        )
      )

      // Working hours: Mon-Sat (or all 7 for fitness/events)
      const days = slug === 'beauty' || slug === 'fitness' || slug === 'events'
        ? [0, 1, 2, 3, 4, 5, 6]
        : [1, 2, 3, 4, 5, 6]
      await prisma.workingHours.createMany({
        data: days.map((d) => ({
          appointmentTypeId: svc.id,
          dayOfWeek: d,
          startTime: slug === 'fitness' && d === 6 ? '07:00' : '09:00',
          endTime: slug === 'beauty' || slug === 'fitness' ? '20:00' : '18:00',
          isActive: true,
        })),
      })

      // Questions for healthy services
      let questionIds: string[] = []
      if (slug === 'health') {
        const qs = await Promise.all([
          prisma.bookingQuestion.create({ data: { appointmentTypeId: svc.id, question: 'Any known allergies to medication?', isRequired: true, sequence: 0 } }),
          prisma.bookingQuestion.create({ data: { appointmentTypeId: svc.id, question: 'Are you on any current medications?', isRequired: false, sequence: 1 } }),
        ])
        questionIds = qs.map((q) => q.id)
      } else if (slug === 'business') {
        const qs = await Promise.all([
          prisma.bookingQuestion.create({ data: { appointmentTypeId: svc.id, question: 'Briefly describe what you\'d like to discuss', isRequired: true, sequence: 0 } }),
          prisma.bookingQuestion.create({ data: { appointmentTypeId: svc.id, question: 'Any specific outcomes you want from this session?', isRequired: false, sequence: 1 } }),
        ])
        questionIds = qs.map((q) => q.id)
      }

      services.push({
        id: svc.id, spec, organiserId: org.id, categoryId: cat.id,
        resources: resources.map((res) => ({ id: res.id, name: res.name })),
        questionIds,
      })
    }
  }

  // 7. Bookings — generate ~5000 across 365 days back + 14 days forward
  const TOTAL_BOOKINGS = 5000
  const occupied = new Set<string>() // `${resourceId}|${ISOstart}` to avoid 1-capacity collisions
  let created = 0, skipped = 0
  const customerBookCount = new Map<string, number>()

  // Per-service weights — popular services get more bookings
  const serviceWeights = services.map((s) => {
    if (s.spec.name.includes('Yoga') || s.spec.name.includes('HIIT')) return 1.6
    if (s.spec.name.includes('Dental')) return 1.5
    if (s.spec.name.includes('Hair')) return 1.4
    if (s.spec.name.includes('Spa')) return 1.2
    if (s.spec.name.includes('Banquet') || s.spec.name.includes('Studio')) return 0.5
    return 1.0
  })
  const weightTotal = serviceWeights.reduce((a, b) => a + b, 0)
  function pickService(): SeededService {
    let x = r() * weightTotal
    for (let i = 0; i < services.length; i++) {
      x -= serviceWeights[i]
      if (x <= 0) return services[i]
    }
    return services[0]
  }

  for (let i = 0; i < TOTAL_BOOKINGS; i++) {
    const isFuture = chance(0.12)  // ~12% future bookings
    const daysOffset = isFuture
      ? Math.floor(r() * 14)
      : pickDayOffset(365)
    const baseDate = isFuture
      ? addDays(startOfDay(new Date()), daysOffset)
      : subDays(startOfDay(new Date()), daysOffset)

    const svc = pickService()
    const dur = svc.spec.durationMinutes

    // Construct slot start
    const hour = pickHour()
    const start = snapToSlot(addMinutes(baseDate, hour * 60), Math.min(dur, 60))
    const end = addMinutes(start, dur)

    const resource = pick(svc.resources)
    const lockKey = `${resource.id}|${start.toISOString()}`
    const capacity = svc.spec.capacity ?? 1
    if (capacity === 1 && occupied.has(lockKey)) { skipped++; continue }
    occupied.add(lockKey)

    // Customer — bias toward repeat customers
    const customer = chance(0.6) && customerBookCount.size > 0
      ? customers[Math.floor(r() * Math.min(customerBookCount.size, customers.length))]
      : pick(customers)

    const status: Status = isFuture
      ? pickStatusForFuture(svc.spec.manualConfirm ?? false)
      : pickStatusForPast()

    const isPaid = svc.spec.price && status !== 'CANCELLED' && (status === 'COMPLETED' || status === 'CONFIRMED' || status === 'NO_SHOW')

    const cancelReason = status === 'CANCELLED'
      ? pick(['Schedule conflict', 'No longer needed', 'Found another provider', 'Personal emergency'])
      : undefined

    try {
      const booking = await prisma.booking.create({
        data: {
          customerId: customer.id,
          appointmentTypeId: svc.id,
          resourceId: resource.id,
          scheduledStart: start,
          scheduledEnd: end,
          status,
          paymentStatus: isPaid ? 'PAID' : 'UNPAID',
          paymentAmount: isPaid && svc.spec.price ? new Prisma.Decimal(svc.spec.price) : null,
          paymentReference: isPaid ? `TXN${Math.floor(r() * 1e9)}` : null,
          cancelReason,
          capacity: 1,
        },
      })

      customerBookCount.set(customer.id, (customerBookCount.get(customer.id) ?? 0) + 1)

      // Answers for past health bookings
      if (svc.questionIds.length && chance(0.7) && !isFuture) {
        await prisma.bookingAnswer.createMany({
          data: svc.questionIds.slice(0, 1).map((qid) => ({
            bookingId: booking.id, questionId: qid,
            answer: pick(['No known allergies', 'None', 'Penicillin allergy', 'No, healthy']),
          })),
        })
      }

      // Audit log
      const auditEntries: Array<{ action: string; actorId: string; metadata?: object; createdAt?: Date }> = [
        { action: 'CREATED', actorId: customer.id, createdAt: addMinutes(start, -Math.floor(r() * 4320 + 60)) },
      ]
      if (status === 'COMPLETED') {
        auditEntries.push({ action: 'CONFIRMED', actorId: svc.organiserId })
        auditEntries.push({ action: 'COMPLETED', actorId: svc.organiserId, createdAt: addMinutes(end, 30) })
      } else if (status === 'CANCELLED') {
        auditEntries.push({ action: 'CANCELLED', actorId: customer.id, metadata: { cancelReason } })
      } else if (status === 'NO_SHOW') {
        auditEntries.push({ action: 'NO_SHOW', actorId: svc.organiserId, createdAt: addMinutes(end, 60) })
      }
      for (const e of auditEntries) {
        await prisma.bookingAuditLog.create({
          data: {
            bookingId: booking.id, actorId: e.actorId, action: e.action,
            metadata: e.metadata as Prisma.InputJsonValue | undefined,
            createdAt: e.createdAt ?? undefined,
          },
        })
      }

      created++
    } catch {
      skipped++
    }
  }

  // 8. AI sessions for first few customers
  for (const c of customers.slice(0, 3)) {
    await prisma.aIChatSession.create({ data: { userId: c.id, messages: [] } })
  }

  // ─── Summary ─────────────────────────────────────────────────────────
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.serviceCategory.count(),
    prisma.appointmentType.count(),
    prisma.resource.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: 'COMPLETED' } }),
    prisma.booking.count({ where: { status: 'CANCELLED' } }),
    prisma.booking.count({ where: { status: 'NO_SHOW' } }),
    prisma.booking.count({ where: { status: 'PENDING' } }),
    prisma.booking.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { paymentAmount: true } }),
  ])

  console.log('')
  console.log('✅ Seed complete')
  console.log(`   • Users:          ${counts[0]} (1 admin + ${ORGANISERS.length} organisers + ${CUSTOMER_NAMES.length} customers)`)
  console.log(`   • Categories:     ${counts[1]}`)
  console.log(`   • Services:       ${counts[2]}`)
  console.log(`   • Resources:      ${counts[3]}`)
  console.log(`   • Bookings:       ${counts[4]} (${created} created, ${skipped} skipped due to slot collisions)`)
  console.log(`     - Completed:    ${counts[5]}`)
  console.log(`     - Cancelled:    ${counts[6]}`)
  console.log(`     - No-show:      ${counts[7]}`)
  console.log(`     - Pending:      ${counts[8]}`)
  console.log(`   • Total revenue:  ₹${Number(counts[9]._sum.paymentAmount ?? 0).toLocaleString('en-IN')}`)
  console.log('')
  console.log('Demo credentials:')
  console.log('  Admin:        admin@demo.com        / Admin@1234')
  console.log('  Organisers:   <see ORGANISERS list> / Organiser@1234')
  console.log('    e.g.        dr.sharma@demo.com    / Organiser@1234')
  console.log('                glow@demo.com         / Organiser@1234')
  console.log('                peakfit@demo.com      / Organiser@1234')
  console.log('  Customer:     customer@demo.com     / Customer@1234')
  console.log('  Customer2:    customer2@demo.com    / Customer@1234')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
