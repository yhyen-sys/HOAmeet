import { create } from 'zustand'

export const useAuthStore = create((set, get) => {
    const initToken = localStorage.getItem('hoa_token') || null;
    const initUser = JSON.parse(localStorage.getItem('hoa_user') || 'null');

    return {
        token: initToken,
        user: initUser,
        isAuth: !!initToken,

        login: (token, user) => {
            localStorage.setItem('hoa_token', token);
            localStorage.setItem('hoa_user', JSON.stringify(user));
            set({ token, user, isAuth: true });
        },

        logout: () => {
            localStorage.removeItem('hoa_token');
            localStorage.removeItem('hoa_user');
            set({ token: null, user: null, isAuth: false });
        },

        hasAdminRights: () => {
            const { user } = get();
            return user && (user.global_role === 'creator' || user.global_role === 'super_admin');
        },

        isSuperAdmin: () => {
            const { user } = get();
            return user && user.global_role === 'super_admin';
        }
    };
});
