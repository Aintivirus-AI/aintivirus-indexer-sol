export type ProgramIds = {
  factory: string;
  mixer: string;
  staking: string;
  payment: string;
};

export type IndexedEventRow = {
  programId: string;
  signature: string;
  slot: number;
  blockTime: number | null;
  txIndex: number | null;
  outerInstructionIndex: number;
  innerInstructionIndex: number;
  eventType: string;
  payload: Record<string, unknown>;
  status: "processed" | "confirmed" | "finalized";
};
