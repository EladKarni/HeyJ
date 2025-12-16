import React, { useState } from "react";
import { View, Text } from "react-native";
import DropdownPicker from "react-native-dropdown-picker";
import Profile from "../../objects/Profile";

interface RecipientSelectorProps {
  recipientName: string;
  friends: Profile[];
  selectedFriendUid: string | null;
  onFriendSelected: (friendUid: string) => void;
  styles: any;
}

const RecipientSelector = ({
  recipientName,
  friends,
  selectedFriendUid,
  onFriendSelected,
  styles,
}: RecipientSelectorProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <View style={styles.recipientContainer}>
      <Text style={styles.recipientLabel}>To:</Text>
      {friends.length > 0 ? (
        <View style={styles.dropdownContainer}>
          <DropdownPicker
            open={dropdownOpen}
            value={selectedFriendUid}
            items={friends.map((friend) => ({
              label: friend.name,
              value: friend.uid,
            }))}
            setOpen={setDropdownOpen}
            setValue={(callback) => {
              const newValue = typeof callback === 'function' ? callback(selectedFriendUid) : callback;
              if (newValue && onFriendSelected) {
                onFriendSelected(newValue);
              }
            }}
            placeholder="Select a friend"
            style={styles.dropdown}
            textStyle={styles.dropdownText}
            dropDownContainerStyle={styles.dropdownContainerStyle}
            selectedItemLabelStyle={styles.dropdownSelectedText}
          />
        </View>
      ) : (
        <View style={styles.recipientField}>
          <Text style={styles.recipientName}>
            {recipientName || "No friends yet"}
          </Text>
        </View>
      )}
    </View>
  );
};

export default RecipientSelector;
