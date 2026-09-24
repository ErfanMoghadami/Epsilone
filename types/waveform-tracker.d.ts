declare module "@arraypress/waveform-tracker" {
  type TrackerEventConfig = {
    play?: number;
    listen?: number;
    complete?: number;
  };

  type TrackerMetadata = Record<
    string,
    string | number | boolean | null
  >;

  type TrackerConfig = {
    endpoint?: string;
    events?: TrackerEventConfig;
    metadata?: TrackerMetadata;
    session?: boolean;
    headers?: Record<string, string>;
    debug?: boolean;
    handler?: (payload: {
      event: string;
      url: string;
      time: number;
      duration: number;
      page: string;
      session?: string;
      title?: string;
      [key: string]: unknown;
    }) => void;
  };

  const WaveformTracker: {
    init: (config?: TrackerConfig) => void;
  };

  export default WaveformTracker;
}