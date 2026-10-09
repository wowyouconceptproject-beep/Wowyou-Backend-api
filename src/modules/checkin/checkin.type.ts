export interface CheckInInput {
  token: string;

  scanType:
    | "QR"
    | "NFC"
    | "MANUAL";

  station?: string;

  deviceId?: string;

  staffId: string;
}

export interface CheckInResult {
  success: boolean;

  alreadyCheckedIn: boolean;

  attendee: any;

  purchase: any;

  pass: any;

  event: any;

  checkIn?: any;

  capacity?: {
    currentOccupancy: number;

    totalCheckIns: number;

    totalCheckOuts: number;

    occupancyPercentage: number;
  };
}