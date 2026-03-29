import type { JSX } from 'react';

import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import LibraryMusicOutlinedIcon from '@mui/icons-material/LibraryMusicOutlined';
import QueueMusicOutlinedIcon from '@mui/icons-material/QueueMusicOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { NavLink, Outlet } from 'react-router-dom';

const drawerWidth = 280;

const navigationItems = [
  { label: 'Power Hours', path: '/power-hours', icon: <QueueMusicOutlinedIcon /> },
  { label: 'Albums', path: '/albums', icon: <LibraryMusicOutlinedIcon /> },
  { label: 'Add Donation', path: '/donations', icon: <FavoriteBorderOutlinedIcon /> },
  { label: 'JS Errors', path: '/js-errors', icon: <BugReportOutlinedIcon /> },
  { label: 'Music Scan Errors', path: '/music-scan-errors', icon: <ReportProblemOutlinedIcon /> },
];

export function AdminPanelLayout(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="transparent" elevation={0} sx={{ ml: `${drawerWidth}px`, width: `calc(100% - ${drawerWidth}px)` }}>
        <Toolbar>
          <Typography variant="h5" component="h1">
            Rainwave Admin Panel
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="div">
            Admin Tools
          </Typography>
        </Toolbar>
        <List sx={{ px: 1 }}>
          {navigationItems.map((item) => (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&.active': {
                  bgcolor: 'action.selected',
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, ml: `${drawerWidth}px`, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
