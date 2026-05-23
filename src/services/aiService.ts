import { aiApi } from './api';

export interface AiChatRequest {
  caseId: number;
  caseDetails?: string;
  history: { role: string; text: string }[];
}

export interface AiChatResponse {
  answer: string;
}

export const aiService = {
  askQuestion: async (data: AiChatRequest): Promise<string> => {
    try {
      const response = await aiApi.post<AiChatResponse>('/aichat/ask', data);
      return response.data.answer;
    } catch (error: any) {
      console.error('Error querying AI:', error);
      throw error.response?.data || 'Failed to communicate with AI Service';
    }
  }
};
