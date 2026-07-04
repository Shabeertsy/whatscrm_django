import axios from "axios";
import { tokenService } from "./token";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use((config) => {
    const token = tokenService.getAccess();

    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

async function refreshAccessToken() {
    const refresh = tokenService.getRefresh();

    if (!refresh) {
        throw new Error("No refresh token");
    }

    const response = await axios.post(
        `${BASE_URL}/accounts/login/refresh/`,
        { refresh }
    );

    tokenService.setTokens(
        response.data.access,
        response.data.refresh
    );

    return response.data.access;
}

let isRefreshing = false;
let queue: any[] = [];

apiClient.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status !== 401 ||
            originalRequest._retry
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                queue.push({
                    resolve,
                    reject,
                });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return apiClient(originalRequest);
            }).catch((err) => {
                return Promise.reject(err);
            });
        }

        isRefreshing = true;

        try {
            const access = await refreshAccessToken();

            queue.forEach((p) => p.resolve(access));
            queue = [];

            originalRequest.headers.Authorization = `Bearer ${access}`;
            return apiClient(originalRequest);

        } catch (err) {
            queue.forEach((p) => p.reject(err));
            queue = [];

            tokenService.clear();
            if (window.location.hash !== '#/login') {
                window.location.href = "/#/login";
            }
            return Promise.reject(err);
        } finally {
            isRefreshing = false;
        }
    }
);
