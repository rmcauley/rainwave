import { Stack, TextField, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { postRainwave } from '../api/rainwave';
import { PageSection } from '../components/PageSection';
import { RainwaveErrorAlert } from '../components/RainwaveErrorAlert';

const albumColumns: GridColDef[] = [
  { field: 'album_id', headerName: 'Album ID', width: 110 },
  { field: 'album_name', headerName: 'Album Name', flex: 1, minWidth: 280 },
  { field: 'rating', headerName: 'Rating', width: 110 },
  { field: 'rating_count', headerName: 'Ratings', width: 110 },
  { field: 'album_cool_multiply', headerName: 'Cooldown Multiplier', width: 170 },
  { field: 'album_cool_override', headerName: 'Cooldown Override', width: 160 },
];

const songColumns: GridColDef[] = [
  { field: 'song_id', headerName: 'Song ID', width: 100 },
  { field: 'song_filename', headerName: 'Filename', flex: 1, minWidth: 380 },
  { field: 'rating', headerName: 'Rating', width: 100 },
  { field: 'rating_count', headerName: 'Ratings', width: 100 },
  { field: 'song_cool_multiply', headerName: 'Cooldown Multiplier', width: 170 },
  { field: 'song_cool_override', headerName: 'Cooldown Override', width: 160 },
  { field: 'song_request_only', headerName: 'Request Only', width: 130 },
];

export function AlbumsPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { albumId } = useParams();
  const navigate = useNavigate();
  const sid = searchParams.get('sid') || '1';

  const albumsQuery = useQuery({
    queryKey: ['admin', 'albums', sid],
    queryFn: () => postRainwave('/api4/admin/albums', { sid: Number(sid) }),
  });

  const songsQuery = useQuery({
    queryKey: ['admin', 'album-songs', sid, albumId],
    queryFn: () =>
      postRainwave('/api4/admin/album_songs', { sid: Number(sid), album_id: Number(albumId) }),
    enabled: Boolean(albumId),
  });

  const artQuery = useQuery({
    queryKey: ['admin', 'album-art', albumId],
    queryFn: () => postRainwave('/api4/admin/album_art', { album_id: Number(albumId) }),
    enabled: Boolean(albumId),
  });

  return (
    <Stack spacing={3}>
      <PageSection
        title="Albums"
        subtitle="Station-scoped album list scaffold for cooldown and art workflows."
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            select
            label="Station"
            value={sid}
            onChange={(event): void => setSearchParams({ sid: event.target.value })}
            sx={{ width: 220 }}
            SelectProps={{ native: true }}
          >
            {[1, 2, 3, 4, 5, 6].map((option) => (
              <option key={option} value={String(option)}>
                {`Station ${option}`}
              </option>
            ))}
          </TextField>
          <Typography variant="body2" color="text.secondary">
            The detail pane uses URL state and the enriched `admin/album_songs` payload with
            `rating` and `rating_count`.
          </Typography>
        </Stack>
        {albumsQuery.error ? <RainwaveErrorAlert error={albumsQuery.error} /> : null}
        <DataGrid
          autoHeight
          loading={albumsQuery.isLoading}
          rows={albumsQuery.data?.admin_albums || []}
          columns={albumColumns}
          getRowId={(row): number => row.album_id}
          onRowClick={(params): void => {
            void navigate(`/albums/${params.row.album_id}?sid=${sid}`);
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
        title="Album Detail"
        subtitle="Read-only scaffold for the song, cooldown, and artwork workflows."
      >
        {songsQuery.error ? <RainwaveErrorAlert error={songsQuery.error} /> : null}
        {artQuery.error ? <RainwaveErrorAlert error={artQuery.error} /> : null}
        {!albumId ? (
          <Typography variant="body2" color="text.secondary">
            Select an album row to bind the song list and artwork panel to the URL.
          </Typography>
        ) : null}
        {songsQuery.data ? (
          <DataGrid
            autoHeight
            rows={songsQuery.data.admin_album_songs}
            columns={songColumns}
            getRowId={(row): number => row.song_id}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 10,
                  page: 0,
                },
              },
            }}
          />
        ) : null}
        {artQuery.data ? (
          <Stack spacing={1}>
            {artQuery.data.admin_album_art.map((item) => (
              <Typography key={`${item.sid}-${item.album_art}`} variant="body2">
                {`SID ${item.sid}: ${item.album_art}`}
              </Typography>
            ))}
          </Stack>
        ) : null}
      </PageSection>
    </Stack>
  );
}
