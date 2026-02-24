import { useAuthStore } from '../store/authStore';

const API_BASE = "https://yikuei.com/api";

/**
 * 通用的 API 請求工具，會自動尋找並帶上 zustand 中的 Bearer Token
 * @param {string} endpoint - API 網址，如 '/auth/google'
 * @param {object} options - fetch 的選項設定
 * @returns {Promise<Response>} 
 */
export async function fetchAPI(endpoint, options = {}) {
    // 取得當前全域 Token
    const token = useAuthStore.getState().token;

    // 如果傳入的 url 沒包含 http，就自動加上 API_BASE
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // 如果有 Token，自動帶入 Authorization header
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    return fetch(url, config);
}

export { API_BASE };
