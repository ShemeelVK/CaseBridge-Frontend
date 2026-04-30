export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  role: string;
  firmBio?: string;
  seniorLawyerId?: number;
}

export interface Associate {
  id: number;
  email: string;
  fullName: string;
  enrollmentNumber: string;
  specialization: string;
}
