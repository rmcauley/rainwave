import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { DateTimePicker } from '@mui/x-date-pickers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import type { JSX } from 'react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { postRainwave } from '../api/rainwave';
import { formatPowerHourTimes } from '../api/time';
import { PageSection } from '../components/PageSection';
import { RainwaveErrorAlert } from '../components/RainwaveErrorAlert';

const stationOptions = [1, 2, 3, 4, 5, 6];

const columns: GridColDef[] = [
  { field: 'sched_id', headerName: 'ID', width: 90 },
  { field: 'sid', headerName: 'SID', width: 90 },
  { field: 'sched_name', headerName: 'Name', minWidth: 220, flex: 1 },
  { field: 'sched_url', headerName: 'URL', minWidth: 200, flex: 1 },
  {
    field: 'sched_start_display',
    headerName: 'Start',
    width: 430,
    sortable: false,
    valueGetter: (_value, row): string => {
      const times = formatPowerHourTimes(row.sched_start as number | null);

      return `Local: ${times.browser} | Toronto: ${times.toronto} | London: ${times.london}`;
    },
  },
];

export function PowerHoursPage(): JSX.Element {
  const navigate = useNavigate();
  const { schedId } = useParams();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [name, setName] = useState('New Power Hour');
  const [stationId, setStationId] = useState('1');
  const [url, setUrl] = useState('');
  const [start, setStart] = useState(DateTime.local().plus({ days: 1 }).startOf('hour'));
  const [end, setEnd] = useState(
    DateTime.local().plus({ days: 1 }).startOf('hour').plus({ hours: 1 }),
  );

  const listQuery = useQuery({
    queryKey: ['admin', 'power-hours'],
    queryFn: () => postRainwave('/api4/admin/power_hours'),
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'power-hour', schedId],
    queryFn: () => postRainwave('/api4/admin/power_hour', { sched_id: Number(schedId) }),
    enabled: Boolean(schedId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      postRainwave('/api4/admin/create_power_hour', {
        name,
        start_utc_time: Math.floor(start.toUTC().toSeconds()),
        end_utc_time: Math.floor(end.toUTC().toSeconds()),
        url: url || null,
        fill_unrated: false,
        sid: Number(stationId),
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'power-hours'] });
      setCreateDialogOpen(false);
      navigate(`/power-hours/${result.admin_power_hour.sched_id}`);
    },
  });

  return (
    <Stack spacing={3}>
      <PageSection
        title="Power Hours"
        subtitle="Router-backed list and detail scaffold for the admin power hour workflow."
      >
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            This scaffold already uses the renamed `change_power_hour_*` contract and MUI date-time
            pickers.
          </Typography>
          <Button variant="contained" onClick={(): void => setCreateDialogOpen(true)}>
            Create Power Hour
          </Button>
        </Stack>
        {listQuery.error ? <RainwaveErrorAlert error={listQuery.error} /> : null}
        <DataGrid
          autoHeight
          loading={listQuery.isLoading}
          rows={listQuery.data?.admin_power_hours || []}
          columns={columns}
          getRowId={(row): number => row.sched_id}
          onRowClick={(params): void => {
            void navigate(`/power-hours/${params.row.sched_id}`);
          }}
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 25,
                page: 0,
              },
            },
          }}
        />
      </PageSection>

      <PageSection
        title="Selected Power Hour"
        subtitle="Detail panel scaffold. Full mutation coverage comes in the next pass."
      >
        {detailQuery.error ? <RainwaveErrorAlert error={detailQuery.error} /> : null}
        {!schedId ? (
          <Alert severity="info">
            Select a Power Hour row to bind the detail panel to the URL.
          </Alert>
        ) : null}
        {detailQuery.data ? (
          <Grid container spacing={2}>
            <Grid size={3}>
              <TextField
                fullWidth
                label="Power Hour ID"
                value={String(detailQuery.data.admin_power_hour.sched_id)}
                slotProps={{ input: { readOnly: true } }}
              />
            </Grid>
            <Grid size={3}>
              <TextField
                fullWidth
                label="SID"
                value={String(detailQuery.data.admin_power_hour.sid)}
                slotProps={{ input: { readOnly: true } }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Name"
                value={detailQuery.data.admin_power_hour.sched_name || ''}
                slotProps={{ input: { readOnly: true } }}
              />
            </Grid>
          </Grid>
        ) : null}
      </PageSection>

      <Dialog
        open={createDialogOpen}
        onClose={(): void => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Power Hour</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(event): void => setName(event.target.value)}
            />
            <TextField
              select
              label="Station"
              value={stationId}
              onChange={(event): void => setStationId(event.target.value)}
            >
              {stationOptions.map((option) => (
                <MenuItem key={option} value={String(option)}>
                  {`Station ${option}`}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="URL"
              value={url}
              onChange={(event): void => setUrl(event.target.value)}
            />
            <DateTimePicker
              label="Start"
              value={start}
              onChange={(value): void => {
                if (value) {
                  setStart(value);
                }
              }}
            />
            <DateTimePicker
              label="End"
              value={end}
              onChange={(value): void => {
                if (value) {
                  setEnd(value);
                }
              }}
            />
          </Stack>
          {createMutation.error ? <RainwaveErrorAlert error={createMutation.error} /> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={(): void => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={(): void => void createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
