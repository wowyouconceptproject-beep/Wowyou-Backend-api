"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPurchase = createPurchase;
exports.getMyTickets = getMyTickets;
exports.getPurchasePaymentStatus = getPurchasePaymentStatus;
exports.getMyEvents = getMyEvents;
exports.getMyEvent = getMyEvent;
const prisma_1 = require("../../lib/prisma");
const stripe_service_1 = require("../payments/stripe/stripe.service");
const ticket_issuance_service_1 = require("./ticket-issuance.service");
/*
|--------------------------------------------------------------------------
| Currency Minor Units
|--------------------------------------------------------------------------
*/
function toMinorUnits(amount, currency) {
    const normalized = currency
        .trim()
        .toUpperCase();
    const zeroDecimal = new Set([
        "BIF",
        "CLP",
        "DJF",
        "GNF",
        "ISK",
        "JPY",
        "KMF",
        "KRW",
        "PYG",
        "RWF",
        "UGX",
        "VND",
        "VUV",
        "XAF",
        "XOF",
        "XPF",
    ]);
    if (zeroDecimal.has(normalized)) {
        return Math.round(amount);
    }
    return Math.round(amount * 100);
}
/*
|--------------------------------------------------------------------------
| Payment Return URL
|--------------------------------------------------------------------------
*/
function getPaymentReturnUrl(purchaseId, channel) {
    /*
    |--------------------------------------------------------------------------
    | Web Attendee Checkout
    |--------------------------------------------------------------------------
    */
    if (channel === "web") {
        const webUrl = (process.env.ATTENDEE_WEB_URL ??
            process.env.WEB_APP_URL ??
            process.env.FRONTEND_URL ??
            "").replace(/\/+$/, "");
        if (!webUrl) {
            throw new Error("Attendee web application URL is not configured.");
        }
        return `${webUrl}/attendee/dashboard?purchase=${encodeURIComponent(purchaseId)}`;
    }
    /*
    |--------------------------------------------------------------------------
    | Mobile Attendee Checkout
    |--------------------------------------------------------------------------
    */
    const mobileReturnUrl = process.env.PAYMENT_RETURN_URL ??
        process.env.FRONTEND_URL;
    if (!mobileReturnUrl) {
        throw new Error("Mobile payment return URL is not configured.");
    }
    return `${mobileReturnUrl}?purchase=${encodeURIComponent(purchaseId)}`;
}
/*
|--------------------------------------------------------------------------
| Create Purchase
|--------------------------------------------------------------------------
*/
async function createPurchase(userId, ticketTypeId, quantity, channel = "mobile") {
    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */
    if (!userId) {
        throw new Error("User ID is required.");
    }
    if (!ticketTypeId) {
        throw new Error("Ticket type is required.");
    }
    if (!Number.isInteger(quantity) ||
        quantity < 1) {
        throw new Error("Quantity must be at least 1.");
    }
    if (channel !== "mobile" &&
        channel !== "web") {
        throw new Error("Invalid checkout channel.");
    }
    /*
    |--------------------------------------------------------------------------
    | Authenticated User / Attendee Authorization
    |--------------------------------------------------------------------------
    |
    | The JWT gives us the user ID.
    |
    | We NEVER trust the frontend to tell us that the user is an attendee.
    |
    | This service is shared by:
    |
    | - Flutter/mobile attendee checkout
    | - Public web attendee checkout
    |
    | Therefore the role must be checked here before any purchase is created.
    |
    */
    const attendee = await prisma_1.prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            email: true,
            role: true,
        },
    });
    if (!attendee) {
        throw new Error("Attendee account not found.");
    }
    /*
    |--------------------------------------------------------------------------
    | Role Authorization
    |--------------------------------------------------------------------------
    |
    | Only ATTENDEE accounts can purchase event tickets.
    |
    | ORGANIZER and VENDOR accounts must never be able to create a
    | TicketPurchase, regardless of whether they possess a valid JWT.
    |
    */
    if (attendee.role !==
        "ATTENDEE") {
        const error = new Error("Only attendee accounts can purchase event tickets.");
        error.code =
            "ATTENDEE_REQUIRED";
        throw error;
    }
    /*
    |--------------------------------------------------------------------------
    | Attendee Email
    |--------------------------------------------------------------------------
    |
    | The authenticated attendee is the source of truth.
    |
    | IMPORTANT:
    |
    | This is deliberately loaded from the User record and is completely
    | separate from the event organization/organizer email.
    |
    */
    if (!attendee.email) {
        throw new Error("Attendee email address not found.");
    }
    const attendeeEmail = attendee.email
        .trim()
        .toLowerCase();
    if (!attendeeEmail) {
        throw new Error("Attendee email address not found.");
    }
    /*
    |--------------------------------------------------------------------------
    | Load Ticket
    |--------------------------------------------------------------------------
    */
    const ticket = await prisma_1.prisma.ticketType.findUnique({
        where: {
            id: ticketTypeId,
        },
        include: {
            event: true,
        },
    });
    if (!ticket) {
        throw new Error("Ticket not found.");
    }
    /*
    |--------------------------------------------------------------------------
    | Ticket Availability
    |--------------------------------------------------------------------------
    */
    if (!ticket.isActive) {
        throw new Error("Ticket unavailable.");
    }
    if (ticket.event.status !==
        "PUBLISHED") {
        throw new Error("This event is not published.");
    }
    const now = new Date();
    if (ticket.event.endDate <=
        now) {
        throw new Error("This event has already ended.");
    }
    /*
    |--------------------------------------------------------------------------
    | Inventory
    |--------------------------------------------------------------------------
    */
    const remaining = ticket.quantity -
        ticket.sold;
    if (remaining <= 0) {
        throw new Error("This ticket is sold out.");
    }
    if (quantity > remaining) {
        throw new Error(`Only ${remaining} ticket${remaining === 1
            ? ""
            : "s"} remaining.`);
    }
    /*
    |--------------------------------------------------------------------------
    | Amount
    |--------------------------------------------------------------------------
    */
    const currency = ticket.event.currency
        .trim()
        .toUpperCase();
    const unitPrice = Number(ticket.price);
    if (!Number.isFinite(unitPrice) ||
        unitPrice < 0) {
        throw new Error("Invalid ticket price.");
    }
    const amount = unitPrice *
        quantity;
    if (!Number.isFinite(amount) ||
        amount < 0) {
        throw new Error("Invalid purchase amount.");
    }
    /*
    |--------------------------------------------------------------------------
    | Free Ticket
    |--------------------------------------------------------------------------
    */
    if (amount === 0) {
        const purchase = await prisma_1.prisma.$transaction(async (tx) => {
            /*
            |--------------------------------------------------------------------------
            | Reload Ticket
            |--------------------------------------------------------------------------
            */
            const currentTicket = await tx.ticketType.findUnique({
                where: {
                    id: ticketTypeId,
                },
            });
            if (!currentTicket) {
                throw new Error("Ticket not found.");
            }
            if (!currentTicket.isActive) {
                throw new Error("Ticket unavailable.");
            }
            /*
            |--------------------------------------------------------------------------
            | Inventory Check
            |--------------------------------------------------------------------------
            */
            const currentRemaining = currentTicket.quantity -
                currentTicket.sold;
            if (currentRemaining <
                quantity) {
                throw new Error(currentRemaining <= 0
                    ? "This ticket is sold out."
                    : `Only ${currentRemaining} ticket${currentRemaining === 1
                        ? ""
                        : "s"} remaining.`);
            }
            /*
            |--------------------------------------------------------------------------
            | Reserve Inventory
            |--------------------------------------------------------------------------
            */
            const inventory = await tx.ticketType.updateMany({
                where: {
                    id: ticketTypeId,
                    isActive: true,
                    sold: {
                        lte: currentTicket.quantity -
                            quantity,
                    },
                },
                data: {
                    sold: {
                        increment: quantity,
                    },
                },
            });
            if (inventory.count !== 1) {
                throw new Error("Ticket inventory changed. Please try again.");
            }
            /*
            |--------------------------------------------------------------------------
            | Create Purchase
            |--------------------------------------------------------------------------
            */
            return tx.ticketPurchase.create({
                data: {
                    userId,
                    eventId: ticket.eventId,
                    ticketTypeId,
                    quantity,
                    amount,
                    currency,
                    paymentProvider: "FREE",
                    paymentReference: null,
                    paymentMethod: "FREE",
                    gatewayStatus: "COMPLETED",
                    status: "PAID",
                    paymentCompletedAt: new Date(),
                },
            });
        });
        /*
        |--------------------------------------------------------------------------
        | Issue Event Passes
        |--------------------------------------------------------------------------
        */
        const passes = await (0, ticket_issuance_service_1.issuePurchase)(purchase.id);
        return {
            purchase,
            passes,
            checkoutUrl: null,
            paymentRequired: false,
        };
    }
    /*
    |--------------------------------------------------------------------------
    | Paid Ticket
    |--------------------------------------------------------------------------
    |
    | Create a pending purchase.
    |
    | Inventory is NOT reserved here.
    |
    | Stripe webhook remains authoritative.
    |
    */
    const purchase = await prisma_1.prisma.ticketPurchase.create({
        data: {
            userId,
            eventId: ticket.eventId,
            ticketTypeId,
            quantity,
            amount,
            currency,
            paymentProvider: "STRIPE",
            paymentReference: null,
            paymentMethod: "STRIPE_CHECKOUT",
            gatewayStatus: "PENDING",
            status: "PENDING",
        },
    });
    /*
    |--------------------------------------------------------------------------
    | Stripe Amount
    |--------------------------------------------------------------------------
    */
    const stripeAmount = toMinorUnits(amount, currency);
    if (!Number.isInteger(stripeAmount) ||
        stripeAmount < 1) {
        await prisma_1.prisma.ticketPurchase.delete({
            where: {
                id: purchase.id,
            },
        });
        throw new Error("Payment amount is invalid.");
    }
    /*
    |--------------------------------------------------------------------------
    | Payment Return URL
    |--------------------------------------------------------------------------
    */
    const paymentReturnUrl = getPaymentReturnUrl(purchase.id, channel);
    /*
    |--------------------------------------------------------------------------
    | Stripe Checkout
    |--------------------------------------------------------------------------
    */
    try {
        const session = await (0, stripe_service_1.createStripeCheckoutSession)({
            purchaseId: purchase.id,
            userId,
            eventId: ticket.eventId,
            ticketTypeId,
            amount: stripeAmount,
            currency,
            productName: `${ticket.event.title} - ${ticket.name}`,
            quantity,
            /*
            |--------------------------------------------------------------------------
            | ATTENDEE EMAIL
            |--------------------------------------------------------------------------
            |
            | This is the purchaser's email.
            |
            | It comes from the authenticated ATTENDEE account.
            |
            | Do NOT replace this with the organization email.
            |
            */
            customerEmail: attendeeEmail,
            successUrl: paymentReturnUrl,
            cancelUrl: paymentReturnUrl,
        });
        /*
        |--------------------------------------------------------------------------
        | Validate Stripe Response
        |--------------------------------------------------------------------------
        */
        if (!session.sessionId) {
            throw new Error("Stripe did not return a Checkout Session ID.");
        }
        if (!session.checkoutUrl) {
            throw new Error("Stripe did not return a Checkout URL.");
        }
        /*
        |--------------------------------------------------------------------------
        | Store Stripe Session
        |--------------------------------------------------------------------------
        */
        const updatedPurchase = await prisma_1.prisma.ticketPurchase.update({
            where: {
                id: purchase.id,
            },
            data: {
                paymentReference: session.sessionId,
                gatewayStatus: "CHECKOUT_CREATED",
            },
        });
        /*
        |--------------------------------------------------------------------------
        | Return Checkout
        |--------------------------------------------------------------------------
        */
        return {
            purchase: updatedPurchase,
            passes: [],
            checkoutUrl: session.checkoutUrl,
            paymentRequired: true,
        };
    }
    catch (error) {
        console.error("STRIPE PURCHASE ERROR:", error);
        /*
        |--------------------------------------------------------------------------
        | Cleanup Pending Purchase
        |--------------------------------------------------------------------------
        */
        try {
            await prisma_1.prisma.ticketPurchase.delete({
                where: {
                    id: purchase.id,
                },
            });
        }
        catch (cleanupError) {
            console.error("PURCHASE CLEANUP ERROR:", cleanupError);
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Unable to initialize payment.");
    }
}
/*
|--------------------------------------------------------------------------
| My Tickets
|--------------------------------------------------------------------------
*/
async function getMyTickets(userId) {
    return prisma_1.prisma.ticketPurchase.findMany({
        where: {
            userId,
            status: "PAID",
        },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    venue: true,
                    city: true,
                    country: true,
                    coverImage: true,
                    featuredImage: true,
                    startDate: true,
                    endDate: true,
                    currency: true,
                },
            },
            ticket: {
                select: {
                    id: true,
                    name: true,
                    price: true,
                },
            },
            passes: {
                where: {
                    isActive: true,
                    isRevoked: false,
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    attendeeProfile: {
                        select: {
                            avatar: true,
                            profession: true,
                            company: true,
                            jobTitle: true,
                        },
                    },
                },
            },
            checkIn: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
/*
|--------------------------------------------------------------------------
| Purchase Payment Status
|--------------------------------------------------------------------------
*/
async function getPurchasePaymentStatus(userId, purchaseId) {
    const purchase = await prisma_1.prisma.ticketPurchase.findFirst({
        where: {
            id: purchaseId,
            userId,
        },
        select: {
            id: true,
            status: true,
            gatewayStatus: true,
            paymentProvider: true,
            paymentReference: true,
            paymentCompletedAt: true,
            amount: true,
            currency: true,
            quantity: true,
            event: {
                select: {
                    id: true,
                    title: true,
                },
            },
            ticket: {
                select: {
                    id: true,
                    name: true,
                },
            },
            passes: {
                where: {
                    isActive: true,
                    isRevoked: false,
                },
                select: {
                    id: true,
                },
            },
        },
    });
    if (!purchase) {
        throw new Error("Purchase not found.");
    }
    return {
        id: purchase.id,
        status: purchase.status,
        gatewayStatus: purchase.gatewayStatus,
        paymentProvider: purchase.paymentProvider,
        paymentReference: purchase.paymentReference,
        paymentCompletedAt: purchase.paymentCompletedAt,
        amount: purchase.amount,
        currency: purchase.currency,
        quantity: purchase.quantity,
        event: purchase.event,
        ticket: purchase.ticket,
        passes: purchase.passes,
        hasPass: purchase.passes.length > 0,
    };
}
/*
|--------------------------------------------------------------------------
| My Events
|--------------------------------------------------------------------------
*/
async function getMyEvents(userId) {
    return prisma_1.prisma.ticketPurchase.findMany({
        where: {
            userId,
            status: "PAID",
        },
        include: {
            event: {
                include: {
                    announcements: {
                        where: {
                            OR: [
                                {
                                    expiresAt: null,
                                },
                                {
                                    expiresAt: {
                                        gt: new Date(),
                                    },
                                },
                            ],
                        },
                        orderBy: [
                            {
                                isPinned: "desc",
                            },
                            {
                                createdAt: "desc",
                            },
                        ],
                        take: 5,
                    },
                },
            },
            ticket: true,
            passes: {
                where: {
                    isActive: true,
                    isRevoked: false,
                },
            },
            checkIn: true,
        },
        orderBy: {
            event: {
                startDate: "asc",
            },
        },
    });
}
/*
|--------------------------------------------------------------------------
| Event Hub
|--------------------------------------------------------------------------
*/
async function getMyEvent(userId, purchaseId) {
    const purchase = await prisma_1.prisma.ticketPurchase.findFirst({
        where: {
            id: purchaseId,
            userId,
            status: "PAID",
        },
        include: {
            /*
            |--------------------------------------------------------------------------
            | Event
            |--------------------------------------------------------------------------
            */
            event: {
                include: {
                    /*
                    |--------------------------------------------------------------------------
                    | Announcements
                    |--------------------------------------------------------------------------
                    */
                    announcements: {
                        where: {
                            OR: [
                                {
                                    expiresAt: null,
                                },
                                {
                                    expiresAt: {
                                        gt: new Date(),
                                    },
                                },
                            ],
                        },
                        orderBy: [
                            {
                                isPinned: "desc",
                            },
                            {
                                createdAt: "desc",
                            },
                        ],
                    },
                    /*
                    |--------------------------------------------------------------------------
                    | Sessions
                    |--------------------------------------------------------------------------
                    */
                    sessions: {
                        orderBy: {
                            startTime: "asc",
                        },
                    },
                },
            },
            /*
            |--------------------------------------------------------------------------
            | Purchased Ticket
            |--------------------------------------------------------------------------
            */
            ticket: true,
            /*
            |--------------------------------------------------------------------------
            | Active Passes
            |--------------------------------------------------------------------------
            */
            passes: {
                where: {
                    isActive: true,
                    isRevoked: false,
                },
            },
            /*
            |--------------------------------------------------------------------------
            | Check-In
            |--------------------------------------------------------------------------
            */
            checkIn: {
                include: {
                    staff: true,
                },
            },
            /*
            |--------------------------------------------------------------------------
            | Attendee Activities
            |--------------------------------------------------------------------------
            */
            activities: {
                orderBy: {
                    createdAt: "desc",
                },
            },
            /*
            |--------------------------------------------------------------------------
            | Attendee
            |--------------------------------------------------------------------------
            */
            user: {
                include: {
                    attendeeProfile: true,
                },
            },
        },
    });
    if (!purchase) {
        throw new Error("Event not found.");
    }
    return purchase;
}
