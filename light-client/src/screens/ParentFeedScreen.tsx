import { MdCelebration, MdCheck, MdFavorite, MdOutlineMedicalServices, MdSchedule } from 'react-icons/md';

import { formatTime, type PetMood } from '../data/models/models';
import { useActivity, useCareActions, useCarePlan, usePatient, usePet, useQuests } from '../data/providers';
import { ActivityItem } from '../widgets/ActivityItem';
import { BigButton } from '../widgets/BigButton';
import { DottyChip } from '../widgets/DottyChip';
import { Pet } from '../widgets/Pet';
import { PhoneFrame } from '../widgets/PhoneFrame';
import './screens.css';

const moodLine: Record<PetMood, string> = {
  sleepy: 'Pip is sleepy. A cheer can help.',
  curious: 'Pip is curious about today.',
  happy: 'Pip is happy.',
  cheering: 'Pip is cheering!',
};

/** ParentFeed (Figma node 14-44). What Alex did with Pip, the care team note, and cheers. */
export function ParentFeedScreen() {
  const patient = usePatient().data;
  const pet = usePet().data;
  const plan = useCarePlan().data;
  const quests = useQuests().data ?? [];
  const activity = useActivity().data ?? [];
  const actions = useCareActions();
  const doneCount = quests.filter((q) => q.status === 'done').length;
  const allDone = quests.length > 0 && doneCount === quests.length;

  return (
    <PhoneFrame>
      <div className="screen">
        <h1 className="text-h1">{patient?.name ?? 'Alex'}'s day</h1>

        <div className="screen__pet-row">
          {pet && <Pet mood={pet.mood} small />}
          <p className="text-body-large">{pet ? moodLine[pet.mood] : ''}</p>
        </div>

        <div className="screen__chips">
          <DottyChip icon={allDone ? MdCheck : MdSchedule} label={`${doneCount} of ${quests.length} quests done`} />
          <DottyChip icon={MdFavorite} label={`${patient?.streak ?? 0} Days with Pip`} />
        </div>

        {plan && <CareTeamNote note={plan.note} />}

        <h2 className="text-h2 gap-24">Today with Pip</h2>
        <div className="screen__stack">
          {activity.map((entry) => (
            <ActivityItem key={entry.id} message={entry.message} time={formatTime(entry.at)} />
          ))}
        </div>

        <BigButton label="Send Pip a cheer" tone="soft" icon={MdCelebration} onPress={actions.sendCheer} />
      </div>
    </PhoneFrame>
  );
}

/** A note typed by the clinician, always labeled as coming from the care team. */
function CareTeamNote({ note }: { note: string }) {
  return (
    <div className="care-note">
      <div className="care-note__title text-button">
        <MdOutlineMedicalServices aria-hidden />
        <span>From the care team</span>
      </div>
      <p className="text-body">{note}</p>
    </div>
  );
}
