import {
  View,
  StyleSheet,
  Animated,
  Text,
  TouchableOpacity,
  Easing,
  DimensionValue,
  FlatList,
  useWindowDimensions,
  Image,
} from "react-native";
import {
  useAudioRecorder,
  RecordingOptions,
  AudioModule,
  RecordingPresets,
  useAudioRecorderState,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { useProfile } from "../utilities/ProfileProvider";
import ConversationsScreen from "./ConversationsScreen";
import { sendMessage } from "../utilities/SendMessage";
import { useNavigation } from "@react-navigation/native";
import RecordingPanel from "../components/chat/RecordingPanel";

const HomeScreen = () => {
  const navigation = useNavigation();
  const { profile, conversations, profiles } = useProfile();

  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>("");

  const recordingOptions: RecordingOptions = {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      sampleRate: 44100,
    },
    ios: {
      extension: '.m4a',
      audioQuality: 127,
      sampleRate: 44100,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    },
  };


  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recordingAllowed, setRecordingAllowed] = useState("denied");
  const [loudness, setLoudness] = useState<Number[]>(
    Array.from({ length: 20 }, () => 15)
  );

  const animatedWidth = useRef(new Animated.Value(45)).current;
  const animatedHeight = useRef(new Animated.Value(45)).current;
  const animatedRadius = useRef(new Animated.Value(45)).current;

  const [width, setWidth] = useState(45);
  const [height, setHeight] = useState(45);
  const [radius, setRadius] = useState(45);

  useEffect(() => {
    if (profile && selectedConversation) {
      const conversation = conversations.find((c) => c.conversationId === selectedConversation);
      if (conversation) {
        const uid: string = conversation.uids.filter((id) => id !== profile?.uid)[0];
        const otherProfile = profiles.find((p) => p.uid === uid);
        setSelectedRecipientName(otherProfile?.name || "---");
      } else {
        setSelectedRecipientName("");
      }
    } else {
      setSelectedRecipientName("");
    }
  }, [profile, profiles, selectedConversation, conversations]);

  useEffect(() => {
    navigation.addListener("blur", (event) => { });

    requestPermissions();

    const widthListener = animatedWidth.addListener(({ value }) =>
      setWidth(value)
    );
    const heightListener = animatedHeight.addListener(({ value }) =>
      setHeight(value)
    );
    const radiusListener = animatedRadius.addListener(({ value }) =>
      setRadius(value)
    );

    return () => {
      animatedWidth.removeListener(widthListener);
      animatedHeight.removeListener(heightListener);
      animatedRadius.removeListener(radiusListener);
    };
  }, []);

  const requestPermissions = async () => {
    const response = await AudioModule.requestRecordingPermissionsAsync();
    setRecordingAllowed(response.status);
  };

  const startRecording = async () => {
    if (recordingAllowed !== "granted") {
      requestPermissions();
      return;
    }

    if (!selectedConversation) {
      alert("No conversation selected.");
      return;
    }

    try {
      console.log("🎤 Preparing to record...");
      await audioRecorder.prepareToRecordAsync();
      console.log("🎤 Starting recording...");
      await audioRecorder.record();
      console.log("✅ Recording started");

      const widthAnimation = Animated.timing(animatedWidth, {
        toValue: 30,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const heightAnimation = Animated.timing(animatedHeight, {
        toValue: 30,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const radiusAnimation = Animated.timing(animatedRadius, {
        toValue: 10,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const parallelAnimation = Animated.parallel([
        widthAnimation,
        heightAnimation,
        radiusAnimation,
      ]);

      parallelAnimation.start();
    } catch (error) {
      console.error("❌ Error starting recording:", error);
    }
  };

  // Monitor recording metering for waveform visualization
  useEffect(() => {
    if (audioRecorder.isRecording) {
      const interval = setInterval(() => {
        // expo-audio doesn't expose metering directly yet
        // For now, we'll use a simulated waveform
        const randomLoudness = Math.random() * 60 + 15;
        setLoudness((prevLoudness) => [...prevLoudness.slice(-19), randomLoudness]);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [audioRecorder.isRecording]);

  const stopRecording = async () => {
    console.log(selectedConversation, audioRecorder.isRecording)
    if (!selectedConversation || !audioRecorder.isRecording) {
      return;
    }

    try {
      await audioRecorder.stop();
      if (audioRecorder.uri) {
        await sendMessage(
          navigation,
          { profile, conversations },
          audioRecorder.uri,
          selectedConversation
        );
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
    } finally {
      setLoudness(Array.from({ length: 20 }, () => 15));

      const widthAnimation = Animated.timing(animatedWidth, {
        toValue: 45,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const heightAnimation = Animated.timing(animatedHeight, {
        toValue: 45,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const radiusAnimation = Animated.timing(animatedRadius, {
        toValue: 50,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const parallelAnimation = Animated.parallel([
        widthAnimation,
        heightAnimation,
        radiusAnimation,
      ]);

      parallelAnimation.start();
    }
  };

  const styles = Styles(width, height, radius);


  return (
    <View style={styles.container}>
      {profile ? (
        <ConversationsScreen
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
        />
      ) : (
        <View style={styles.container}>
          <Text>Loading...</Text>
        </View>
      )}
      <RecordingPanel
        onPressIn={startRecording}
        onPressOut={stopRecording}
        showTopButtons={true}
        showRecipient={true}
        recipientName={selectedRecipientName}
      />
    </View>
  );
};

export default HomeScreen;

const Styles = (
  buttonWidth: number,
  buttonHeight: number,
  buttonRadius: number
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    timeLabel: {
      paddingTop: 15,
      fontWeight: "600",
    },
  });
