import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Slider from "@react-native-community/slider";
// @ts-expect-error
import { Entypo } from "react-native-vector-icons";
import { useAudioPlayer, AudioSource } from "expo-audio";
import { documentDirectory, createDownloadResumable } from "expo-file-system/legacy";
import UUID from "react-native-uuid";

const RecordingPlayer = ({
  uri,
  currentUri,
  setCurrentUri,
}: {
  uri: string;
  currentUri: string;
  setCurrentUri: any;
}) => {
  const [file, setFile] = useState<string | undefined>(undefined);
  const audioPlayer = useAudioPlayer(file || "");
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(0);
  const [position, setPosition] = useState(0);

  const loadAudio = async () => {
    try {
      const docDir = documentDirectory;
      if (!docDir) {
        console.error("Error loading audio: Document directory is undefined");
        return;
      }
      
      const downloadResumable = createDownloadResumable(
        uri,
        docDir + `${UUID.v4()}.mp4`,
        { cache: true }
      );

      const newFile = await downloadResumable.downloadAsync();

      if (newFile) {
        setFile(newFile.uri);
        audioPlayer.replace(newFile.uri);
      } else {
        console.error("Error loading audio: File is undefined");
      }
    } catch (error) {
      console.error("Error loading audio:", error);
    }
  };

  const unloadAudio = async () => {
    setFile(undefined);
    audioPlayer.pause();
    setPosition(0);
    setPlaying(false);
  };

  useEffect(() => {
    if (currentUri === uri) {
      loadAudio();
    } else {
      unloadAudio();
    }
  }, [currentUri]);

  // Monitor playback progress
  useEffect(() => {
    if (audioPlayer.playing && currentUri === uri) {
      const interval = setInterval(() => {
        setPosition(audioPlayer.currentTime * 1000);
        if (audioPlayer.duration) {
          setDuration(audioPlayer.duration * 1000);
        }
        
        // Check if finished
        if (audioPlayer.currentTime >= (audioPlayer.duration || 0)) {
          setPosition(0);
          setPlaying(false);
          audioPlayer.pause();
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [audioPlayer.playing, currentUri]);

  const pausePlay = async () => {
    if (currentUri !== uri) {
      setCurrentUri(uri);
      return;
    }

    if (playing) {
      audioPlayer.pause();
      setPlaying(false);
    } else {
      audioPlayer.play();
      setPlaying(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.playContainer}>
        <TouchableOpacity onPress={pausePlay} style={styles.button}>
          <Entypo
            name={playing ? "controller-stop" : "controller-play"}
            size={25}
          />
        </TouchableOpacity>
        <Slider
          style={{ width: 200, height: 40 }}
          minimumValue={0}
          maximumValue={duration || 0}
          value={position}
          onValueChange={(value) => {
            setPosition(value);
            audioPlayer.seekTo(value / 1000);
          }}
          minimumTrackTintColor="#000"
          maximumTrackTintColor="#A2A2A2"
        />
      </View>
      <View style={styles.timeContainer}>
        <Text>{formatTime(position)}</Text>
        <Text>{duration ? formatTime(duration - position) : "--"}</Text>
      </View>
    </View>
  );
};

export default RecordingPlayer;

const formatTime = (time: number) => {
  const seconds = Math.floor(time / 1000);
  return seconds + "s";
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  playContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  button: {
    paddingRight: 5,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
