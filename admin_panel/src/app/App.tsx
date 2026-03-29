import { RouterProvider } from 'react-router-dom';
import type { JSX } from 'react';

import { AppProviders } from './AppProviders';
import { router } from './router';

export function App(): JSX.Element {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
