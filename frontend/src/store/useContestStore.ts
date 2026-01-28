import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { Node, ContestConfig } from '../types';

interface ContestStore {
    isAdmin: boolean;
    adminToken: string | null;
    contestConfig: ContestConfig | null;
    nodes: Node[];

    setAdminToken: (token: string) => void;
    checkAdminAuth: () => Promise<boolean>;
    fetchConfig: () => Promise<void>;
    fetchGraph: () => Promise<void>;
}

export const useContestStore = create<ContestStore>((set, get) => ({
    isAdmin: false,
    adminToken: localStorage.getItem('adminToken'),
    contestConfig: null,
    nodes: [],

    setAdminToken: (token: string) => {
        localStorage.setItem('adminToken', token);
        set({ adminToken: token, isAdmin: true });
    },

    checkAdminAuth: async () => {
        try {
            if (!get().adminToken) return false;
            await apiClient.get('/admin/status');
            set({ isAdmin: true });
            return true;
        } catch {
            set({ isAdmin: false, adminToken: null });
            localStorage.removeItem('adminToken');
            return false;
        }
    },

    fetchConfig: async () => {
        try {
            const res = await apiClient.get('/admin/status');
            set({ contestConfig: res.data.contest });
        } catch (e) {
            console.error("Failed to fetch config", e);
        }
    },

    fetchGraph: async () => {
        try {
            const res = await apiClient.get('/admin/graph');
            set({ nodes: res.data.nodes });
        } catch (e) {
            console.error("Failed to fetch graph", e);
        }
    }
}));
