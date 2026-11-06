"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkingService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const networking_ai_1 = require("./networking.ai");
const networking_mapper_1 = require("./networking.mapper");
const networking_matcher_1 = require("./networking.matcher");
class NetworkingService {
    matcher = new networking_matcher_1.NetworkingMatcher();
    ai = new networking_ai_1.NetworkingAI();
    // ============================================
    // NETWORKING ELIGIBILITY
    // ============================================
    async assertNetworkingEligibility(userId, eventId) {
        const registration = await prisma_1.prisma.registration.findUnique({
            where: {
                userId_eventId: {
                    userId,
                    eventId,
                },
            },
        });
        if (!registration) {
            throw new Error("You must register for this event to network.");
        }
        const attendee = await prisma_1.prisma.attendee.findUnique({
            where: {
                eventId_userId: {
                    eventId,
                    userId,
                },
            },
        });
        if (attendee && !attendee.isNetworkingEnabled) {
            throw new Error("Networking is disabled for this attendee.");
        }
    }
    // ============================================
    // GET MATCHES
    // ============================================
    async getMatches(userId, eventId, limit = 20) {
        await this.assertNetworkingEligibility(userId, eventId);
        const attendee = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: { attendeeProfile: true },
        });
        if (!attendee) {
            throw new Error("User not found.");
        }
        if (!attendee.attendeeProfile) {
            throw new Error("Attendee profile not found.");
        }
        const registrations = await prisma_1.prisma.registration.findMany({
            where: {
                eventId,
                userId: { not: userId },
            },
            include: {
                user: {
                    include: {
                        attendeeProfile: true,
                    },
                },
            },
        });
        const existingConnections = await prisma_1.prisma.connection.findMany({
            where: {
                OR: [
                    { requesterId: userId },
                    { receiverId: userId },
                ],
            },
        });
        const excludedUserIds = new Set();
        for (const connection of existingConnections) {
            excludedUserIds.add(connection.requesterId === userId
                ? connection.receiverId
                : connection.requesterId);
        }
        const me = networking_mapper_1.NetworkingMapper.toNetworkingProfile(attendee);
        const matches = registrations
            .map((registration) => registration.user)
            .filter((candidate) => candidate.attendeeProfile !== null &&
            !excludedUserIds.has(candidate.id))
            .map((candidate) => {
            const profile = networking_mapper_1.NetworkingMapper.toNetworkingProfile(candidate);
            const evaluation = this.matcher.evaluate(me, profile);
            return networking_mapper_1.NetworkingMapper.toMatchCard(profile, evaluation);
        })
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.min(Math.max(limit, 1), 50));
        try {
            const explanations = await this.ai.generateExplanations(me, matches);
            const explanationMap = new Map(explanations.map((item) => [
                item.userId,
                item.explanation,
            ]));
            return matches.map((match) => ({
                ...match,
                explanation: explanationMap.get(match.userId) ??
                    "This attendee appears to be a strong professional connection based on your shared background and networking goals.",
            }));
        }
        catch (error) {
            console.error("Failed to generate networking explanations:", error);
            return matches;
        }
    }
    // ============================================
    // GET PROFILE
    // ============================================
    async getProfile(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: { attendeeProfile: true },
        });
        if (!user) {
            throw new Error("User not found.");
        }
        return user.attendeeProfile;
    }
    // ============================================
    // UPDATE PROFILE
    // ============================================
    async updateProfile(userId, input) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user) {
            throw new Error("User not found.");
        }
        const data = {};
        if (input.profession !== undefined) {
            data.profession = input.profession;
        }
        if (input.industry !== undefined) {
            data.industry = input.industry;
        }
        if (input.company !== undefined) {
            data.company = input.company;
        }
        if (input.jobTitle !== undefined) {
            data.jobTitle = input.jobTitle;
        }
        if (input.goals !== undefined) {
            data.goals =
                input.goals === null
                    ? client_1.Prisma.JsonNull
                    : input.goals;
        }
        if (input.skills !== undefined) {
            data.skills =
                input.skills === null
                    ? client_1.Prisma.JsonNull
                    : input.skills;
        }
        if (input.linkedin !== undefined) {
            data.linkedin = input.linkedin;
        }
        if (input.bio !== undefined) {
            data.bio = input.bio;
        }
        return prisma_1.prisma.attendeeProfile.upsert({
            where: { userId },
            create: {
                user: {
                    connect: { id: userId },
                },
                profession: input.profession ?? null,
                industry: input.industry ?? null,
                company: input.company ?? null,
                jobTitle: input.jobTitle ?? null,
                goals: input.goals === undefined || input.goals === null
                    ? client_1.Prisma.JsonNull
                    : input.goals,
                skills: input.skills === undefined || input.skills === null
                    ? client_1.Prisma.JsonNull
                    : input.skills,
                linkedin: input.linkedin ?? null,
                bio: input.bio ?? null,
            },
            update: data,
        });
    }
    // ============================================
    // SEND REQUEST
    // ============================================
    async sendRequest(requesterId, receiverId, eventId, message) {
        if (requesterId === receiverId) {
            throw new Error("You cannot connect with yourself.");
        }
        await this.assertNetworkingEligibility(requesterId, eventId);
        await this.assertNetworkingEligibility(receiverId, eventId);
        const receiver = await prisma_1.prisma.user.findUnique({
            where: { id: receiverId },
            select: { id: true },
        });
        if (!receiver) {
            throw new Error("Receiver not found.");
        }
        const existing = await prisma_1.prisma.connection.findFirst({
            where: {
                OR: [
                    {
                        requesterId,
                        receiverId,
                    },
                    {
                        requesterId: receiverId,
                        receiverId: requesterId,
                    },
                ],
            },
        });
        if (existing) {
            throw new Error(existing.accepted
                ? "You are already connected."
                : "A connection request already exists.");
        }
        const request = await prisma_1.prisma.connection.create({
            data: {
                requesterId,
                receiverId,
                eventId,
                message: message?.trim() || null,
                accepted: false,
                status: "PENDING",
            },
        });
        await prisma_1.prisma.notification.create({
            data: {
                userId: receiverId,
                title: "New networking request",
                body: message?.trim()
                    ? message.trim()
                    : "Someone wants to connect with you.",
            },
        });
        return request;
    }
    // ============================================
    // ACCEPT REQUEST
    // ============================================
    async acceptRequest(userId, requestId) {
        const request = await prisma_1.prisma.connection.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new Error("Connection request not found.");
        }
        if (request.receiverId !== userId) {
            throw new Error("You are not authorized to accept this request.");
        }
        if (request.accepted || request.status === "ACCEPTED") {
            throw new Error("Request has already been accepted.");
        }
        if (request.status !== "PENDING") {
            throw new Error("This request is no longer pending.");
        }
        const connection = await prisma_1.prisma.connection.update({
            where: { id: requestId },
            data: {
                accepted: true,
                status: "ACCEPTED",
                acceptedAt: new Date(),
            },
        });
        await prisma_1.prisma.notification.create({
            data: {
                userId: request.requesterId,
                title: "Connection request accepted",
                body: "Your networking request has been accepted.",
            },
        });
        return connection;
    }
    // ============================================
    // REJECT REQUEST
    // ============================================
    async rejectRequest(userId, requestId) {
        const request = await prisma_1.prisma.connection.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new Error("Connection request not found.");
        }
        if (request.receiverId !== userId) {
            throw new Error("You are not authorized to reject this request.");
        }
        if (request.status !== "PENDING") {
            throw new Error("This request is no longer pending.");
        }
        return prisma_1.prisma.connection.update({
            where: { id: requestId },
            data: {
                accepted: false,
                status: "REJECTED",
                rejectedAt: new Date(),
            },
        });
    }
    // ============================================
    // CANCEL REQUEST
    // ============================================
    async cancelRequest(userId, requestId) {
        const request = await prisma_1.prisma.connection.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new Error("Connection request not found.");
        }
        if (request.requesterId !== userId) {
            throw new Error("You are not authorized to cancel this request.");
        }
        if (request.status !== "PENDING") {
            throw new Error("This request is no longer pending.");
        }
        return prisma_1.prisma.connection.update({
            where: { id: requestId },
            data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
            },
        });
    }
    // ============================================
    // INCOMING REQUESTS
    // ============================================
    async getIncomingRequests(userId) {
        const requests = await prisma_1.prisma.connection.findMany({
            where: {
                receiverId: userId,
                status: "PENDING",
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        const requesterIds = requests.map((request) => request.requesterId);
        const users = await prisma_1.prisma.user.findMany({
            where: {
                id: { in: requesterIds },
            },
            include: {
                attendeeProfile: true,
            },
        });
        const userMap = new Map(users.map((user) => [user.id, user]));
        return requests.map((request) => ({
            ...request,
            requester: userMap.get(request.requesterId) ?? null,
        }));
    }
    // ============================================
    // OUTGOING REQUESTS
    // ============================================
    async getOutgoingRequests(userId) {
        const requests = await prisma_1.prisma.connection.findMany({
            where: {
                requesterId: userId,
                status: "PENDING",
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        const receiverIds = requests.map((request) => request.receiverId);
        const users = await prisma_1.prisma.user.findMany({
            where: {
                id: { in: receiverIds },
            },
            include: {
                attendeeProfile: true,
            },
        });
        const userMap = new Map(users.map((user) => [user.id, user]));
        return requests.map((request) => ({
            ...request,
            receiver: userMap.get(request.receiverId) ?? null,
        }));
    }
    // ============================================
    // ACCEPTED CONNECTIONS
    // ============================================
    async getConnections(userId) {
        const connections = await prisma_1.prisma.connection.findMany({
            where: {
                accepted: true,
                status: "ACCEPTED",
                OR: [
                    { requesterId: userId },
                    { receiverId: userId },
                ],
            },
            orderBy: {
                acceptedAt: "desc",
            },
        });
        const otherUserIds = connections.map((connection) => connection.requesterId === userId
            ? connection.receiverId
            : connection.requesterId);
        const users = await prisma_1.prisma.user.findMany({
            where: {
                id: { in: otherUserIds },
            },
            include: {
                attendeeProfile: true,
            },
        });
        const userMap = new Map(users.map((user) => [user.id, user]));
        return connections.map((connection) => {
            const otherUserId = connection.requesterId === userId
                ? connection.receiverId
                : connection.requesterId;
            return {
                ...connection,
                user: userMap.get(otherUserId) ?? null,
            };
        });
    }
    // ============================================
    // REMOVE CONNECTION
    // ============================================
    async removeConnection(userId, connectionId) {
        const connection = await prisma_1.prisma.connection.findUnique({
            where: { id: connectionId },
        });
        if (!connection) {
            throw new Error("Connection not found.");
        }
        if (connection.requesterId !== userId &&
            connection.receiverId !== userId) {
            throw new Error("You are not authorized to remove this connection.");
        }
        if (!connection.accepted) {
            throw new Error("This is not an accepted connection.");
        }
        await prisma_1.prisma.connection.delete({
            where: { id: connectionId },
        });
    }
}
exports.NetworkingService = NetworkingService;
