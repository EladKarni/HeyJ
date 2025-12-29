import { create } from "zustand";
import { PanelSettingsStorage } from "@utilities/PanelSettingsStorage";
import AppLogger from "@/utilities/AppLogger";

interface PanelState {
  isCollapsed: boolean;
  isLoading: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  loadPanelState: () => Promise<void>;
}

export const usePanelStateStore = create<PanelState>((set, get) => ({
  isCollapsed: false,
  isLoading: true,

  setIsCollapsed: async (collapsed: boolean) => {
    set({ isCollapsed: collapsed });
    // Save to storage
    await PanelSettingsStorage.setPanelCollapsed(collapsed);
  },

  loadPanelState: async () => {
    try {
      const savedCollapsed = await PanelSettingsStorage.getPanelCollapsed();
      set({ isCollapsed: savedCollapsed, isLoading: false });
    } catch (error) {
      AppLogger.error("Error loading panel state:", error);
      set({ isLoading: false });
    }
  },
}));
