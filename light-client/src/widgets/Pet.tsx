import cheering from '../assets/pet/cheering.png';
import curious from '../assets/pet/curious.png';
import happy from '../assets/pet/happy.png';
import sleepy from '../assets/pet/sleepy.png';
import type { PetMood } from '../data/models/models';
import './Pet.css';

const images: Record<PetMood, string> = { happy, sleepy, curious, cheering };

const labels: Record<PetMood, string> = {
  happy: 'Pip is happy',
  sleepy: 'Pip is sleepy',
  curious: 'Pip is curious',
  cheering: 'Pip is cheering',
};

interface PetProps {
  mood: PetMood;
  /** Box size in px. Defaults to the pet stage token. */
  small?: boolean;
}

/**
 * Figma Pet (node 11-54). Shows the Pip image for the mood inside a fixed square
 * box, so Pip keeps the same footprint whatever the image's aspect ratio.
 * Fades between moods, and the fade is skipped when reduced motion is on.
 */
export function Pet({ mood, small = false }: PetProps) {
  return (
    <div className={`pet${small ? ' pet--small' : ''}`} role="img" aria-label={labels[mood]}>
      {/* key remounts the image so the fade-in plays on every mood change */}
      <img key={mood} className="pet__image" src={images[mood]} alt="" draggable={false} />
    </div>
  );
}
