import { casesApi } from './api';
import type { Case } from '../types/case.types';

export const caseService = {
  getOpenCases: async (): Promise<Case[]> => {
    const response = await casesApi.get<Case[]>('/marketplace/cases');
    return response.data;
  },

  getCaseById: async (id: number): Promise<Case> => {
    const response = await casesApi.get<Case>(`/marketplace/cases/${id}`);
    return response.data;
  },

  claimCase: async (id: number): Promise<{ message: string; success: boolean }> => {
    const response = await casesApi.put(`/marketplace/cases/${id}/claim`);
    return response.data;
  },

  getClientCases: async (): Promise<Case[]> => {
    const response = await casesApi.get<Case[]>('/v1/client/get-cases');
    return response.data;
  }
};

export default caseService;
