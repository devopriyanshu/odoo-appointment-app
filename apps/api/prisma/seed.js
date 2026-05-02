"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const date_fns_1 = require("date-fns");
const prisma = new client_1.PrismaClient();
async function hash(password) {
    return bcryptjs_1.default.hash(password, 12);
}
function daysAgo(days, hour = 10, minute = 0) {
    const d = (0, date_fns_1.subDays)(new Date(), days);
    d.setHours(hour, minute, 0, 0);
    return d;
}
async function main() {
    console.log('🌱 Seeding database...');
    // Clear in dependency order
    await prisma.bookingAuditLog.deleteMany();
    await prisma.bookingAnswer.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.aIChatSession.deleteMany();
    await prisma.bookingQuestion.deleteMany();
    await prisma.workingHours.deleteMany();
    await prisma.flexibleSlot.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.appointmentType.deleteMany();
    await prisma.user.deleteMany();
    // Create users
    const [admin, organiser, customer, customer2] = await Promise.all([
        prisma.user.create({
            data: {
                email: 'admin@demo.com',
                password: await hash('Admin@1234'),
                name: 'Admin User',
                role: 'ADMIN',
                isActive: true,
            },
        }),
        prisma.user.create({
            data: {
                email: 'dr.sharma@demo.com',
                password: await hash('Doctor@1234'),
                name: 'Dr. Priya Sharma',
                role: 'ORGANISER',
                isActive: true,
                phone: '+919876543210',
            },
        }),
        prisma.user.create({
            data: {
                email: 'customer@demo.com',
                password: await hash('Customer@1234'),
                name: 'Rahul Mehta',
                role: 'CUSTOMER',
                isActive: true,
                phone: '+919876543211',
            },
        }),
        prisma.user.create({
            data: {
                email: 'customer2@demo.com',
                password: await hash('Customer@1234'),
                name: 'Anjali Desai',
                role: 'CUSTOMER',
                isActive: true,
                phone: '+919876543212',
            },
        }),
    ]);
    // Dental Checkup service
    const dentalService = await prisma.appointmentType.create({
        data: {
            organiserId: organiser.id,
            name: 'Dental Checkup',
            description: 'Comprehensive dental examination and cleaning by Dr. Sharma. Includes X-ray evaluation and personalized treatment plan.',
            durationMinutes: 30,
            resourceType: 'USER',
            slotScheduleType: 'WEEKLY',
            maxCapacityPerSlot: 1,
            manageCapacity: false,
            requiresManualConfirm: false,
            requiresAdvancePayment: true,
            advancePaymentAmount: 500.00,
            isPublished: true,
            shareToken: (0, crypto_1.randomUUID)(),
            location: 'Dr. Sharma Dental Clinic, FC Road, Pune 411005',
        },
    });
    const dentalResource = await prisma.resource.create({
        data: {
            appointmentTypeId: dentalService.id,
            userId: organiser.id,
            name: 'Dr. Priya Sharma',
            resourceType: 'USER',
        },
    });
    // Working hours Mon-Fri 9-17, Sat 10-14
    await prisma.workingHours.createMany({
        data: [
            { appointmentTypeId: dentalService.id, dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
            { appointmentTypeId: dentalService.id, dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true },
            { appointmentTypeId: dentalService.id, dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true },
            { appointmentTypeId: dentalService.id, dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isActive: true },
            { appointmentTypeId: dentalService.id, dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isActive: true },
            { appointmentTypeId: dentalService.id, dayOfWeek: 6, startTime: '10:00', endTime: '14:00', isActive: true },
        ],
    });
    await prisma.bookingQuestion.createMany({
        data: [
            { appointmentTypeId: dentalService.id, question: 'Any known allergies to medication or anaesthesia?', isRequired: true, sequence: 0 },
            { appointmentTypeId: dentalService.id, question: 'Was this a referral? If yes, by whom?', isRequired: false, sequence: 1 },
            { appointmentTypeId: dentalService.id, question: 'Are you on any current medications?', isRequired: false, sequence: 2 },
        ],
    });
    // Conference Room A
    const confService = await prisma.appointmentType.create({
        data: {
            organiserId: organiser.id,
            name: 'Conference Room A',
            description: 'Spacious conference room for team meetings, workshops, and client presentations. Capacity: 10 people.',
            durationMinutes: 60,
            resourceType: 'RESOURCE',
            slotScheduleType: 'WEEKLY',
            maxCapacityPerSlot: 10,
            manageCapacity: true,
            requiresManualConfirm: false,
            requiresAdvancePayment: false,
            isPublished: true,
            shareToken: (0, crypto_1.randomUUID)(),
            location: 'Floor 3, Innovation Hub, Baner, Pune 411045',
        },
    });
    const confResource = await prisma.resource.create({
        data: {
            appointmentTypeId: confService.id,
            userId: null,
            name: 'Conference Room A',
            resourceType: 'RESOURCE',
        },
    });
    await prisma.workingHours.createMany({
        data: [1, 2, 3, 4, 5].map((day) => ({
            appointmentTypeId: confService.id,
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '20:00',
            isActive: true,
        })),
    });
    const questions = await prisma.bookingQuestion.findMany({
        where: { appointmentTypeId: dentalService.id },
    });
    // Create past bookings for analytics
    const createBookingWithAudit = async (data) => {
        const booking = await prisma.booking.create({
            data: {
                customerId: data.customerId,
                appointmentTypeId: data.serviceId,
                resourceId: data.resourceId,
                scheduledStart: data.start,
                scheduledEnd: data.end,
                status: data.status,
                paymentStatus: data.paymentStatus,
                paymentAmount: data.paymentStatus === 'PAID' ? 500 : undefined,
                paymentReference: data.paymentStatus === 'PAID' ? `TXN${Date.now()}` : undefined,
                cancelReason: data.cancelReason,
                capacity: 1,
            },
        });
        if (data.answers?.length) {
            await prisma.bookingAnswer.createMany({
                data: data.answers.map((a) => ({ bookingId: booking.id, ...a })),
            });
        }
        await prisma.bookingAuditLog.create({
            data: { bookingId: booking.id, actorId: organiser.id, action: 'CREATED' },
        });
        if (data.status === 'COMPLETED') {
            await prisma.bookingAuditLog.create({
                data: { bookingId: booking.id, actorId: organiser.id, action: 'CONFIRMED' },
            });
            await prisma.bookingAuditLog.create({
                data: { bookingId: booking.id, actorId: organiser.id, action: 'COMPLETED' },
            });
        }
        if (data.status === 'CANCELLED') {
            await prisma.bookingAuditLog.create({
                data: { bookingId: booking.id, actorId: customer2.id, action: 'CANCELLED', metadata: { cancelReason: data.cancelReason } },
            });
        }
        return booking;
    };
    const makePastSlot = (daysBack, hour) => {
        const start = daysAgo(daysBack, hour);
        const end = new Date(start.getTime() + 30 * 60000);
        return { start, end };
    };
    // 3 confirmed past bookings
    for (let i = 0; i < 3; i++) {
        const { start, end } = makePastSlot(3 + i, 10 + i);
        await createBookingWithAudit({
            customerId: customer.id,
            serviceId: dentalService.id,
            resourceId: dentalResource.id,
            start,
            end,
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            answers: questions.slice(0, 1).map((q) => ({ questionId: q.id, answer: 'No known allergies' })),
        });
    }
    // 2 completed bookings
    for (let i = 0; i < 2; i++) {
        const { start, end } = makePastSlot(8 + i, 14);
        await createBookingWithAudit({
            customerId: customer.id,
            serviceId: dentalService.id,
            resourceId: dentalResource.id,
            start,
            end,
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            answers: questions.slice(0, 1).map((q) => ({ questionId: q.id, answer: 'No allergies' })),
        });
    }
    // 1 cancelled
    {
        const { start, end } = makePastSlot(5, 11);
        await createBookingWithAudit({
            customerId: customer2.id,
            serviceId: dentalService.id,
            resourceId: dentalResource.id,
            start,
            end,
            status: 'CANCELLED',
            paymentStatus: 'UNPAID',
            cancelReason: 'Schedule conflict',
        });
    }
    // 1 no-show (conference room)
    {
        const { start, end } = makePastSlot(2, 15);
        const confEnd = new Date(start.getTime() + 60 * 60000);
        await createBookingWithAudit({
            customerId: customer.id,
            serviceId: confService.id,
            resourceId: confResource.id,
            start,
            end: confEnd,
            status: 'NO_SHOW',
            paymentStatus: 'UNPAID',
        });
    }
    // 1 pending future
    {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrow.getTime() + 30 * 60000);
        await createBookingWithAudit({
            customerId: customer2.id,
            serviceId: dentalService.id,
            resourceId: dentalResource.id,
            start: tomorrow,
            end: tomorrowEnd,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
        });
    }
    // AI session for customer
    await prisma.aIChatSession.create({
        data: { userId: customer.id, messages: [] },
    });
    console.log('✅ Seed complete: 4 users, 2 services, 8 bookings');
    console.log('');
    console.log('Demo credentials:');
    console.log('  Admin:     admin@demo.com     / Admin@1234');
    console.log('  Organiser: dr.sharma@demo.com / Doctor@1234');
    console.log('  Customer:  customer@demo.com  / Customer@1234');
    console.log('  Customer2: customer2@demo.com / Customer@1234');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map