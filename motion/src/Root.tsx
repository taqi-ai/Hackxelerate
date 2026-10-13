import { Composition } from "remotion";
import { Intro } from "./compositions/Intro";
import { theme } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 16:9 — demo video / pitch intro */}
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={theme.fps * 6}
        fps={theme.fps}
        width={1920}
        height={1080}
        defaultProps={{ title: theme.name, tagline: theme.tagline }}
      />
      {/* 9:16 — reels / shorts / LinkedIn vertical */}
      <Composition
        id="Social"
        component={Intro}
        durationInFrames={theme.fps * 6}
        fps={theme.fps}
        width={1080}
        height={1920}
        defaultProps={{ title: theme.name, tagline: theme.tagline }}
      />
    </>
  );
};
