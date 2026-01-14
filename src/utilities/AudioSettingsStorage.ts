import AsyncStorage from "@react-native-async-storage/async-storage";
import AppLogger from "@/utilities/AppLogger";

const STORAGE_KEYS = {
  AUTOPLAY: "@HeyJ:audioSettings:autoplay",
  SPEAKER_MODE: "@HeyJ:audioSettings:speakerMode",
};

const DEFAULTS = {
  AUTOPLAY: true,
  SPEAKER_MODE: false,
};

export class AudioSettingsStorage {
  /**
   * Load autoplay setting from storage
   * @returns Promise<boolean> - autoplay setting (default: true)
   */
  static async getAutoplay(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.AUTOPLAY);
      AppLogger.debug("[AudioSettingsStorage] getAutoplay - raw value:", value);
      if (value === null) {
        AppLogger.debug(
          "[AudioSettingsStorage] getAutoplay - no stored value, using default:",
          DEFAULTS.AUTOPLAY
        );
        return DEFAULTS.AUTOPLAY;
      }
      const parsed = JSON.parse(value);
      AppLogger.debug(
        "[AudioSettingsStorage] getAutoplay - parsed value:",
        parsed,
        "type:",
        typeof parsed
      );
      // JSON.parse should return a boolean, but ensure it's actually a boolean
      if (typeof parsed === "boolean") {
        return parsed;
      }
      // Fallback: convert to boolean if somehow it's not
      return parsed === true || parsed === "true";
    } catch (error) {
      AppLogger.error("Error loading autoplay setting:", error);
      return DEFAULTS.AUTOPLAY;
    }
  }

  /**
   * Load speaker mode setting from storage
   * @returns Promise<boolean> - speaker mode setting (default: false)
   */
  static async getSpeakerMode(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.SPEAKER_MODE);
      if (value === null) {
        return DEFAULTS.SPEAKER_MODE;
      }
      const parsed = JSON.parse(value);
      // JSON.parse should return a boolean, but ensure it's actually a boolean
      if (typeof parsed === "boolean") {
        return parsed;
      }
      // Fallback: convert to boolean if somehow it's not
      return parsed === true || parsed === "true";
    } catch (error) {
      AppLogger.error("Error loading speaker mode setting:", error);
      return DEFAULTS.SPEAKER_MODE;
    }
  }

  /**
   * Save autoplay setting to storage
   * @param enabled - autoplay enabled state
   */
  static async setAutoplay(enabled: boolean): Promise<void> {
    try {
      AppLogger.debug("[AudioSettingsStorage] setAutoplay - saving:", enabled);
      await AsyncStorage.setItem(
        STORAGE_KEYS.AUTOPLAY,
        JSON.stringify(enabled)
      );
      AppLogger.debug(
        "[AudioSettingsStorage] setAutoplay - saved successfully"
      );
    } catch (error) {
      AppLogger.error("Error saving autoplay setting:", error);
    }
  }

  /**
   * Save speaker mode setting to storage
   * @param enabled - speaker mode enabled state
   */
  static async setSpeakerMode(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SPEAKER_MODE,
        JSON.stringify(enabled)
      );
    } catch (error) {
      AppLogger.error("Error saving speaker mode setting:", error);
    }
  }

  /**
   * Load both settings at once
   * @returns Promise with both autoplay and speakerMode settings
   */
  static async getAllSettings(): Promise<{
    autoplay: boolean;
    speakerMode: boolean;
  }> {
    try {
      const [autoplay, speakerMode] = await Promise.all([
        this.getAutoplay(),
        this.getSpeakerMode(),
      ]);
      return { autoplay, speakerMode };
    } catch (error) {
      AppLogger.error("Error loading audio settings:", error);
      return {
        autoplay: DEFAULTS.AUTOPLAY,
        speakerMode: DEFAULTS.SPEAKER_MODE,
      };
    }
  }
}
