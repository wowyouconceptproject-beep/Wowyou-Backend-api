
export interface MatchReason {
  code: string;
  message: string;
  weight: number;
}

export interface NetworkingProfile {
  id: string;

  firstName: string;
  lastName: string;

  profession?: string | null;
  industry?: string | null;
  company?: string | null;
  jobTitle?: string | null;

  bio?: string | null;

  skills: string[];
  goals: string[];

  linkedin?: string | null;
  avatar?: string | null;
}

export interface MatchEvaluation {
  score: number;
  reasons: MatchReason[];
}

export interface MatchCard {
  userId: string;

  firstName: string;
  lastName: string;

  profession?: string | null;
  company?: string | null;
  jobTitle?: string | null;

  avatar?: string | null;

  score: number;

  reasons: MatchReason[];

  explanation?: string;
}

export interface MatchWeights {
  skills: number;
  goals: number;
  industry: number;
  company: number;
  profession: number;
}

export interface MatchBreakdown {
  skills: number;
  goals: number;
  industry: number;
  company: number;
  profession: number;
}

// ============================================
// NETWORKING REQUEST TYPES
// ============================================

export type NetworkingRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export interface SendNetworkingRequestInput {
  receiverId: string;
  eventId: string;
  message?: string;
}

export interface NetworkingRequest {
  id: string;
  requesterId: string;
  receiverId: string;
  eventId: string;
  message?: string | null;
  status: NetworkingRequestStatus;
  accepted: boolean;
  createdAt: Date;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  cancelledAt?: Date | null;
}

export interface NetworkingConnection {
  id: string;
  requesterId: string;
  receiverId: string;
  eventId: string;
  accepted: boolean;
  status: NetworkingRequestStatus;
  acceptedAt?: Date | null;
  createdAt: Date;
}
