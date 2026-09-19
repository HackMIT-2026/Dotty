import { useState } from 'react';

import { petMoods } from '../data/models/models';
import { Pet } from '../widgets/Pet';
import { PhoneFrame } from '../widgets/PhoneFrame';
import './screens.css';

/**
 * Dev-only screen at /pet-preview. Shows all four Pip moods in the same fixed box,
 * with the box outlined so any size change or drift is easy to spot. Tap the pet
 * at the bottom to step through the moods and watch the fade.
 */
export function PetPreviewScreen() {
  const [index, setIndex] = useState(0);
  const current = petMoods[index % petMoods.length];

  return (
    <PhoneFrame>
      <div className="screen">
        <h1 className="text-h2">Pip preview</h1>
        <p className="text-body-large">All moods, same box</p>
        <div className="pet-preview__grid">
          {petMoods.map((mood) => (
            <div key={mood} className="pet-preview__cell">
              <div className="pet-preview__box">
                <Pet mood={mood} small />
              </div>
              <span className="text-body">{mood}</span>
            </div>
          ))}
        </div>
        <p className="text-body-large gap-32">Tap Pip to change mood ({current})</p>
        <button type="button" className="pet-preview__tap" onClick={() => setIndex((i) => i + 1)}>
          <div className="pet-preview__box">
            <Pet mood={current} />
          </div>
        </button>
      </div>
    </PhoneFrame>
  );
}
