import axios from "axios";
import type { AxiosRequestConfig } from "axios";

export interface ApiError {
  status: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const customFetch = async <TResponse>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<TResponse> => {
  try {
    const response = await axiosInstance.request<TResponse>({ ...config, ...options });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data as Partial<ApiError> | undefined;
      const apiError: ApiError = {
        status: error.response?.status ?? 0,
        title: body?.title ?? error.message,
        detail: body?.detail,
        errors: body?.errors,
      };
      throw apiError;
    }
    throw error;
  }
};
