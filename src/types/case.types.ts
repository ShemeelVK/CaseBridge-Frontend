export interface CaseDocument {
  id: number;
  fileName: string;
  fileUrl: string;
}

export interface Case {
  id: number;
  clientId: number;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: string;
  assignedFirmId?: number;
  acceptedByUserid?: number;
  clientName?: string;
  lawyerName?: string;
  createdAt?: string;
  lastModifiedByUserId: number;
  aiSummary?: string;
  documents?: CaseDocument[]; // Only present on authenticated dashboard endpoints
}
