import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AdminPanelLayout } from '../components/AdminPanelLayout';
import { AlbumsPage } from '../routes/AlbumsPage';
import { DonationsPage } from '../routes/DonationsPage';
import { JsErrorsPage } from '../routes/JsErrorsPage';
import { MusicScanErrorsPage } from '../routes/MusicScanErrorsPage';
import { PowerHoursPage } from '../routes/PowerHoursPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminPanelLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/power-hours" replace />,
      },
      {
        path: 'js-errors',
        element: <JsErrorsPage />,
      },
      {
        path: 'music-scan-errors',
        element: <MusicScanErrorsPage />,
      },
      {
        path: 'donations',
        element: <DonationsPage />,
      },
      {
        path: 'power-hours',
        element: <PowerHoursPage />,
      },
      {
        path: 'power-hours/:schedId',
        element: <PowerHoursPage />,
      },
      {
        path: 'albums',
        element: <AlbumsPage />,
      },
      {
        path: 'albums/:albumId',
        element: <AlbumsPage />,
      },
    ],
  },
]);
