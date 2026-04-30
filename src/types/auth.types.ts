export interface User {
  id: number;
  email: string;
  fullName: string;
  userType: 'Client' | 'Lawyer' | 'Junior';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userType: 'Client' | 'Lawyer' | 'Junior';
  fullName: string;
  email: string;
  id: number;
}

export interface TokenRequest {
  refreshToken: string;
}
