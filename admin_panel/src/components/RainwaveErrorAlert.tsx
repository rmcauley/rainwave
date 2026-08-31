import { Alert } from '@mui/material';
import type { JSX, ReactNode } from 'react';

import { RainwaveApiError } from '../api/rainwave';

interface RainwaveErrorAlertProps {
  error: unknown;
  fallback?: ReactNode;
}

export function RainwaveErrorAlert({ error, fallback }: RainwaveErrorAlertProps): JSX.Element {
  if (error instanceof RainwaveApiError) {
    const detail = error.apiError?.tl_key ? ` (${error.apiError.tl_key})` : '';

    return <Alert severity="error">{`${error.message}${detail}`}</Alert>;
  }

  return <Alert severity="error">{fallback || 'The request failed.'}</Alert>;
}
