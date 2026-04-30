import api from './api';
import type { AuthResponse, TokenRequest } from '../types/auth.types';

export const authService = {
  login: async (credentials: any): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/user/login', credentials);
    return response.data;
  },

  registerClient: async (data: any): Promise<any> => {
    const response = await api.post('/user/register/client', data);
    return response.data;
  },

  registerLawyer: async (data: any): Promise<any> => {
    const response = await api.post('/user/register/lawyer', data);
    return response.data;
  },

  verifyEmail: async (email: string, token: string): Promise<any> => {
    const response = await api.get(`/user/verify-email?email=${email}&token=${token}`);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<any> => {
    const response = await api.post('/user/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (data: any): Promise<any> => {
    const response = await api.post('/user/reset-password', data);
    return response.data;
  },

  refreshToken: async (data: TokenRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/user/refresh-token', data);
    return response.data;
  },

  googleLogin: async (data: any): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/user/google-login', data);
    return response.data;
  }
};

export default authService;
