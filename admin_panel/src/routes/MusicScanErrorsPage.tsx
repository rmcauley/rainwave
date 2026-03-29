import type { JSX } from 'react';

import { Stack } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';

import { postRainwave } from '../api/rainwave';
import { formatPowerHourTimes } from '../api/time';
import { PageSection } from '../components/PageSection';
import { RainwaveErrorAlert } from '../components/RainwaveErrorAlert';

const columns: GridColDef[] = [
  {
    field: 'time_display',
    headerName: 'Recorded At',
    width: 420,
    sortable: false,
    valueGetter: (_value, row): string => {
      const times = formatPowerHourTimes(row.time as number);

      return `Local: ${times.browser} | Toronto: ${times.toronto} | London: ${times.london}`;
    },
  },
  { field: 'file', headerName: 'File', flex: 1, minWidth: 360 },
  { field: 'type', headerName: 'Type', width: 220 },
  { field: 'error', headerName: 'Error', flex: 1, minWidth: 260 },
];

export function MusicScanErrorsPage(): JSX.Element {
  const query = useQuery({
    queryKey: ['admin', 'music-scan-errors'],
    queryFn: () => postRainwave('/api4/admin/music_scan_errors'),
  });

  return (
    <Stack spacing={3}>
      <PageSection title="Music Scan Errors" subtitle="Read-only table from /api4/admin/music_scan_errors.">
        {query.error ? <RainwaveErrorAlert error={query.error} /> : null}
        <DataGrid
          autoHeight
          loading={query.isLoading}
          rows={query.data?.admin_music_scan_errors || []}
          columns={columns}
          getRowId={(row): string => `${row.time}-${row.file}`}
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
    </Stack>
  );
}
