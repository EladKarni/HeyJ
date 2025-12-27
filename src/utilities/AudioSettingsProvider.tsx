import React, { createContext, useContext, useState, useEffect } from "react";
import { AudioSettingsStorage } from "./AudioSettingsStorage";
import AppLogger from "@/utilities/AppLogger";

interface AudioSettingsContextType {
  speakerMode: boolean;
  setSpeakerMode: (enabled: boolean) => void;
  toggleSpeakerMode: () => void;
  autoplay: boolean;
  setAutoplay: (enabled: boolean) => void;
  toggleAutoplay: () => void;
}

const AudioSettingsContext = createContext<AudioSettingsContextType | null>(null);

export const AudioSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [speakerMode, setSpeakerModeState] = useState(false);
  const [autoplay, setAutoplayState] = useState(true);

  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        AppLogger.debug('[AudioSettingsProvider] Loading settings from storage...');
        const settings = await AudioSettingsStorage.getAllSettings();
        AppLogger.debug('[AudioSettingsProvider] Loaded settings:', settings);
        AppLogger.debug('[AudioSettingsProvider] ✅ AUTOPLAY VALUE:', settings.autoplay, 'TYPE:', typeof settings.autoplay);
        setSpeakerModeState(settings.speakerMode);
        setAutoplayState(settings.autoplay);
      } catch (error) {
        AppLogger.error('Error loading audio settings:', error);
        // Keep defaults if loading fails
      }
    };

    loadSettings();
  }, []);

  // Wrapper functions that save to storage
  const setSpeakerMode = (enabled: boolean) => {
    setSpeakerModeState(enabled);
    AudioSettingsStorage.setSpeakerMode(enabled).catch((error) => {
      AppLogger.error('Error saving speaker mode:', error);
    });
  };

  const setAutoplay = (enabled: boolean) => {
    setAutoplayState(enabled);
    AudioSettingsStorage.setAutoplay(enabled).catch((error) => {
      AppLogger.error('Error saving autoplay:', error);
    });
  };

  const toggleSpeakerMode = () => {
    setSpeakerModeState((prev) => {
      const newValue = !prev;
      AudioSettingsStorage.setSpeakerMode(newValue).catch((error) => {
        AppLogger.error('Error saving speaker mode:', error);
      });
      return newValue;
    });
  };

  const toggleAutoplay = () => {
    setAutoplayState((prev) => {
      const newValue = !prev;
      AppLogger.debug('[AudioSettingsProvider] toggleAutoplay - toggling from', prev, 'to', newValue);
      AudioSettingsStorage.setAutoplay(newValue).catch((error) => {
        AppLogger.error('Error saving autoplay:', error);
      });
      return newValue;
    });
  };

  return (
    <AudioSettingsContext.Provider
      value={{
        speakerMode,
        setSpeakerMode,
        toggleSpeakerMode,
        autoplay,
        setAutoplay,
        toggleAutoplay,
      }}
    >
      {children}
    </AudioSettingsContext.Provider>
  );
};

export const useAudioSettings = () => {
  const context = useContext(AudioSettingsContext);
  if (!context) {
    throw new Error("useAudioSettings must be used within an AudioSettingsProvider");
  }
  return context;
};

