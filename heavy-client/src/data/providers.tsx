import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Plan, PlanTask } from './models/plan';
import { FakePlanRepository, type PlanRepository } from './repositories/planRepository';

/** Chooses fake or real data. Start with VITE_USE_SERVER=true for the server (not built yet). */
export const useServer = import.meta.env.VITE_USE_SERVER === 'true';

export const demoPatientId = 'alex';

function createPlanRepository(): PlanRepository {
  if (useServer) {
    throw new Error('API repository arrives with the server core loop.');
  }
  return new FakePlanRepository();
}

const PlanRepositoryContext = createContext<PlanRepository | null>(null);

export function PlanRepositoryProvider({ children }: { children: ReactNode }) {
  const [repository] = useState(createPlanRepository);
  return <PlanRepositoryContext.Provider value={repository}>{children}</PlanRepositoryContext.Provider>;
}

export interface PlanDraft {
  plan: Plan | null;
  failed: boolean;
  addTask: (task: PlanTask) => void;
  removeTask: (id: string) => void;
  setNote: (note: string) => void;
  publish: () => Promise<void>;
}

/** The plan being edited. Loads the published plan, then edits stay local until publish. */
export function usePlanDraft(): PlanDraft {
  const repository = useContext(PlanRepositoryContext);
  if (!repository) throw new Error('PlanRepositoryProvider is missing.');

  const [plan, setPlan] = useState<Plan | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    repository.plan(demoPatientId).then(
      (loaded) => active && setPlan(loaded),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [repository]);

  const addTask = useCallback(
    (task: PlanTask) => setPlan((p) => p && { ...p, tasks: [...p.tasks, task] }),
    [],
  );
  const removeTask = useCallback(
    (id: string) => setPlan((p) => p && { ...p, tasks: p.tasks.filter((t) => t.id !== id) }),
    [],
  );
  const setNote = useCallback((note: string) => setPlan((p) => p && { ...p, note }), []);
  const publish = useCallback(async () => {
    if (!plan) return;
    setPlan(await repository.publish(demoPatientId, plan));
  }, [repository, plan]);

  return { plan, failed, addTask, removeTask, setNote, publish };
}
