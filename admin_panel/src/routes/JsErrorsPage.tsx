import { Stack } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';

import { postRainwave } from '../api/rainwave';
import { formatPowerHourTimes } from '../api/time';
import { PageSection } from '../components/PageSection';
import { RainwaveErrorAlert } from '../components/RainwaveErrorAlert';

const columns: GridColDef[] = [
  { field: 'user_id', headerName: 'User ID', width: 100 },
  { field: 'username', headerName: 'Username', width: 180 },
  {
    field: 'time_display',
    headerName: 'Reported At',
    width: 420,
    sortable: false,
    valueGetter: (_value, row): string => {
      const times = formatPowerHourTimes(row.time as number);

      return `Local: ${times.browser} | Toronto: ${times.toronto} | London: ${times.london}`;
    },
  },
  { field: 'name', headerName: 'Name', width: 180 },
  { field: 'message', headerName: 'Message', flex: 1, minWidth: 260 },
  { field: 'location', headerName: 'Location', flex: 1, minWidth: 240 },
];

export function JsErrorsPage(): JSX.Element {
  const query = useQuery({
    queryKey: ['admin', 'js-errors'],
    queryFn: () => postRainwave('/api4/admin/js_errors'),
  });

  return (
    <Stack spacing={3}>
      <PageSection title="JavaScript Errors" subtitle="Read-only table from /api4/admin/js_errors.">
        {query.error ? <RainwaveErrorAlert error={query.error} /> : null}
        <DataGrid
          autoHeight
          loading={query.isLoading}
          rows={query.data?.admin_js_errors || []}
          columns={columns}
          getRowId={(row): number => row.time + row.user_id}
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
