import { create } from "zustand";

interface AudioRecordingState {
  isRecording: boolean;
  recordingAllowed: "granted" | "denied" | "undetermined";
  loudness: number[];
  width: number;
  height: number;
  radius: number;
  setIsRecording: (isRecording: boolean) => void;
  setRecordingAllowed: (status: "granted" | "denied" | "undetermined") => void;
  setLoudness: (loudness: number[]) => void;
  setButtonDimensions: (width: number, height: number, radius: number) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setRadius: (radius: number) => void;
  resetButtonDimensions: () => void;
}

export const useAudioRecordingStore = create<AudioRecordingState>((set) => ({
  isRecording: false,
  recordingAllowed: "undetermined",
  loudness: Array.from({ length: 20 }, () => 15),
  width: 45,
  height: 45,
  radius: 45,

  setIsRecording: (isRecording) => {
    set({ isRecording });
  },

  setRecordingAllowed: (status) => {
    set({ recordingAllowed: status });
  },

  setLoudness: (loudness) => {
    set({ loudness });
  },

  setButtonDimensions: (width, height, radius) => {
    set({ width, height, radius });
  },

  setWidth: (width) => {
    set({ width });
  },

  setHeight: (height) => {
    set({ height });
  },

  setRadius: (radius) => {
    set({ radius });
  },

  resetButtonDimensions: () => {
    set({ width: 45, height: 45, radius: 45 });
  },
}));
