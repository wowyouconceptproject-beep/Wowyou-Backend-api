"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensurePurchaseSettlement = ensurePurchaseSettlement;
exports.processEligibleSettlements = processEligibleSettlements;
exports.getOrganizationSettlementSummary = getOrganizationSettlementSummary;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const stripe_service_1 = require("../payments/stripe/stripe.service");
const DAY_MS = 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * DAY_MS;
const MAX_BATCH_SIZE = 25;
const ZERO_DECIMAL_CURRENCIES = new Set([
    "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW",
    "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);
function toMinorUnits(amount, currency) {
    const code = currency.trim().toUpperCase();
    return ZERO_DECIMAL_CURRENCIES.has(code)
        ? Math.round(amount)
        : Math.round(amount * 100);
}
function fromMinorUnits(amount, currency) {
    const code = currency.trim().toUpperCase();
    return ZERO_DECIMAL_CURRENCIES.has(code)
        ? Math.round(amount)
        : amount / 100;
}
function decimalAmount(value) {
    if (!Number.isFinite(value)) {
        throw new Error("Invalid settlement amount.");
    }
    return new client_1.Prisma.Decimal(value.toFixed(2));
}
function getReleaseAt(input) {
    const cutoff = new Date(input.eventStartDate.getTime() - FOURTEEN_DAYS_MS);
    const createdMoreThanFourteenDaysBeforeStart = input.eventCreatedAt.getTime() < cutoff.getTime();
    // Events created 14 days or less before their start:
    // release each successful payment 24 hours after payment.
    if (!createdMoreThanFourteenDaysBeforeStart) {
        return new Date(input.paymentCompletedAt.getTime() + DAY_MS);
    }
    // Events created earlier than the 14-day cutoff:
    // purchases paid by the cutoff become eligible at the cutoff.
    if (input.paymentCompletedAt.getTime() <= cutoff.getTime()) {
        return cutoff;
    }
    // Purchases made after the cutoff become eligible 24 hours
    // after the event ends.
    return new Date(input.eventEndDate.getTime() + DAY_MS);
}
function idFromStripeObject(value) {
    if (!value)
        return null;
    return typeof value === "string" ? value : value.id;
}
async function retrieveStripeFee(paymentIntentId, purchaseCurrency) {
    const stripe = (0, stripe_service_1.getStripe)();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge.balance_transaction"],
    });
    let charge = null;
    if (typeof paymentIntent.latest_charge === "string") {
        charge = await stripe.charges.retrieve(paymentIntent.latest_charge, {
            expand: ["balance_transaction"],
        });
    }
    else if (paymentIntent.latest_charge) {
        charge = paymentIntent.latest_charge;
    }
    if (!charge) {
        return {
            paymentIntentId: paymentIntent.id,
            chargeId: null,
            balanceTransactionId: null,
            fee: null,
            feeCurrency: null,
            reconciled: false,
        };
    }
    let balanceTransaction = null;
    if (typeof charge.balance_transaction === "string") {
        balanceTransaction = await stripe.balanceTransactions.retrieve(charge.balance_transaction);
    }
    else if (charge.balance_transaction) {
        balanceTransaction =
            charge.balance_transaction;
    }
    if (!balanceTransaction) {
        return {
            paymentIntentId: paymentIntent.id,
            chargeId: charge.id,
            balanceTransactionId: null,
            fee: null,
            feeCurrency: null,
            reconciled: false,
        };
    }
    const feeCurrency = balanceTransaction.currency.toUpperCase();
    const fee = fromMinorUnits(balanceTransaction.fee, feeCurrency);
    const purchaseCode = purchaseCurrency.toUpperCase();
    // Do not invent an exchange rate if Stripe records the fee in
    // a different currency from the purchase.
    return {
        paymentIntentId: paymentIntent.id,
        chargeId: charge.id,
        balanceTransactionId: balanceTransaction.id,
        fee,
        feeCurrency,
        reconciled: true,
        comparableCurrency: feeCurrency === purchaseCode,
    };
}
/**
 * Called from the verified Stripe webhook only after the purchase
 * has been marked PAID. Upsert makes webhook retries safe.
 * This function does not issue tickets.
 */
async function ensurePurchaseSettlement(purchaseId, verifiedSession) {
    const purchase = await prisma_1.prisma.ticketPurchase.findUnique({
        where: { id: purchaseId },
        include: {
            event: {
                select: {
                    id: true,
                    organizationId: true,
                    createdAt: true,
                    startDate: true,
                    endDate: true,
                },
            },
        },
    });
    if (!purchase) {
        throw new Error(`Settlement purchase ${purchaseId} not found.`);
    }
    if (purchase.status !== "PAID" ||
        purchase.paymentProvider !== "STRIPE") {
        return;
    }
    // Free purchases do not require Stripe settlement.
    if (Number(purchase.subtotal) <= 0) {
        return;
    }
    const paymentIntentId = idFromStripeObject(verifiedSession.payment_intent);
    const paidAt = purchase.paymentCompletedAt ?? new Date();
    const releaseAt = getReleaseAt({
        eventCreatedAt: purchase.event.createdAt,
        eventStartDate: purchase.event.startDate,
        eventEndDate: purchase.event.endDate,
        paymentCompletedAt: paidAt,
    });
    const subtotal = Number(purchase.subtotal);
    const transactionFee = Number(purchase.transactionFee ?? 0);
    const settlement = await prisma_1.prisma.purchaseSettlement.upsert({
        where: {
            purchaseId: purchase.id,
        },
        create: {
            purchaseId: purchase.id,
            eventId: purchase.eventId,
            organizationId: purchase.event.organizationId,
            currency: purchase.currency.toUpperCase(),
            ticketSubtotal: decimalAmount(subtotal),
            transactionFee: decimalAmount(transactionFee),
            refundAmount: decimalAmount(0),
            organizerAmount: decimalAmount(subtotal),
            releaseAt,
            status: client_1.EventPayoutStatus.PENDING,
            stripePaymentIntentId: paymentIntentId,
        },
        update: {
            // Only fill the PaymentIntent when a prior webhook did not have it.
            ...(paymentIntentId
                ? { stripePaymentIntentId: paymentIntentId }
                : {}),
        },
        select: {
            id: true,
            stripeBalanceTransactionId: true,
        },
    });
    if (settlement.stripeBalanceTransactionId ||
        !paymentIntentId) {
        return;
    }
    try {
        const feeInfo = await retrieveStripeFee(paymentIntentId, purchase.currency);
        if (!feeInfo.reconciled ||
            !feeInfo.balanceTransactionId ||
            feeInfo.fee === null) {
            console.info("Settlement waiting for Stripe Balance Transaction:", settlement.id);
            return;
        }
        const sameCurrency = feeInfo.feeCurrency === purchase.currency.toUpperCase();
        const feeRevenue = transactionFee;
        const shortfall = sameCurrency
            ? Math.max(feeInfo.fee - feeRevenue, 0)
            : null;
        const surplus = sameCurrency
            ? Math.max(feeRevenue - feeInfo.fee, 0)
            : null;
        await prisma_1.prisma.purchaseSettlement.update({
            where: {
                id: settlement.id,
            },
            data: {
                stripePaymentIntentId: feeInfo.paymentIntentId,
                stripeChargeId: feeInfo.chargeId,
                stripeBalanceTransactionId: feeInfo.balanceTransactionId,
                stripeProcessingFee: decimalAmount(feeInfo.fee),
                stripeProcessingFeeCurrency: feeInfo.feeCurrency,
                platformFeeShortfall: shortfall === null
                    ? null
                    : decimalAmount(shortfall),
                platformFeeSurplus: surplus === null
                    ? null
                    : decimalAmount(surplus),
                stripeFeeReconciledAt: new Date(),
            },
        });
    }
    catch (error) {
        // Do not fail ticket issuance merely because Stripe's
        // Balance Transaction is delayed. The scheduled job retries.
        console.warn("Stripe fee reconciliation deferred:", {
            settlementId: settlement.id,
            error: error instanceof Error
                ? error.message
                : String(error),
        });
    }
}
function nextRetryAt(attempts) {
    const delay = Math.min(15 * 60 * 1000 *
        (2 ** Math.max(0, attempts - 1)), DAY_MS);
    return new Date(Date.now() + delay);
}
async function reconcileFeeForSettlement(settlementId) {
    const row = await prisma_1.prisma.purchaseSettlement.findUnique({
        where: {
            id: settlementId,
        },
        include: {
            purchase: true,
        },
    });
    if (!row ||
        row.stripeBalanceTransactionId ||
        !row.stripePaymentIntentId) {
        return row;
    }
    const feeInfo = await retrieveStripeFee(row.stripePaymentIntentId, row.currency);
    if (!feeInfo.reconciled ||
        !feeInfo.balanceTransactionId ||
        feeInfo.fee === null) {
        throw new Error("Stripe processing fee is not available yet.");
    }
    const sameCurrency = feeInfo.feeCurrency === row.currency.toUpperCase();
    const feeRevenue = Number(row.transactionFee);
    await prisma_1.prisma.purchaseSettlement.update({
        where: {
            id: row.id,
        },
        data: {
            stripeChargeId: feeInfo.chargeId,
            stripeBalanceTransactionId: feeInfo.balanceTransactionId,
            stripeProcessingFee: decimalAmount(feeInfo.fee),
            stripeProcessingFeeCurrency: feeInfo.feeCurrency,
            platformFeeShortfall: sameCurrency
                ? decimalAmount(Math.max(feeInfo.fee - feeRevenue, 0))
                : null,
            platformFeeSurplus: sameCurrency
                ? decimalAmount(Math.max(feeRevenue - feeInfo.fee, 0))
                : null,
            stripeFeeReconciledAt: new Date(),
        },
    });
    return prisma_1.prisma.purchaseSettlement.findUnique({
        where: {
            id: row.id,
        },
        include: {
            organization: true,
        },
    });
}
async function processEligibleSettlements() {
    const now = new Date();
    const staleProcessingBefore = new Date(now.getTime() - 15 * 60 * 1000);
    // Recover rows left PROCESSING by a crashed worker.
    // Stripe idempotency protects transfer retries.
    await prisma_1.prisma.purchaseSettlement.updateMany({
        where: {
            status: client_1.EventPayoutStatus.PROCESSING,
            updatedAt: {
                lte: staleProcessingBefore,
            },
        },
        data: {
            status: client_1.EventPayoutStatus.FAILED,
            failureReason: "Recovered stale PROCESSING settlement; retrying idempotently.",
            nextAttemptAt: now,
        },
    });
    const candidates = await prisma_1.prisma.purchaseSettlement.findMany({
        where: {
            releaseAt: {
                lte: now,
            },
            status: {
                in: [
                    client_1.EventPayoutStatus.PENDING,
                    client_1.EventPayoutStatus.FAILED,
                    client_1.EventPayoutStatus.BLOCKED,
                ],
            },
            OR: [
                {
                    nextAttemptAt: null,
                },
                {
                    nextAttemptAt: {
                        lte: now,
                    },
                },
            ],
        },
        orderBy: [
            {
                releaseAt: "asc",
            },
            {
                createdAt: "asc",
            },
        ],
        take: MAX_BATCH_SIZE,
        select: {
            id: true,
        },
    });
    const result = {
        scanned: candidates.length,
        transferred: 0,
        blocked: 0,
        failed: 0,
    };
    for (const candidate of candidates) {
        // Claim each settlement atomically so concurrent workers do not
        // intentionally process the same pending row.
        const claimed = await prisma_1.prisma.purchaseSettlement.updateMany({
            where: {
                id: candidate.id,
                releaseAt: {
                    lte: new Date(),
                },
                status: {
                    in: [
                        client_1.EventPayoutStatus.PENDING,
                        client_1.EventPayoutStatus.FAILED,
                        client_1.EventPayoutStatus.BLOCKED,
                    ],
                },
            },
            data: {
                status: client_1.EventPayoutStatus.PROCESSING,
                attempts: {
                    increment: 1,
                },
                processingStartedAt: new Date(),
                failureReason: null,
            },
        });
        if (claimed.count !== 1) {
            continue;
        }
        try {
            let row = await reconcileFeeForSettlement(candidate.id);
            if (!row) {
                throw new Error("Settlement record disappeared.");
            }
            // Load a consistent shape with the organization relation.
            row = await prisma_1.prisma.purchaseSettlement.findUnique({
                where: {
                    id: candidate.id,
                },
                include: {
                    organization: true,
                },
            });
            if (!row) {
                throw new Error("Settlement record disappeared.");
            }
            if (!row.stripeBalanceTransactionId ||
                row.stripeProcessingFee === null) {
                throw new Error("Stripe processing fee has not been reconciled.");
            }
            if (!row.organization.stripeAccountId ||
                !row.organization.stripeOnboardingComplete ||
                !row.organization.stripePayoutsEnabled) {
                await prisma_1.prisma.purchaseSettlement.update({
                    where: {
                        id: row.id,
                    },
                    data: {
                        status: client_1.EventPayoutStatus.BLOCKED,
                        failureReason: "Organizer Stripe Connect onboarding or payouts are not enabled.",
                        nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000),
                    },
                });
                result.blocked += 1;
                continue;
            }
            // The attendee fee pays Stripe costs first. It does not reduce
            // organizer proceeds. WowYou absorbs any fee shortfall.
            const organizerAmount = Number(row.organizerAmount) -
                Number(row.refundAmount);
            const amount = toMinorUnits(organizerAmount, row.currency);
            if (!Number.isSafeInteger(amount) ||
                amount <= 0) {
                await prisma_1.prisma.purchaseSettlement.update({
                    where: {
                        id: row.id,
                    },
                    data: {
                        status: client_1.EventPayoutStatus.BLOCKED,
                        failureReason: "Organizer transfer amount is zero or invalid after refunds.",
                        nextAttemptAt: null,
                    },
                });
                result.blocked += 1;
                continue;
            }
            const stripe = (0, stripe_service_1.getStripe)();
            const transferParams = {
                amount,
                currency: row.currency.toLowerCase(),
                destination: row.organization.stripeAccountId,
                metadata: {
                    platform: "WOWYOU",
                    settlementId: row.id,
                    purchaseId: row.purchaseId,
                    eventId: row.eventId,
                    organizationId: row.organizationId,
                },
            };
            if (row.stripeChargeId) {
                transferParams.source_transaction =
                    row.stripeChargeId;
            }
            const transfer = await stripe.transfers.create(transferParams, {
                idempotencyKey: `wowyou_settlement_${row.id}`,
            });
            await prisma_1.prisma.purchaseSettlement.update({
                where: {
                    id: row.id,
                },
                data: {
                    status: client_1.EventPayoutStatus.TRANSFERRED,
                    stripeTransferId: transfer.id,
                    transferredAt: new Date(),
                    nextAttemptAt: null,
                    failureReason: null,
                },
            });
            result.transferred += 1;
        }
        catch (error) {
            const message = error instanceof Error
                ? error.message
                : String(error);
            const current = await prisma_1.prisma.purchaseSettlement.findUnique({
                where: {
                    id: candidate.id,
                },
                select: {
                    attempts: true,
                },
            });
            await prisma_1.prisma.purchaseSettlement.update({
                where: {
                    id: candidate.id,
                },
                data: {
                    status: client_1.EventPayoutStatus.FAILED,
                    failureReason: message.slice(0, 2000),
                    nextAttemptAt: nextRetryAt(current?.attempts ?? 1),
                },
            }).catch((updateError) => {
                console.error("Failed to record settlement failure:", updateError);
            });
            result.failed += 1;
            console.error("Settlement transfer failed:", {
                settlementId: candidate.id,
                error: message,
            });
        }
    }
    return result;
}
async function getOrganizationSettlementSummary(organizationId, ownerId) {
    const organization = await prisma_1.prisma.organization.findFirst({
        where: {
            id: organizationId,
            ownerId,
        },
        select: {
            id: true,
            name: true,
            stripeAccountId: true,
            stripeAccountStatus: true,
            stripePayoutsEnabled: true,
            stripeDetailsSubmitted: true,
            stripeOnboardingComplete: true,
        },
    });
    if (!organization) {
        return null;
    }
    const rows = await prisma_1.prisma.purchaseSettlement.findMany({
        where: {
            organizationId,
        },
        orderBy: {
            createdAt: "desc",
        },
        select: {
            id: true,
            eventId: true,
            purchaseId: true,
            currency: true,
            ticketSubtotal: true,
            transactionFee: true,
            stripeProcessingFee: true,
            stripeProcessingFeeCurrency: true,
            platformFeeShortfall: true,
            platformFeeSurplus: true,
            organizerAmount: true,
            refundAmount: true,
            releaseAt: true,
            status: true,
            stripeTransferId: true,
            transferredAt: true,
            failureReason: true,
            createdAt: true,
        },
    });
    return {
        organization,
        counts: {
            pending: rows.filter((x) => x.status === client_1.EventPayoutStatus.PENDING).length,
            processing: rows.filter((x) => x.status === client_1.EventPayoutStatus.PROCESSING).length,
            blocked: rows.filter((x) => x.status === client_1.EventPayoutStatus.BLOCKED).length,
            failed: rows.filter((x) => x.status === client_1.EventPayoutStatus.FAILED).length,
            transferred: rows.filter((x) => x.status === client_1.EventPayoutStatus.TRANSFERRED).length,
        },
        settlements: rows,
    };
}
