import { Platform } from "react-native";
import AppLogger from "@/utilities/AppLogger";

/**
 * Set audio volume based on speaker mode
 * @param audioPlayer - The audio player instance
 * @param speakerMode - true for higher volume (speaker), false for lower volume (earpiece)
 */
export const setAudioVolume = (
  audioPlayer: any,
  speakerMode: boolean
): void => {
  if (!audioPlayer) {
    return;
  }

  try {
    // Volume range: 0.0 to 1.0
    // Earpiece (default): lower volume (0.2) - like a phone call
    // Speaker mode: higher volume (1.0) - like loudspeaker
    const volume = speakerMode ? 1.0 : 0.2;

    // Check if audioPlayer has volume property (expo-audio AudioPlayer)
    if (audioPlayer && typeof audioPlayer.volume !== "undefined") {
      audioPlayer.volume = volume;
      AppLogger.debug(
        `🔊 Audio volume set to ${volume} (${
          speakerMode ? "speaker" : "earpiece"
        } mode)`
      );
    } else {
      AppLogger.warn("AudioPlayer volume property not available");
    }
  } catch (error) {
    AppLogger.error("Error setting audio volume:", error);
  }
};

/**
 * Set audio output route (legacy function name for compatibility)
 * Now adjusts volume instead of routing audio
 * @param speakerMode - true for higher volume (speaker), false for lower volume (earpiece)
 */
export const setAudioOutputRoute = async (
  speakerMode: boolean
): Promise<void> => {
  // This function is kept for compatibility but now does nothing
  // Volume is set directly on the audioPlayer instance
  // The actual volume setting happens in RecordingPlayer when audioPlayer is available
  AppLogger.debug(
    `🔊 Speaker mode: ${speakerMode ? "ON (high volume)" : "OFF (low volume)"}`
  );
};
