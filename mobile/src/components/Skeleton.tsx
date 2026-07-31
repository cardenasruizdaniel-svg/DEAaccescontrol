import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: theme.colors.borderLight, opacity }, style]}
    />
  );
}

export function SkeletonCard({ theme }: { theme: any }) {
  return (
    <View style={[skelStyles.card, { backgroundColor: theme.colors.surface }]}>
      <Skeleton width={40} height={40} borderRadius={12} />
      <Skeleton width="60%" height={18} style={{ marginTop: 10 }} />
      <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonShiftCard({ theme }: { theme: any }) {
  return (
    <View style={[skelStyles.shiftCard, { backgroundColor: theme.colors.surface }]}>
      <Skeleton width={44} height={40} borderRadius={8} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="50%" height={12} style={{ marginTop: 6 }} />
        <Skeleton width="40%" height={12} style={{ marginTop: 4 }} />
      </View>
      <Skeleton width={60} height={24} borderRadius={12} />
    </View>
  );
}

export function SkeletonList({ count = 4, theme }: { count?: number; theme: any }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonShiftCard key={i} theme={theme} />
      ))}
    </>
  );
}

const skelStyles = StyleSheet.create({
  card: { width: "48%", borderRadius: 14, padding: 16, marginBottom: 12 },
  shiftCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, marginBottom: 10 },
});
