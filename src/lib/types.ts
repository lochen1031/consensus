export interface UserProfile {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  points: number;
  createdAt: number;
  lastDailyClaim?: number | null;
}

export interface Prediction {
  id: string;
  creatorId: string;
  title: string;
  deadline: number;
  criteria: string;
  status: 'active' | 'judging' | 'resolved';
  result: 'yes' | 'no' | null;
  reason: string | null;
  totalPool: {
    yes: number;
    no: number;
  };
  createdAt: number;
}

export interface Bet {
  id: string;
  predictionId: string;
  userId: string;
  option: 'yes' | 'no';
  amount: number;
  createdAt: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
