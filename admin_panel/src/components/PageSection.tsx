import { Paper, Stack, Typography } from '@mui/material';
import type { JSX, ReactNode } from 'react';

interface PageSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function PageSection({ title, subtitle, children }: PageSectionProps): JSX.Element {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <div>
          <Typography variant="h5">{title}</Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </div>
        {children}
      </Stack>
    </Paper>
  );
}
