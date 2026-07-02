
import {
  Computer,
  DesktopWindows,
  KeyboardArrowDown,
  KeyboardArrowUp,
  PhoneAndroid,
  Tablet,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Fab,
  List,
  ListItem,
  ListItemIcon,
  Stack,
  Typography,
  Zoom
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMyDevices } from '../services/api';
import { formatCambodiaTime } from '../utils/dateUtils';

const SystemLogs = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  const scrollContainerRef = useRef(null);

  const getDeviceIcon = (deviceType) => {
    if (!deviceType) return <Computer />;

    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <PhoneAndroid />;
      case 'tablet':
        return <Tablet />;
      case 'desktop':
        return <DesktopWindows />;
      default:
        return <Computer />;
    }
  };

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const devicesData = await getMyDevices();
      setDevices(Array.isArray(devicesData) ? devicesData : []);
    } catch (err) {
      console.error('Fetch devices error:', err);
      setError(err.message || t('failed_to_load_devices'));
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Detect if scrolling is needed and show/hide buttons
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const hasOverflow = container.scrollHeight > container.clientHeight + 20;
      setShowScrollButtons(hasOverflow);
    };

    checkScroll();

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);

    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [devices]);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '77vh', overflowY: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <Box sx={{ p: 0, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            {t('active_devices')}
          </Typography>
          <Chip
            label={`${devices.length} ${t('devices')}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" mt={1}>
          {t('active_devices_description') || 'View all devices currently logged into your account.'}
        </Typography>
      </Box>

      {/* Scrollable Device List */}
      <Box
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          height: '80vh',
          px: 0,
          py: 2,
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {devices.length === 0 ? (
          <Typography color="text.secondary" align="center" py={8}>
            {t('no_devices_found')}
          </Typography>
        ) : (
          <List disablePadding>
            {devices.map((device, index) => (
              <React.Fragment key={device.id || index}>
                <ListItem
                  sx={{
                    borderRadius: 2,
                    mb: 2,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 48 }}>
                    {getDeviceIcon(device.device_type)}
                  </ListItemIcon>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {device.device_name || t('unknown_device')}
                    </Typography>

                    <Stack spacing={0.5} mt={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        {device.browser || 'Unknown'} • {device.os || 'Unknown'}
                      </Typography>

                      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                        <Typography variant="caption" color="text.secondary">
                          <strong>IP:</strong> {device.ip_address || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>{t('last_login')}:</strong> {formatCambodiaTime(device.last_login)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>

                  <Chip
                    icon={getDeviceIcon(device.device_type)}
                    label={device.device_type?.charAt(0).toUpperCase() + device.device_type?.slice(1) || t('unknown')}
                    size="small"
                    variant="outlined"
                    color="default"
                  />
                </ListItem>

                {index < devices.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* Floating Scroll Buttons - Only show when needed */}
      <Zoom in={showScrollButtons}>
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            zIndex: 10,
          }}
        >
          <Fab size="small" color="primary" onClick={scrollToBottom} aria-label="scroll to bottom">
            <KeyboardArrowDown />
          </Fab>

          <Fab size="small" color="primary" onClick={scrollToTop} aria-label="scroll to top">
            <KeyboardArrowUp />
          </Fab>
        </Box>
      </Zoom>
    </Box>
  );
};

export default SystemLogs;