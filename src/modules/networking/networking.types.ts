export interface MatchReason {
  code: string;
  message: string;
  weight: number;
}

export interface NetworkingProfile {
  id: string;

  firstName: string;
  lastName: string;

  profession?: string;
  industry?: string;
  company?: string;
  jobTitle?: string;

  bio?: string;

  skills: string[];
  goals: string[];

  linkedin?: string;
  avatar?: string;
}

export interface MatchEvaluation {
  score: number;
  reasons: MatchReason[];
}

export interface MatchCard {
  userId: string;

  firstName: string;
  lastName: string;

  profession?: string;
  company?: string;
  jobTitle?: string;

  avatar?: string;

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