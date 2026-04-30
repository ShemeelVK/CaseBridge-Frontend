import type { AxiosInstance } from 'axios';

export interface Associate {
  id: number;
  fullName: string;
  email: string;
  enrollmentNumber: string;
  specialization: string;
}

export interface AddJuniorDto {
  email: string;
  fullName: string;
  enrollmentNumber: string;
  specialization: string;
  temporaryPassword?: string;
}

export const firmService = {
  getMyAssociates: async (axiosPrivate: AxiosInstance): Promise<Associate[]> => {
    const response = await axiosPrivate.get<Associate[]>('/senior/associates');
    return response.data;
  },

  addJuniorAssociate: async (axiosPrivate: AxiosInstance, data: AddJuniorDto): Promise<{ message: string }> => {
    if (!data.temporaryPassword) {
        data.temporaryPassword = 'Password123!';
    }
    const response = await axiosPrivate.post('/senior/add-junior', data);
    return response.data;
  }
};

export default firmService;
