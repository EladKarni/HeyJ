import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  PANEL_COLLAPSED: '@HeyJ:panelSettings:collapsed',
};

const DEFAULTS = {
  PANEL_COLLAPSED: false,
};

export class PanelSettingsStorage {
  /**
   * Load panel collapsed state from storage
   * @returns Promise<boolean> - panel collapsed state (default: false)
   */
  static async getPanelCollapsed(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.PANEL_COLLAPSED);
      if (value === null) {
        return DEFAULTS.PANEL_COLLAPSED;
      }
      const parsed = JSON.parse(value);
      // JSON.parse should return a boolean, but ensure it's actually a boolean
      if (typeof parsed === 'boolean') {
        return parsed;
      }
      // Fallback: convert to boolean if somehow it's not
      return parsed === true || parsed === 'true';
    } catch (error) {
      console.error('Error loading panel collapsed setting:', error);
      return DEFAULTS.PANEL_COLLAPSED;
    }
  }

  /**
   * Save panel collapsed state to storage
   * @param collapsed - panel collapsed state
   */
  static async setPanelCollapsed(collapsed: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PANEL_COLLAPSED, JSON.stringify(collapsed));
    } catch (error) {
      console.error('Error saving panel collapsed setting:', error);
    }
  }
}
