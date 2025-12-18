import { View, FlatList, DimensionValue } from "react-native";

interface WaveformLeftProps {
  loudness: Number[];
  waveContainerStyle: any;
  leftWaveStyle: any;
}

const WaveformLeft = ({
  loudness,
  waveContainerStyle,
  leftWaveStyle,
}: WaveformLeftProps) => {
  return (
    <FlatList
      data={loudness}
      style={{ width: "100%" }}
      horizontal
      contentContainerStyle={[
        waveContainerStyle,
        {
          justifyContent: "flex-end",
          paddingLeft: 0,
        },
      ]}
      renderItem={({ item, index }) => {
        return (
          <View
            key={index}
            style={[leftWaveStyle, { height: item as DimensionValue }]}
          />
        );
      }}
    />
  );
};

export default WaveformLeft;
