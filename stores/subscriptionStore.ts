// Zustand store — подписка и IAP
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Subscription } from '@/types';

interface SubscriptionState {
  subscription: Subscription;
  isPaywallVisible: boolean;
  isLoading: boolean;

  setSubscription: (sub: Subscription) => void;
  showPaywall: () => void;
  hidePaywall: () => void;
  setLoading: (loading: boolean) => void;
  isPremium: () => boolean;
  isPremiumPlus: () => boolean;
}

const DEFAULT_SUB: Subscription = {
  tier: 'free',
  status: 'active',
};

export const useSubscriptionStore = create<SubscriptionState>()(
  immer((set, get) => ({
    subscription: DEFAULT_SUB,
    isPaywallVisible: false,
    isLoading: false,

    setSubscription: (sub) => {
      set((state) => { state.subscription = sub; });
    },

    showPaywall: () => {
      set((state) => { state.isPaywallVisible = true; });
    },

    hidePaywall: () => {
      set((state) => { state.isPaywallVisible = false; });
    },

    setLoading: (loading) => {
      set((state) => { state.isLoading = loading; });
    },

    isPremium: () => {
      const { tier, status } = get().subscription;
      return status === 'active' && (tier === 'premium' || tier === 'premium_plus');
    },

    isPremiumPlus: () => {
      const { tier, status } = get().subscription;
      return status === 'active' && tier === 'premium_plus';
    },
  }))
);
