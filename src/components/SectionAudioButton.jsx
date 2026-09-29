import { Pause, Play, VolumeX } from "lucide-react";

/**
 * Round play/pause button for one section's audio. When the audio failed to
 * load it shows a muted icon but stays clickable, so the reader can retry.
 *
 * @param {{
 *   isPlaying: boolean,
 *   isUnavailable: boolean,
 *   onToggle: () => void,
 *   labels: { play: string, pause: string, unavailable: string },
 * }} props
 */
const SectionAudioButton = ({ isPlaying, isUnavailable, onToggle, labels }) => {
  const label = isUnavailable ? labels.unavailable : isPlaying ? labels.pause : labels.play;
  const Icon = isUnavailable ? VolumeX : isPlaying ? Pause : Play;
  const colors = isUnavailable
    ? "bg-gray-300 text-gray-600 hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    : "bg-cyan-500 text-white hover:bg-cyan-600";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={`flex-shrink-0 inline-flex items-center justify-center size-11 rounded-full shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${colors}`}
    >
      <Icon
        className={`size-5${!isPlaying && !isUnavailable ? " ml-0.5" : ""}`}
        fill={isUnavailable ? "none" : "currentColor"}
        aria-hidden="true"
      />
    </button>
  );
};

export default SectionAudioButton;
