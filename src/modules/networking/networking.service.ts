
import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

import { NetworkingAI } from "./networking.ai";
import { NetworkingMapper } from "./networking.mapper";
import { NetworkingMatcher } from "./networking.matcher";
import { MatchCard } from "./networking.types";

type ProfileUpdateInput = {
  profession?: string | null;
  industry?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  goals?: unknown;
  skills?: unknown;
  linkedin?: string | null;
  bio?: string | null;
};

export class NetworkingService {
  private readonly matcher = new NetworkingMatcher();
  private readonly ai = new NetworkingAI();

  // ============================================
  // NETWORKING ELIGIBILITY
  // ============================================

  private async assertNetworkingEligibility(
    userId: string,
    eventId: string,
  ): Promise<void> {
    const registration = await prisma.registration.findUnique({
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

    const attendee = await prisma.attendee.findUnique({
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

  async getMatches(
    userId: string,
    eventId: string,
    limit = 20,
  ): Promise<MatchCard[]> {
    await this.assertNetworkingEligibility(userId, eventId);

    const attendee = await prisma.user.findUnique({
      where: { id: userId },
      include: { attendeeProfile: true },
    });

    if (!attendee) {
      throw new Error("User not found.");
    }

    if (!attendee.attendeeProfile) {
      throw new Error("Attendee profile not found.");
    }

    const registrations = await prisma.registration.findMany({
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

    const existingConnections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { receiverId: userId },
        ],
      },
    });

    const excludedUserIds = new Set<string>();

    for (const connection of existingConnections) {
      excludedUserIds.add(
        connection.requesterId === userId
          ? connection.receiverId
          : connection.requesterId,
      );
    }

    const me = NetworkingMapper.toNetworkingProfile(attendee);

    const matches = registrations
      .map((registration) => registration.user)
      .filter(
        (candidate) =>
          candidate.attendeeProfile !== null &&
          !excludedUserIds.has(candidate.id),
      )
      .map((candidate) => {
        const profile =
          NetworkingMapper.toNetworkingProfile(candidate);

        const evaluation = this.matcher.evaluate(me, profile);

        return NetworkingMapper.toMatchCard(
          profile,
          evaluation,
        );
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(Math.max(limit, 1), 50));

    try {
      const explanations =
        await this.ai.generateExplanations(me, matches);

      const explanationMap = new Map(
        explanations.map((item) => [
          item.userId,
          item.explanation,
        ]),
      );

      return matches.map((match) => ({
        ...match,
        explanation:
          explanationMap.get(match.userId) ??
          "This attendee appears to be a strong professional connection based on your shared background and networking goals.",
      }));
    } catch (error) {
      console.error(
        "Failed to generate networking explanations:",
        error,
      );

      return matches;
    }
  }

  // ============================================
  // GET PROFILE
  // ============================================

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
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

  async updateProfile(
    userId: string,
    input: ProfileUpdateInput,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    const data: Prisma.AttendeeProfileUpdateInput = {};

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
          ? Prisma.JsonNull
          : (input.goals as Prisma.InputJsonValue);
    }

    if (input.skills !== undefined) {
      data.skills =
        input.skills === null
          ? Prisma.JsonNull
          : (input.skills as Prisma.InputJsonValue);
    }

    if (input.linkedin !== undefined) {
      data.linkedin = input.linkedin;
    }

    if (input.bio !== undefined) {
      data.bio = input.bio;
    }

    return prisma.attendeeProfile.upsert({
      where: { userId },
      create: {
        user: {
          connect: { id: userId },
        },
        profession: input.profession ?? null,
        industry: input.industry ?? null,
        company: input.company ?? null,
        jobTitle: input.jobTitle ?? null,
        goals:
          input.goals === undefined || input.goals === null
            ? Prisma.JsonNull
            : (input.goals as Prisma.InputJsonValue),
        skills:
          input.skills === undefined || input.skills === null
            ? Prisma.JsonNull
            : (input.skills as Prisma.InputJsonValue),
        linkedin: input.linkedin ?? null,
        bio: input.bio ?? null,
      },
      update: data,
    });
  }

  // ============================================
  // SEND REQUEST
  // ============================================

  async sendRequest(
    requesterId: string,
    receiverId: string,
    eventId: string,
    message?: string,
  ) {
    if (requesterId === receiverId) {
      throw new Error("You cannot connect with yourself.");
    }

    await this.assertNetworkingEligibility(
      requesterId,
      eventId,
    );

    await this.assertNetworkingEligibility(
      receiverId,
      eventId,
    );

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      throw new Error("Receiver not found.");
    }

    const existing = await prisma.connection.findFirst({
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
      throw new Error(
        existing.accepted
          ? "You are already connected."
          : "A connection request already exists.",
      );
    }

    const request = await prisma.connection.create({
      data: {
        requesterId,
        receiverId,
        eventId,
        message: message?.trim() || null,
        accepted: false,
        status: "PENDING",
      },
    });

    await prisma.notification.create({
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

  async acceptRequest(
    userId: string,
    requestId: string,
  ) {
    const request = await prisma.connection.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error("Connection request not found.");
    }

    if (request.receiverId !== userId) {
      throw new Error(
        "You are not authorized to accept this request.",
      );
    }

    if (request.accepted || request.status === "ACCEPTED") {
      throw new Error("Request has already been accepted.");
    }

    if (request.status !== "PENDING") {
      throw new Error("This request is no longer pending.");
    }

    const connection = await prisma.connection.update({
      where: { id: requestId },
      data: {
        accepted: true,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    await prisma.notification.create({
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

  async rejectRequest(
    userId: string,
    requestId: string,
  ) {
    const request = await prisma.connection.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error("Connection request not found.");
    }

    if (request.receiverId !== userId) {
      throw new Error(
        "You are not authorized to reject this request.",
      );
    }

    if (request.status !== "PENDING") {
      throw new Error("This request is no longer pending.");
    }

    return prisma.connection.update({
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

  async cancelRequest(
    userId: string,
    requestId: string,
  ) {
    const request = await prisma.connection.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error("Connection request not found.");
    }

    if (request.requesterId !== userId) {
      throw new Error(
        "You are not authorized to cancel this request.",
      );
    }

    if (request.status !== "PENDING") {
      throw new Error("This request is no longer pending.");
    }

    return prisma.connection.update({
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

  async getIncomingRequests(userId: string) {
    const requests = await prisma.connection.findMany({
      where: {
        receiverId: userId,
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const requesterIds = requests.map(
      (request) => request.requesterId,
    );

    const users = await prisma.user.findMany({
      where: {
        id: { in: requesterIds },
      },
      include: {
        attendeeProfile: true,
      },
    });

    const userMap = new Map(
      users.map((user) => [user.id, user]),
    );

    return requests.map((request) => ({
      ...request,
      requester: userMap.get(request.requesterId) ?? null,
    }));
  }

  // ============================================
  // OUTGOING REQUESTS
  // ============================================

  async getOutgoingRequests(userId: string) {
    const requests = await prisma.connection.findMany({
      where: {
        requesterId: userId,
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const receiverIds = requests.map(
      (request) => request.receiverId,
    );

    const users = await prisma.user.findMany({
      where: {
        id: { in: receiverIds },
      },
      include: {
        attendeeProfile: true,
      },
    });

    const userMap = new Map(
      users.map((user) => [user.id, user]),
    );

    return requests.map((request) => ({
      ...request,
      receiver: userMap.get(request.receiverId) ?? null,
    }));
  }

  // ============================================
  // ACCEPTED CONNECTIONS
  // ============================================

  async getConnections(userId: string) {
    const connections = await prisma.connection.findMany({
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

    const otherUserIds = connections.map(
      (connection) =>
        connection.requesterId === userId
          ? connection.receiverId
          : connection.requesterId,
    );

    const users = await prisma.user.findMany({
      where: {
        id: { in: otherUserIds },
      },
      include: {
        attendeeProfile: true,
      },
    });

    const userMap = new Map(
      users.map((user) => [user.id, user]),
    );

    return connections.map((connection) => {
      const otherUserId =
        connection.requesterId === userId
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

  async removeConnection(
    userId: string,
    connectionId: string,
  ): Promise<void> {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error("Connection not found.");
    }

    if (
      connection.requesterId !== userId &&
      connection.receiverId !== userId
    ) {
      throw new Error(
        "You are not authorized to remove this connection.",
      );
    }

    if (!connection.accepted) {
      throw new Error("This is not an accepted connection.");
    }

    await prisma.connection.delete({
      where: { id: connectionId },
    });
  }
}
