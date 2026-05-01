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
}
