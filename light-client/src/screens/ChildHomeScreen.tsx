import { MdFavorite, MdWbSunny } from 'react-icons/md';

import type { PetMood } from '../data/models/models';
import { useCareActions, usePatient, usePet, useQuests } from '../data/providers';
import { BigButton } from '../widgets/BigButton';
import { DottyChip } from '../widgets/DottyChip';
import { EnergyMeter } from '../widgets/EnergyMeter';
import { Pet } from '../widgets/Pet';
import { PhoneFrame } from '../widgets/PhoneFrame';
import { TaskCard } from '../widgets/TaskCard';
import './screens.css';

const speech: Record<PetMood, string> = {
  sleepy: "I'm a little sleepy. Tap to wake me up!",
  curious: 'What are we doing today?',
  happy: 'Thanks for looking after me!',
  cheering: 'Your family sent a cheer!',
};

/** ChildHome (Figma node 14-2). Pip, energy, and today's quests. */
export function ChildHomeScreen() {
  const patient = usePatient().data;
  const pet = usePet();
  const quests = useQuests();
  const actions = useCareActions();

  return (
    <PhoneFrame underwater>
      <div className="screen">
        <div>
          <DottyChip icon={MdFavorite} label={`${patient?.streak ?? 0} Days with Pip`} />
        </div>

        {pet.data ? (
          <div className="screen__center">
            <Pet mood={pet.data.mood} />
            <p className="text-body-large screen__speech">{speech[pet.data.mood]}</p>
            <div style={{ alignSelf: 'stretch' }}>
              <EnergyMeter energy={pet.data.energy} />
            </div>
            {pet.data.mood === 'sleepy' && (
              <div style={{ alignSelf: 'stretch' }}>
                <BigButton label="Wake up Pip" icon={MdWbSunny} onPress={actions.wakePet} />
              </div>
            )}
          </div>
        ) : pet.isError ? (
          <p className="text-body">Pip is taking a nap. Try again soon.</p>
        ) : null}

        <h2 className="text-h2 gap-24">Today's quests</h2>

        {quests.isError && <p className="text-body">Quests are resting. Try again soon.</p>}
        <div className="screen__stack">
          {quests.data?.map((q) => (
            <TaskCard
              key={q.planId}
              done={q.status === 'done'}
              title={q.title}
              subtitle={q.status === 'done' ? `Done! Pip got ${q.reward} energy` : q.windowLabel}
              whyText={q.whyText}
              onComplete={q.status === 'done' ? undefined : () => actions.completeQuest(q.planId)}
            />
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}
