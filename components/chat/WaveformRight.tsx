import { View } from "react-native";

interface WaveformRightProps {
  rightWaveStyle: any;
}

const WaveformRight = ({ rightWaveStyle }: WaveformRightProps) => {
  return (
    <View style={{ flexDirection: "row" }}>
      {Array.from({ length: 20 }, (_, index) => (
        <View key={index} style={rightWaveStyle} />
      ))}
    </View>
  );
};

export default WaveformRight;
