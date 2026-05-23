import type { AxiosInstance } from 'axios';

export interface Associate {
  Id: number;
  FullName: string;
  Email: string;
  EnrollmentNumber?: string;
  Specialization: string;
  FirmBio?: string;
}

export interface FirmMembers {
  senior?: Associate;
  associates: Associate[];
}

export interface AddJuniorDto {
  email: string;
  fullName: string;
  enrollmentNumber: string;
  specialization: string;
  temporaryPassword?: string;
}

export const firmService = {
  getMyAssociates: async (axiosPrivate: AxiosInstance): Promise<FirmMembers> => {
    const response = await axiosPrivate.get<FirmMembers>('/senior/associates');
    return response.data;
  },

  addJuniorAssociate: async (axiosPrivate: AxiosInstance, data: AddJuniorDto): Promise<{ message: string }> => {
    if (!data.temporaryPassword) {
        data.temporaryPassword = 'Password123!';
    }
    const response = await axiosPrivate.post('/senior/add-junior', data);
    return response.data;
  },

  updateFirmBio: async (axiosPrivate: AxiosInstance, bio: string): Promise<{ message: string }> => {
    const response = await axiosPrivate.put('/senior/firm-bio', JSON.stringify(bio), {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  getFirmProfile: async (axiosPrivate: AxiosInstance): Promise<{ fullName: string, email: string, firmBio: string }> => {
    const response = await axiosPrivate.get('/User/Profile');
    return response.data;
  },

  removeJuniorAssociate: async (axiosPrivate: AxiosInstance, juniorId: number): Promise<{ message: string }> => {
    const response = await axiosPrivate.delete(`/senior/remove-junior/${juniorId}`);
    return response.data;
  }
};

export default firmService;
