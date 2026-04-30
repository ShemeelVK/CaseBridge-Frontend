import { useEffect } from 'react';
import { axiosPrivate } from '../services/api';
import { useAuth } from './useAuth';

const useAxiosPrivate = () => {
    const { accessToken } = useAuth();

    useEffect(() => {
        const requestIntercept = axiosPrivate.interceptors.request.use(
            config => {
                if (!config.headers['Authorization']) {
                    config.headers['Authorization'] = `Bearer ${accessToken}`;
                }
                return config;
            }, (error) => Promise.reject(error)
        );

        return () => {
            axiosPrivate.interceptors.request.eject(requestIntercept);
        }
    }, [accessToken]);

    return axiosPrivate;
}

export default useAxiosPrivate;
