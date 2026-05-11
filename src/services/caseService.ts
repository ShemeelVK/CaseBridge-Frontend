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
  },

  postCase: async (data: { title: string; description: string; category: string; budget: number; documentIds?: number[] }): Promise<{ message: string; caseId: number }> => {
    const response = await casesApi.post('/v1/client/post-case', data);
    return response.data;
  },

  uploadDocuments: async (files: File[], onProgress?: (progressEvent: any) => void): Promise<{ documentId: number, url: string, name: string }[]> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await casesApi.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onProgress
    });
    return response.data;
  },

  getFirmCases: async (): Promise<Case[]> => {
    const response = await casesApi.get<Case[]>('/v1/firm/lawyer-cases');
    return response.data;
  },

  getFirmChatCases: async (): Promise<Case[]> => {
    const response = await casesApi.get<Case[]>('/Chat/firm-cases');
    return response.data;
  },

  closeCase: async (id: number): Promise<{ message: string }> => {
    const response = await casesApi.put(`/v1/firm/cases/${id}/close-case`);
    return response.data;
  },

  dropCase: async (id: number): Promise<{ message: string }> => {
    const response = await casesApi.put(`/v1/firm/cases/${id}/drop-case`);
    return response.data;
  },

  getChatHistory: async (caseId: number, roomType: 'internal' | 'external', targetUserId?: number): Promise<any[]> => {
    const url = `/Chat/cases/${caseId}/chat/${roomType}${targetUserId ? `?targetUserId=${targetUserId}` : ''}`;
    const response = await casesApi.get(url);
    return response.data;
  },

  // Authenticated detail endpoints — return documents (not available on public marketplace)
  getClientCaseById: async (caseId: number): Promise<import('../types/case.types').Case> => {
    const response = await casesApi.get(`/v1/client/cases/${caseId}`);
    return response.data;
  },

  getFirmCaseById: async (caseId: number): Promise<import('../types/case.types').Case> => {
    const response = await casesApi.get(`/v1/firm/cases/${caseId}`);
    return response.data;
  },
};

export default caseService;
