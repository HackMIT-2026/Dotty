import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PlanRepositoryProvider } from './data/providers';
import { ClinicianPlanBuilderScreen } from './screens/ClinicianPlanBuilderScreen';
import './theme/tokens.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlanRepositoryProvider>
      <ClinicianPlanBuilderScreen />
    </PlanRepositoryProvider>
  </StrictMode>,
);
