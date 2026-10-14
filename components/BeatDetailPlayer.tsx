"use client";

import { WaveformPlayer } from "@arraypress/waveform-player-react";

type BeatDetailPlayerProps = {
  url: string;
  title: string;
};

/** Full-width preview player for the beat detail page. */
export default function BeatDetailPlayer({
  url,
  title,
}: BeatDetailPlayerProps) {
  return (
    <div className="beat-player w-full" dir="ltr">
      <WaveformPlayer
        url={url}
        title={title}
        waveformStyle="bars"
        height={48}
        samples={240}
        barWidth={2}
        barSpacing={2}
        barRadius={1}
        waveformColor="rgba(128,128,128,0.45)"
        progressColor="#ff7f5c"
        buttonSize={44}
        showInfo={false}
        showTime={false}
        showBPM={false}
        showPlaybackSpeed={false}
      />
    </div>
  );
}