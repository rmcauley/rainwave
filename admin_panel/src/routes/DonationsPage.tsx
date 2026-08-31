import { Alert, Button, FormControlLabel, Grid, Stack, Switch, TextField } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useState } from 'react';

import { postRainwave } from '../api/rainwave';
import { PageSection } from '../components/PageSection';
import { RainwaveErrorAlert } from '../components/RainwaveErrorAlert';

export function DonationsPage(): JSX.Element {
  const [donorId, setDonorId] = useState('0');
  const [amount, setAmount] = useState('0');
  const [message, setMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      postRainwave('/api4/admin/add_donation', {
        donor_id: Number(donorId),
        amount: Number(amount),
        message,
        private: isPrivate,
      }),
  });

  return (
    <Stack spacing={3}>
      <PageSection
        title="Add Donation"
        subtitle="Submit donations through /api4/admin/add_donation."
      >
        <Grid container spacing={2}>
          <Grid size={4}>
            <TextField
              fullWidth
              label="Donor ID"
              value={donorId}
              onChange={(event): void => setDonorId(event.target.value)}
            />
          </Grid>
          <Grid size={4}>
            <TextField
              fullWidth
              label="Amount"
              value={amount}
              onChange={(event): void => setAmount(event.target.value)}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Message"
              value={message}
              onChange={(event): void => setMessage(event.target.value)}
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={isPrivate}
                  onChange={(event): void => setIsPrivate(event.target.checked)}
                />
              }
              label="Private donation"
            />
          </Grid>
          <Grid size={12}>
            <Button
              variant="contained"
              onClick={(): void => void mutation.mutate()}
              disabled={mutation.isPending}
            >
              Add Donation
            </Button>
          </Grid>
        </Grid>
        {mutation.isSuccess ? <Alert severity="success">Donation submitted.</Alert> : null}
        {mutation.error ? <RainwaveErrorAlert error={mutation.error} /> : null}
      </PageSection>
    </Stack>
  );
}
