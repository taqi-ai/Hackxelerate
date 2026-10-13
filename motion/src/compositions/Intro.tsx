import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

export type IntroProps = {
  title: string;
  tagline: string;
};

export const Intro: React.FC<IntroProps> = ({ title, tagline }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const portrait = height > width;

  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  const taglineIn = spring({ frame: frame - 18, fps, config: { damping: 200 } });
  const barIn = spring({ frame: frame - 8, fps, config: { damping: 30, mass: 0.6 } });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const glowShift = interpolate(frame, [0, durationInFrames], [-20, 20]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        fontFamily: theme.font,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${50 + glowShift}% 40%, ${theme.colors.accent}33, transparent 55%)`,
        }}
      />
      <div style={{ textAlign: "center", padding: 80 }}>
        <div
          style={{
            color: theme.colors.fg,
            fontSize: portrait ? 120 : 140,
            fontWeight: 800,
            letterSpacing: -4,
            transform: `translateY(${(1 - titleIn) * 60}px)`,
            opacity: titleIn,
          }}
        >
          {title}
        </div>
        <div
          style={{
            height: 8,
            width: 240 * barIn,
            margin: "32px auto",
            borderRadius: 4,
            background: `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.accent2})`,
          }}
        />
        <div
          style={{
            color: theme.colors.muted,
            fontSize: portrait ? 52 : 48,
            fontWeight: 500,
            transform: `translateY(${(1 - taglineIn) * 30}px)`,
            opacity: Math.max(0, taglineIn),
          }}
        >
          {tagline}
        </div>
      </div>
    </AbsoluteFill>
  );
};
