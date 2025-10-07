import axios, { AxiosInstance, AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config";

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Attach tokens before each request
    this.client.interceptors.request.use(
      async (config) => {
        if (!this.accessToken) {
          this.accessToken = await SecureStore.getItemAsync("access_token");
        }

        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Attempt token refresh on 401 responses
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            if (newAccessToken) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            await this.logout();
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    await SecureStore.setItemAsync("access_token", accessToken);
    await SecureStore.setItemAsync("refresh_token", refreshToken);
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      this.refreshToken = await SecureStore.getItemAsync("refresh_token");
    }

    if (!this.refreshToken) {
      return null;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: this.refreshToken,
      });

      const { access_token } = response.data;
      this.accessToken = access_token;
      await SecureStore.setItemAsync("access_token", access_token);

      return access_token;
    } catch {
      return null;
    }
  }

  // Auth endpoints
  async login(email: string, password: string, totpCode?: string) {
    const response = await this.client.post("/auth/login", {
      email,
      password,
      totp_code: totpCode,
    });
    return response.data;
  }

  async logout() {
    try {
      await this.client.post("/auth/logout", {
        refresh_token: this.refreshToken,
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await this.clearTokens();
    }
  }

  // Flight entries endpoints
  async getEntries(params?: {
    status?: string;
    page?: number;
    per_page?: number;
  }) {
    const response = await this.client.get("/pilots/me/entries", { params });
    return response.data;
  }

  async getEntry(id: number) {
    const response = await this.client.get(`/pilots/me/entries/${id}`);
    return response.data;
  }

  async createEntry(entry: any) {
    const response = await this.client.post("/pilots/me/entries", { entry });
    return response.data;
  }

  async updateEntry(id: number, entry: any) {
    const response = await this.client.patch(`/pilots/me/entries/${id}`, {
      entry,
    });
    return response.data;
  }

  async deleteEntry(id: number) {
    await this.client.delete(`/pilots/me/entries/${id}`);
  }

  async submitEntry(id: number, organizationId: number) {
    const response = await this.client.post(`/pilots/me/entries/${id}/submit`, {
      organization_id: organizationId,
    });
    return response.data;
  }

  async syncEntries(entries: any[]) {
    const response = await this.client.post("/pilots/me/entries/sync", {
      entries,
    });
    return response.data;
  }

  // File upload
  async uploadAttachment(uri: string, filename: string) {
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: filename,
      type: "image/jpeg",
    } as any);

    const response = await this.client.post("/uploads", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  }
}

export default new ApiClient();
