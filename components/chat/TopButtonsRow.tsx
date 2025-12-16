import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
// @ts-expect-error
import { FontAwesome, MaterialCommunityIcons } from "react-native-vector-icons";
import { useAudioSettings } from "../../utilities/AudioSettingsProvider";
import AddFriendModal from "../profile/AddFriendModal";

interface TopButtonsRowProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  styles: any;
}

const TopButtonsRow = ({
  isCollapsed,
  onToggleCollapse,
  styles,
}: TopButtonsRowProps) => {
  const { speakerMode, toggleSpeakerMode, autoplay, toggleAutoplay } = useAudioSettings();
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  return (
    <View style={styles.topButtonRow}>
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          onPress={toggleSpeakerMode}
          style={[
            styles.speakerButton,
            speakerMode && styles.speakerButtonActive,
            isCollapsed && styles.buttonCollapsed
          ]}
          activeOpacity={0.7}
        >
          <FontAwesome
            name="volume-up"
            style={[
              styles.speakerIcon,
              speakerMode && styles.speakerIconActive,
              isCollapsed && styles.iconCollapsed
            ]}
          />
          {!isCollapsed && (
            <Text style={[
              styles.speakerLabel,
              speakerMode && styles.speakerLabelActive
            ]}>
              SPEAKER
            </Text>
          )}
          {speakerMode && !isCollapsed && <View style={styles.speakerIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleAutoplay}
          style={[
            styles.autoplayButton,
            autoplay && styles.autoplayButtonActive,
            isCollapsed && styles.buttonCollapsed
          ]}
          activeOpacity={0.7}
        >
          <FontAwesome
            name="play-circle"
            style={[
              styles.autoplayIcon,
              autoplay && styles.autoplayIconActive,
              isCollapsed && styles.iconCollapsed
            ]}
          />
          {!isCollapsed && (
            <Text style={[
              styles.autoplayLabel,
              autoplay && styles.autoplayLabelActive
            ]}>
              PLAY
            </Text>
          )}
          {autoplay && !isCollapsed && <View style={styles.autoplayIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowAddFriendModal(true)}
          style={[styles.addFriendButton, isCollapsed && styles.buttonCollapsed]}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="account-plus"
            style={[styles.addFriendIcon, isCollapsed && styles.iconCollapsed]}
          />
          {!isCollapsed && (
            <Text style={styles.addFriendLabel}>
              FRIEND
            </Text>
          )}
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={onToggleCollapse}
        style={[styles.collapseButton, isCollapsed && styles.buttonCollapsed]}
        activeOpacity={0.7}
      >
        <FontAwesome
          name={isCollapsed ? "plus" : "minus"}
          style={[styles.collapseIcon, isCollapsed && styles.iconCollapsed]}
        />
      </TouchableOpacity>
      <AddFriendModal
        visible={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
      />
    </View>
  );
};

export default TopButtonsRow;
