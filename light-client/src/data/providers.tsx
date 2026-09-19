import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';

import { createFakeRepositories } from './repositories/fakeRepositories';
import type { Repositories } from './repositories/repositories';

/** Chooses fake or real data. Start with VITE_USE_SERVER=true for the server. */
export const useServer = import.meta.env.VITE_USE_SERVER === 'true';

/** One patient for the demo. */
export const patientId = 'alex';

function createRepositories(): Repositories {
  if (useServer) {
    throw new Error('API repositories arrive with the server core loop.');
  }
  return createFakeRepositories();
}

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity } },
});

const RepositoriesContext = createContext<Repositories | null>(null);

/** Provides the repositories. Switching Fake to Api is a change to createRepositories only. */
export function RepositoriesProvider({ children }: { children: ReactNode }) {
  const [repositories] = useState(createRepositories);
  return <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>;
}

function useRepositories(): Repositories {
  const repositories = useContext(RepositoriesContext);
  if (!repositories) throw new Error('RepositoriesProvider is missing.');
  return repositories;
}

export const usePatient = () => {
  const { plans } = useRepositories();
  return useQuery({ queryKey: ['patient'], queryFn: () => plans.patient(patientId) });
};

export const useCarePlan = () => {
  const { plans } = useRepositories();
  return useQuery({ queryKey: ['carePlan'], queryFn: () => plans.plan(patientId) });
};

export const useQuests = () => {
  const { tasks } = useRepositories();
  return useQuery({ queryKey: ['quests'], queryFn: () => tasks.quests(patientId) });
};

export const useActivity = () => {
  const { logs } = useRepositories();
  return useQuery({ queryKey: ['activity'], queryFn: () => logs.recent(patientId) });
};

export const usePet = () => {
  const { pets } = useRepositories();
  return useQuery({ queryKey: ['pet'], queryFn: () => pets.pet(patientId) });
};

/** Actions that change state, then refresh what the screens read. */
export function useCareActions() {
  const { logs, pets } = useRepositories();
  const client = useQueryClient();

  const refresh = () =>
    Promise.all(
      ['quests', 'pet', 'activity'].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );

  const complete = useMutation({
    mutationFn: (planId: string) => logs.logCompletion(patientId, planId),
    onSuccess: refresh,
  });
  const wake = useMutation({ mutationFn: () => pets.wake(patientId), onSuccess: refresh });
  const cheer = useMutation({
    mutationFn: () => logs.sendCheer(patientId, 'You sent Pip a cheer'),
    onSuccess: refresh,
  });

  return {
    completeQuest: (planId: string) => complete.mutate(planId),
    wakePet: () => wake.mutate(),
    sendCheer: () => cheer.mutate(),
  };
}
