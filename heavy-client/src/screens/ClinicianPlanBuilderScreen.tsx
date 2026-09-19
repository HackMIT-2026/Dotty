import { useState, type FormEvent } from 'react';
import { MdAdd, MdCheck, MdSend } from 'react-icons/md';

import type { PlanTask } from '../data/models/plan';
import { usePlanDraft } from '../data/providers';
import { BigButton } from '../widgets/BigButton';
import { DottyChip } from '../widgets/DottyChip';
import { PlanRow } from '../widgets/PlanRow';
import './ClinicianPlanBuilderScreen.css';

/** ClinicianPlanBuilder (Figma node 14-68). Build and publish Alex's care plan. */
export function ClinicianPlanBuilderScreen() {
  const draft = usePlanDraft();
  const { plan } = draft;

  return (
    <div className="builder">
      {draft.failed && <p className="text-clinician">The plan could not load.</p>}
      {!plan && !draft.failed && <p className="text-clinician-muted">Loading the plan…</p>}
      {plan && (
        <>
          <header className="builder__header">
            <h1 className="text-h1">Care plan for Alex</h1>
            <DottyChip icon={MdCheck} label={`Version ${plan.version}`} />
            <div className="builder__publish">
              <BigButton label="Publish plan" icon={MdSend} onPress={draft.publish} />
            </div>
          </header>

          <div className="builder__columns">
            <TaskTable tasks={plan.tasks} onRemove={draft.removeTask} />
            <div className="builder__side">
              <AddTaskForm onAdd={draft.addTask} />
              <NoteField note={plan.note} onChange={draft.setNote} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TaskTable({ tasks, onRemove }: { tasks: PlanTask[]; onRemove: (id: string) => void }) {
  return (
    <section className="task-table">
      <div className="plan-grid task-table__head text-clinician-muted">
        <span>Task</span>
        <span>Time window</span>
        <span>Child's wording and why</span>
        <span>Reward</span>
        <span />
      </div>
      {tasks.map((t) => (
        <PlanRow
          key={t.id}
          task={t.task}
          window={t.window}
          childWording={t.childWording}
          whyText={t.whyText}
          reward={t.reward}
          onRemove={() => onRemove(t.id)}
        />
      ))}
    </section>
  );
}

let nextId = 1;

function AddTaskForm({ onAdd }: { onAdd: (task: PlanTask) => void }) {
  const [task, setTask] = useState('');
  const [window, setWindow] = useState('');
  const [wording, setWording] = useState('');
  const [why, setWhy] = useState('');
  const [reward, setReward] = useState('10');

  function add(event: FormEvent) {
    event.preventDefault();
    if (!task.trim() || !why.trim()) return;
    const parsed = Number.parseInt(reward, 10);
    onAdd({
      id: `new${nextId++}`,
      task: task.trim(),
      window: window.trim(),
      childWording: wording.trim() || task.trim(),
      whyText: why.trim(),
      reward: Math.min(100, Math.max(0, Number.isNaN(parsed) ? 0 : parsed)),
    });
    setTask('');
    setWindow('');
    setWording('');
    setWhy('');
  }

  return (
    <form className="panel" onSubmit={add}>
      <h2 className="text-h2">Add a task</h2>
      <Field label="Task" value={task} onChange={setTask} />
      <Field label="Time window, for example 7:00 to 9:00 am" value={window} onChange={setWindow} />
      <Field label="Child's wording (optional)" value={wording} onChange={setWording} />
      <Field label="Why am I doing this?" value={why} onChange={setWhy} />
      <Field
        label="Reward (0 to 100 energy, fixed by the task)"
        value={reward}
        onChange={setReward}
        inputMode="numeric"
      />
      <div>
        <BigButton label="Add to plan" tone="soft" icon={MdAdd} submit />
      </div>
    </form>
  );
}

function NoteField({ note, onChange }: { note: string; onChange: (note: string) => void }) {
  return (
    <section className="note">
      <h2 className="text-h2">Note for the parent</h2>
      <p className="text-clinician-muted">Shown in the parent app as coming from the care team.</p>
      <label className="field">
        <span className="text-clinician-muted">Note</span>
        <textarea className="field__input text-clinician" rows={4} value={note} onChange={(e) => onChange(e.target.value)} />
      </label>
    </section>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: 'numeric';
}

function Field({ label, value, onChange, inputMode }: FieldProps) {
  return (
    <label className="field">
      <span className="text-clinician-muted">{label}</span>
      <input
        className="field__input text-clinician"
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
