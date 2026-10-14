"use client";

import { WaveformPlayer } from "@arraypress/waveform-player-react";

type BeatPreviewPlayerProps = {
  url: string;
  title: string;
};

export default function BeatPreviewPlayer({
  url,
  title,
}: BeatPreviewPlayerProps) {
  return (
    <WaveformPlayer
      url={url}
      title={title}
      waveformStyle="line"
    />
  );
}