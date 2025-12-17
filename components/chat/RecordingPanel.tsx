import React, { useState, useEffect, useRef } from "react";
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    Animated,
} from "react-native";
import { colors } from "../../styles/theme";
import Profile from "../../objects/Profile";
import TopButtonsRow from "./TopButtonsRow";
import RecipientSelector from "./RecipientSelector";
import WaveformLeft from "./WaveformLeft";
import WaveformRight from "./WaveformRight";

interface RecordingPanelProps {
    onPressIn: () => void;
    onPressOut: () => void;
    disabled?: boolean;
    showTopButtons?: boolean;
    showRecipient?: boolean;
    recipientName?: string;
    friends?: Profile[];
    selectedFriendUid?: string | null;
    onFriendSelected?: (friendUid: string) => void;
    showWaveform?: boolean;
    loudness?: Number[];
    renderLeftWaves?: () => React.ReactElement;
    renderRightWaves?: () => React.ReactElement;
    isRecording?: boolean;
}

const RecordingPanel = ({
    onPressIn,
    onPressOut,
    disabled = false,
    showTopButtons = false,
    showRecipient = false,
    recipientName = "",
    friends = [],
    selectedFriendUid = null,
    onFriendSelected,
    showWaveform = false,
    loudness = Array.from({ length: 20 }, () => 15),
    renderLeftWaves,
    renderRightWaves,
    isRecording = false,
}: RecordingPanelProps) => {
    const windowDimensions = useWindowDimensions();
    const styles = Styles(windowDimensions.width);
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // Animation for pulsing effect when recording
    const pulseAnim = useRef(new Animated.Value(1)).current;
    
    useEffect(() => {
        if (isRecording) {
            // Start pulsing animation
            const pulseAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulseAnimation.start();
            return () => pulseAnimation.stop();
        } else {
            // Reset animation when not recording
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [isRecording, pulseAnim]);


    return (
        <View style={styles.selectionContainer}>
            {showTopButtons && (
                <TopButtonsRow
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    styles={styles}
                />
            )}
            {showWaveform && (
                <View style={styles.recordingContainer}>
                    <View style={styles.waveFormContainer}>
                        {renderLeftWaves ? renderLeftWaves() : (
                            <WaveformLeft
                                loudness={loudness}
                                waveContainerStyle={styles.waveContainer}
                                leftWaveStyle={styles.leftWave}
                            />
                        )}
                        <View style={styles.waveDivider} />
                        {renderRightWaves ? renderRightWaves() : (
                            <WaveformRight rightWaveStyle={styles.rightWave} />
                        )}
                    </View>
                </View>
            )}
            {showRecipient && !isCollapsed && (
                <RecipientSelector
                    recipientName={recipientName}
                    friends={friends}
                    selectedFriendUid={selectedFriendUid}
                    onFriendSelected={onFriendSelected || (() => {})}
                    styles={styles}
                />
            )}
            <Animated.View
                style={[
                    { transform: [{ scale: pulseAnim }] },
                    isRecording && styles.recordingPulseContainer
                ]}
            >
                <TouchableOpacity
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    style={[
                        styles.holdAndSpeakButton,
                        isRecording && styles.holdAndSpeakButtonRecording
                    ]}
                    activeOpacity={0.8}
                    disabled={disabled}
                >
                    {isRecording ? (
                        <View style={styles.recordingContent}>
                            <View style={styles.recordingIndicator} />
                            <Text style={styles.holdAndSpeakTextRecording}>RECORDING...</Text>
                        </View>
                    ) : (
                        <Text style={styles.holdAndSpeakText}>HOLD TO SPEAK</Text>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

export default RecordingPanel;

const Styles = (windowWidth: number) =>
    StyleSheet.create({
        selectionContainer: {
            minHeight: 150,
            width: "100%",
            backgroundColor: colors.backgroundSecondary,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 20,
            shadowColor: colors.black,
            shadowOpacity: 0.3,
            shadowOffset: { width: 2, height: 4 },
            shadowRadius: 6,
            position: "absolute",
            bottom: 1,
            left: 0,
            right: 0,
            borderWidth: 2,
            borderColor: colors.border,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            zIndex: 1000,
            overflow: "visible" as any,
        },
        topButtonRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 15,
            gap: 12,
            width: "100%",
        },
        buttonGroup: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
            flexShrink: 1,
            minWidth: 0,
        },
        buttonCollapsed: {
            height: 35,
        },
        iconCollapsed: {
            fontSize: 14,
            marginBottom: 2,
        },
        speakerButton: {
            flex: 1,
            minWidth: 70,
            height: 60,
            backgroundColor: colors.backgroundTertiary,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            position: "relative",
        },
        speakerButtonActive: {
            backgroundColor: colors.warning,
            borderColor: colors.warning,
        },
        speakerIcon: {
            fontSize: 20,
            color: colors.textSecondary,
            marginBottom: 4,
        },
        speakerIconActive: {
            color: colors.text,
        },
        speakerLabel: {
            fontSize: 10,
            fontWeight: "600",
            color: colors.textSecondary,
            letterSpacing: 0.5,
        },
        speakerLabelActive: {
            color: colors.text,
        },
        speakerIndicator: {
            position: "absolute",
            bottom: 6,
            left: "50%",
            marginLeft: -12,
            width: 24,
            height: 3,
            backgroundColor: colors.white,
            borderRadius: 2,
        },
        autoplayButton: {
            flex: 1,
            minWidth: 70,
            height: 60,
            backgroundColor: colors.backgroundTertiary,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            position: "relative",
        },
        autoplayButtonActive: {
            backgroundColor: colors.warning,
            borderColor: colors.warning,
        },
        autoplayIcon: {
            fontSize: 20,
            color: colors.textSecondary,
            marginBottom: 4,
        },
        autoplayIconActive: {
            color: colors.text,
        },
        autoplayLabel: {
            fontSize: 10,
            fontWeight: "600",
            color: colors.textSecondary,
            letterSpacing: 0.5,
        },
        autoplayLabelActive: {
            color: colors.text,
        },
        autoplayIndicator: {
            position: "absolute",
            bottom: 6,
            left: "50%",
            marginLeft: -12,
            width: 24,
            height: 3,
            backgroundColor: colors.white,
            borderRadius: 2,
        },
        addFriendButton: {
            flex: 1,
            minWidth: 70,
            height: 60,
            backgroundColor: colors.backgroundTertiary,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            position: "relative",
        },
        addFriendIcon: {
            fontSize: 20,
            color: colors.textSecondary,
            marginBottom: 4,
        },
        addFriendLabel: {
            fontSize: 10,
            fontWeight: "600",
            color: colors.textSecondary,
            letterSpacing: 0.5,
        },
        collapseButton: {
            width: 48,
            height: 60,
            backgroundColor: colors.backgroundTertiary,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            flexShrink: 0,
        },
        collapseIcon: {
            fontSize: 20,
            color: colors.textSecondary,
        },
        recordingContainer: {
            height: 80,
            width: "100%",
            flexDirection: "row",
            alignSelf: "center",
            justifyContent: "flex-start",
            alignItems: "center",
            marginBottom: 15,
        },
        waveFormContainer: {
            maxWidth: windowWidth * 0.6,
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 10,
        },
        waveDivider: {
            width: 2,
            height: 60,
            backgroundColor: colors.textSecondary,
            borderRadius: 15,
            marginHorizontal: 2,
        },
        waveContainer: {
            flexDirection: "row",
            alignItems: "center",
            maxWidth: windowWidth * 0.28,
            height: 60,
        },
        rightWave: {
            width: 2,
            height: 15,
            backgroundColor: colors.lightGray,
            borderRadius: 15,
            marginHorizontal: 2,
        },
        leftWave: {
            width: 2,
            height: 15,
            backgroundColor: colors.text,
            borderRadius: 15,
            marginHorizontal: 2,
        },
        recipientContainer: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 15,
            paddingHorizontal: 10,
        },
        recipientLabel: {
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            marginRight: 10,
        },
        recipientField: {
            flex: 1,
            backgroundColor: colors.backgroundTertiary,
            borderRadius: 8,
            paddingHorizontal: 15,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        recipientName: {
            fontSize: 16,
            color: colors.text,
        },
        holdAndSpeakButton: {
            width: "100%",
            height: 140,
            backgroundColor: colors.warning,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.black,
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 5,
            elevation: 4,
        },
        holdAndSpeakButtonRecording: {
            backgroundColor: colors.error,
            shadowColor: colors.error,
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 8,
        },
        recordingPulseContainer: {
            borderRadius: 10,
        },
        recordingContent: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
        },
        recordingIndicator: {
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.text,
            shadowColor: colors.black,
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 3,
            elevation: 3,
        },
        holdAndSpeakText: {
            fontSize: 18,
            fontWeight: "bold",
            color: colors.white,
            letterSpacing: 1,
        },
        holdAndSpeakTextRecording: {
            fontSize: 18,
            fontWeight: "bold",
            color: colors.white,
            letterSpacing: 2,
        },
        dropdownContainer: {
            flex: 1,
            zIndex: 1000,
        },
        dropdown: {
            backgroundColor: colors.backgroundTertiary,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            minHeight: 50,
        },
        dropdownText: {
            fontSize: 16,
            color: colors.text,
        },
        dropdownSelectedText: {
            fontWeight: "600",
        },
        dropdownContainerStyle: {
            backgroundColor: colors.backgroundTertiary,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            marginTop: 2,
        },
    });

