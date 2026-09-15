export type PulseState =
  | "CALM"
  | "ACTIVE"
  | "SURGING"
  | "CONGESTED"
  | "CRITICAL";

export type PulseLevel =
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "CRITICAL";

export interface PulseSignal {
  type: string;
  severity: PulseLevel;
  title: string;
  message: string;
}

export interface PulseRecommendation {
  priority: PulseLevel;
  title: string;
  action: string;
}

export interface EventPulse {
  eventId: string;

  state: PulseState;

  score: number;

  confidence: number;

  summary: string;

  generatedAt: string;

  capacity: {
    currentOccupancy: number;
    capacity: number;
    occupancyPercentage: number;
    remaining: number;
  };

  movement: {
    arrivalsLast5Minutes: number;
    arrivalsLast15Minutes: number;

    arrivalsPerMinute: number;

    totalCheckIns: number;
    totalCheckOuts: number;

    netMovement: number;

    direction:
      | "INCREASING"
      | "STABLE"
      | "DECREASING";
  };

  operations: {
    onlineStaff: number;
    activityLast15Minutes: number;
  };

  signals: PulseSignal[];

  recommendations: PulseRecommendation[];
}