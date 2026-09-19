import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import { queryClient, RepositoriesProvider } from './data/providers';
import { AppRoutes } from './router';
import './theme/tokens.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RepositoriesProvider>
        {/* HashRouter keeps URLs like /#/child, and works from any static host. */}
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </RepositoriesProvider>
    </QueryClientProvider>
  </StrictMode>,
);
