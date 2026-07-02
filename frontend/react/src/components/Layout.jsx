import { AppBar, Avatar, Box, Button, Drawer, IconButton, Menu, MenuItem, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import Badge from '@mui/material/Badge';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMe, getActivityInbox, getUnreadMessage } from '../services/api';
import DeleteDialog from './dialogs/DeleteDialog';
import LogoImg from '/whisperspace.png';
import { initOneSignal } from '../hooks/oneSignal';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import MailIcon from '@mui/icons-material/Mail';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import InboxComponent from './dialogs/InboxComponent';
import SettingsIcon from '@mui/icons-material/Settings';
import CambodiaImg from '../assets/cambodia.png';
import EnglishImg from '../assets/english.png';
import ModeCommentRoundedIcon from '@mui/icons-material/ModeCommentRounded';
import { useUnreadMessages } from '../context/unreadMessagesContext';
import ChatIcon from '../assets/bubble.png';

const Layout = ({ children, onProfileClick, setNewActiveTab }) => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [popup, setPopup] = useState(false);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showLabel, setShowLabel] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [langAnchorEl, setLangAnchorEl] = useState(null);
  const langMenuOpen = Boolean(langAnchorEl);

  const [activities, setActivities] = useState([]);

  const { unreadMessages } = useUnreadMessages();

  const unreadCount = useMemo(
    () => activities.filter(a => !a.is_read).length,
    [activities]
  );

  const [currentTime, setCurrentTime] = useState({ desktop: '', mobile: '' });

  const pathToTabMap = {
    '/feed': 0,
    '/messages': 1,
    '/friends': 2,
    '/notes': 3,
    '/profile': 4,
    '/setting': 5
  };

  const [activeTab, setActiveTab] = useState(pathToTabMap[location.pathname] || 0);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const updateCambodiaTime = () => {
    const now = new Date();

    const commonOptions = {
      timeZone: 'Asia/Phnom_Penh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };

    const desktopOptions = {
      ...commonOptions,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    };
    const desktopFormatter = new Intl.DateTimeFormat('en-US', desktopOptions);
    const desktopParts = desktopFormatter.formatToParts(now);
    const getDesktop = (type) => desktopParts.find(p => p.type === type)?.value || '';
    const desktopTime = `${getDesktop('weekday')}, ${getDesktop('day')} ${getDesktop('month')} • ${getDesktop('hour')}:${getDesktop('minute')} ${getDesktop('dayPeriod')}`;

    const mobileFormatter = new Intl.DateTimeFormat('en-US', commonOptions);
    const mobileParts = mobileFormatter.formatToParts(now);
    const getMobile = (type) => mobileParts.find(p => p.type === type)?.value || '';
    const mobileTime = `${getMobile('hour')}:${getMobile('minute')} ${getMobile('dayPeriod')}`;

    setCurrentTime({ desktop: desktopTime, mobile: mobileTime });
  };

  const fetchMe = async () => {
    try {
      const res = await getMe();
      setProfile(res);

      const acRes = await getActivityInbox();
      setActivities(acRes);

    } catch (error) {
      console.log("Failed to get profile", error);

      setActivities([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const currentTab = pathToTabMap[location.pathname] || 0;
    setActiveTab(currentTab);
  }, [location.pathname]);

  // Update time every second
  useEffect(() => {
    updateCambodiaTime();
    const intervalId = setInterval(updateCambodiaTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSuccess = () => {
    setPopup(false);
    fetchInvites();
  };

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLangMenuOpen = (event) => setLangAnchorEl(event.currentTarget);
  const handleLangMenuClose = () => setLangAnchorEl(null);
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    handleLangMenuClose();
  };

  const handleHomePageClick = () => navigate("/feed");
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    const tabToPathMap = {
      0: '/feed',
      1: '/messages',
      2: '/friends',
      3: '/notes',
      4: '/profile',
      5: '/setting'
    };
    const newPath = tabToPathMap[newValue] || '/feed';
    navigate(newPath);
    if (setNewActiveTab) setNewActiveTab(newValue);
  };

  const isEnglish = localStorage.getItem("i18nextLng");

  useEffect(() => {
    initOneSignal();
  }, []);

  const drawer = (
    <Box
      sx={{
        width: showLabel ? 200 : 40,
        transition: "width 0.25s",
        bgcolor: "white",
        borderRight: "1px solid #e2e2e2",
        display: "flex",
        flexDirection: "column",
        mt: { md: 1, xs: 0 }
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <IconButton onClick={() => setShowLabel(x => !x)}>
          <MenuIcon />
        </IconButton>
      </Box>
      <Tabs
        orientation="vertical"
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          width: "100%",
          position: 'relative',
          "& .MuiTab-root": {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: showLabel ? "flex-start" : "flex-start",
            gap: showLabel ? 1.5 : 0,
            px: showLabel ? 2 : 1,
            py: 1.2,
            mb: 0.5,
            minHeight: 48,
            textTransform: "none",
            fontSize: "0.9rem",
            color: "#5f6368",
            opacity: showLabel ? 1 : 0.9,
            transition: "0.2s",
            "&:hover": { bgcolor: "rgba(0,0,0,0.05)" },
          },
          "& .Mui-selected": {
            bgcolor: "primary.main",
            color: "white !important",
            fontWeight: "bold",
            "& .MuiSvgIcon-root": { color: "white !important" },
          },
          "& .MuiTab-iconWrapper": { marginBottom: "0 !important" },
        }}
      >
        <Tab icon={<HomeIcon />} label={showLabel ? t("feed") : null} />
        <Tab icon={<ModeCommentRoundedIcon />} label={showLabel ? t("messages") : null} />
        <Tab icon={<PeopleIcon />} label={showLabel ? t("friends") : null} />
        <Tab icon={<StickyNote2Icon />} label={showLabel ? t("notes") : null} />
        <Tab icon={<PersonIcon />} label={showLabel ? t("profile") : null} sx={{ mt: 35 }} />
        <Tab icon={<SettingsIcon />} label={showLabel ? t("setting") : null} />
      </Tabs>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', width: '100vw', minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: showLabel ? 200 : 40,
          flexDirection: 'column',
          bgcolor: 'white',
          borderRight: '1px solid #e2e2e2',
          transition: "width 0.25s",
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={() => setShowLabel(x => !x)}>
            <MenuIcon />
          </IconButton>
        </Box>
        {drawer}
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          "& .MuiDrawer-paper": { width: showLabel ? 200 : 40 },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="fixed">
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            {/* Left: Logo + Mobile Menu */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <IconButton color="inherit" onClick={handleDrawerToggle}>
                  <MenuIcon />
                </IconButton>
              </Box>
              <Box component="img" onClick={handleHomePageClick} src={LogoImg} alt="logo" sx={{ width: 50, cursor: 'pointer', '&:hover': { transform: 'scale(1.1)' } }} />
              <Typography variant="h6" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {t("appName")}
              </Typography>
            </Box>

            {/* Right Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 } }}>
              {/* Time Display */}
              {isAuthenticated && (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: { xs: 0.8, sm: 1.5 },
                  py: 0.5,
                  borderRadius: 1,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                }}>
                  <AccessTimeIcon sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' }, opacity: 0.8 }} />
                  <Typography variant="body2" sx={{
                    fontWeight: 'medium',
                    fontSize: { xs: '0.8rem', sm: '0.85rem' },
                    fontFamily: 'monospace',
                    letterSpacing: '0.3px',
                    whiteSpace: 'nowrap'
                  }}>
                    {/* Use desktop format on md+, mobile format on xs */}
                    {currentTime.desktop && currentTime.mobile
                      ? (window.innerWidth >= 900 ? currentTime.desktop : currentTime.mobile)
                      : 'Loading...'}
                  </Typography>
                </Box>
              )}

              {/* Language Button */}
              {isAuthenticated && (
                <>
                  {isEnglish === 'km' ? (
                    <img
                      src={CambodiaImg}
                      alt="Cambodia"
                      style={{
                        width: 24,
                        height: 16,
                        marginLeft: 4,
                        transition: 'transform 0.2s',  // smooth transition
                        cursor: 'pointer',             // optional, shows pointer
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onClick={handleLangMenuOpen} />
                  ) : (
                    <img
                      src={EnglishImg}
                      alt="Cambodia"
                      style={{
                        width: 24,
                        height: 16,
                        marginLeft: 4,
                        transition: 'transform 0.2s',  // smooth transition
                        cursor: 'pointer',             // optional, shows pointer
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onClick={handleLangMenuOpen} />
                  )}
                  <Menu
                    anchorEl={langAnchorEl}
                    open={langMenuOpen}
                    onClose={handleLangMenuClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{
                      sx: { mt: 1, minWidth: 140 }
                    }}
                  >
                    <MenuItem onClick={() => changeLanguage('en')}>
                      <img src="/flags/uk.png" alt="English" style={{ width: 20, height: 14, marginRight: 8 }} />
                      English
                    </MenuItem>
                    <MenuItem onClick={() => changeLanguage('km')}>
                      <img src="/flags/kh.png" alt="Khmer" style={{ width: 20, height: 14, marginRight: 8 }} />
                      ភាសាខ្មែរ
                    </MenuItem>
                  </Menu>
                </>
              )}

              {/* Guest or Authenticated */}
              {!isAuthenticated ? (
                <>
                  <Button color="inherit" component={Link} to="/register" sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 500 }}>
                    {t("register")}
                  </Button>
                  <Button color="inherit" component={Link} to="/login" sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 500 }}>
                    {t("login")}
                  </Button>
                </>
              ) : (
                /* Authenticated User */
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Mail Icon */}
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <Badge
                      badgeContent={unreadCount}
                      color="error"
                      overlap="circular"
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.7rem',
                          height: 18,
                          minWidth: 18,
                        },
                      }}
                    >
                      <IconButton
                        color="inherit"
                        onClick={() => setPopup(true)}
                        sx={{
                          p: 1,
                          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                        }}
                      >
                        <MailIcon sx={{ fontSize: '1.5rem' }} />
                      </IconButton>
                    </Badge>

                    <Badge
                      badgeContent={unreadMessages}
                      color="error"
                      overlap="circular"
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.7rem',
                          height: 18,
                          minWidth: 18,
                        },
                      }}
                    >
                      <IconButton
                        color="inherit"
                        onClick={() => navigate("/messages")}
                        sx={{
                          p: 1,
                          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                        }}
                      >
                        <img
                          src={ChatIcon}
                          alt="Chat"
                          style={{
                            width: 24,
                            height: 24,
                            display: 'block',
                          }}
                        />
                      </IconButton>
                    </Badge>

                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.9 }
                    }}
                    onClick={handleMenuOpen}
                  >
                    <Avatar
                      src={profile?.avatar_url}
                      sx={{
                        width: 32,
                        height: 32,
                        border: '2px solid rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      {profile?.username?.charAt(0)?.toUpperCase() || "P"}
                    </Avatar>
                    <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 500, fontSize: '0.95rem', color: 'white' }}>
                      {profile?.username}
                    </Typography>
                  </Box>

                  {/* User Menu */}
                  <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose} PaperProps={{ sx: { mt: 1, minWidth: 180 } }}>
                    <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); if (onProfileClick) onProfileClick(4); }}>
                      <PersonIcon sx={{ mr: 1.5 }} /> {t("profile")}
                    </MenuItem>
                    <MenuItem onClick={() => { handleMenuClose(); setOpen(true); }}>
                      <LogoutIcon sx={{ mr: 1.5 }} /> {t("logout")}
                    </MenuItem>
                  </Menu>
                </Box>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        <Box >{children}</Box>

        {/* Dialogs */}
        {isAuthenticated &&
          <InboxComponent
            open={popup}
            onClose={() => {
              setPopup(false);
              fetchMe();
            }
            }
            onSuccess={handleSuccess} />}
        <DeleteDialog
          open={open}
          onClose={() => setOpen(false)}
          title={t("logout")}
          tag="Logout"
          description={t("logoutConfirm")}
          onConfirm={handleLogout}
        />
      </Box>
    </Box>
  );
};

export default Layout;