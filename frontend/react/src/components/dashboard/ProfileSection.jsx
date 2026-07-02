// ProfileSection.jsx - Complete file with fixes
import {
  Article as ArticleIcon,
  CameraAlt,
  Delete,
  Edit,
  Lock,
  People,
  PhotoCamera,
  Settings,
  Verified
} from '@mui/icons-material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PublicIcon from '@mui/icons-material/Public';
import NorthIcon from '@mui/icons-material/North';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useFormik } from 'formik';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import { useAvatar } from '../../hooks/useAvatar';
import { deleteAvatar, getMyFeed, updateMe, uploadAvatar, getMyDiaryStats, getFavoriteDiaryList } from '../../services/api';
import ProfileDiary from '../diary/ProfileDiary';
import SystemLogs from '../SystemLogs';

const ProfileSection = ({ profile, setProfile, setError, setSuccess, friends, onNewDiary, groups, onSetting }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [avatarMenuAnchor, setAvatarMenuAnchor] = useState(null);
  const avatarMenuOpen = Boolean(avatarMenuAnchor);
  const [diaries, setDiaries] = useState([]);
  const [diariesLoading, setDiariesLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editMenuAnchor, setEditMenuAnchor] = useState(null);
  const [diaryCount, setDiaryCount] = useState(0);
  const [publicCount, setPublicCount] = useState(0);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const fileInputRef = useRef(null);
  const { getAvatarUrl, getUserInitials } = useAvatar();

  const scrollRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const [favorites, setFavorites] = useState([]);

  const handleSuccess = async () => {
    const feedData = await fetchUserDiaries(true);
    setDiaries(feedData);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let timeout = null;

    const onScroll = () => {
      if (timeout) return;
      timeout = setTimeout(() => {
        const scrollTop = el.scrollTop;
        const scrollHeight = el.scrollHeight;
        const clientHeight = el.clientHeight;

        setVisible(prev => {
          if ((scrollTop > 300) !== prev) return scrollTop > 300;
          return prev;
        });

        if (scrollTop + clientHeight >= scrollHeight - 200 && !diariesLoading) {
          fetchUserDiaries(false);
        }

        timeout = null;
      }, 200);
    };

    el.addEventListener("scroll", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (timeout) clearTimeout(timeout);
    };
  }, [profile?.id, diariesLoading]);

  const scrollToTop = () => {
    scrollRef.current.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const fetchUserDiaries = async (reset = false) => {
    if (diariesLoading) return;

    try {
      setDiariesLoading(true);
      const offset = reset ? 0 : diaries.length;

      let feedData = await getMyFeed(25, offset);

      if (activeTab === 1) {
        feedData = feedData.filter(d => d.author.id === profile?.id && d.share_type === 'personal');
      } else {
        feedData = feedData.filter(d => d.author.id === profile?.id);
      }

      setDiaries(prev => {
        const all = reset ? feedData : [...prev, ...feedData];
        return Array.from(new Map(all.map(d => [d.id, d])).values());
      });

      return feedData;
    } catch (err) {
      setError(err.message || t('failed_to_load_diaries'));
      return [];
    } finally {
      setDiariesLoading(false);
    }
  };

  const fetchStats = async () => {
    const favoriteList = await getFavoriteDiaryList();

    setFavorites(favoriteList);

    const data = await getMyDiaryStats();
    setDiaryCount(data.total);
    setPublicCount(data.public);
  };

  useEffect(() => {
    if (!profile?.id) return;

    fetchUserDiaries(true);
    fetchStats();
  }, [profile?.id, activeTab]);


  const formik = useFormik({
    initialValues: {
      username: profile?.username || '',
      bio: profile?.bio || '',
    },
    validationSchema: Yup.object({
      username: Yup.string().min(3, t('username_min')).required(t('required')),
      bio: Yup.string().max(500, t('bio_max')),
    }),
    enableReinitialize: true,
    onSubmit: async (values) => {
      setError(null);
      setSuccess(null);
      setLoading(true);
      try {
        let avatarUrl = profile?.avatar_url;
        if (selectedFile) {
          setUploading(true);
          const uploadResponse = await uploadAvatar(selectedFile);
          avatarUrl = uploadResponse.avatar_url;
          setUploading(false);
        }

        const updateData = {
          username: values.username,
          bio: values.bio,
          ...(avatarUrl && { avatar_url: avatarUrl }),
        };

        const cleanData = Object.fromEntries(
          Object.entries(updateData).filter(([, value]) => value !== '' && value !== null)
        );

        const response = await updateMe(cleanData);
        setProfile(response);
        setSuccess(selectedFile ? t('profile_avatar_updated') : t('profile_updated'));
        setTimeout(() => setSuccess(null), 2000);

        setSelectedFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsEditing(false);
      } catch (err) {
        setError(err.response?.data?.detail || err.message || t('update_failed'));
      } finally {
        setLoading(false);
      }
    },
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(t('invalid_image_type'));
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(t('image_too_large'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setSelectedFile(file);
    setError(null);

    setIsEditing(true);
  };

  const confirmDeleteAvatar = async () => {
    setDeleting(true);
    try {
      await deleteAvatar();
      setProfile({ ...profile, avatar_url: null });
      setSuccess(t('avatar_deleted_success'));
      setImagePreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.detail || err.message || t('delete_failed'));
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleEditMenuClose = () => {
    setEditMenuAnchor(null);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    handleEditMenuClose();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    formik.resetForm();
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentAvatarUrl = imagePreview || getAvatarUrl(profile?.avatar_url);

  const getStatistics = () => {

    return [
      {
        label: t('total_diaries'),
        value: diaryCount,
        icon: <MenuBookIcon />,
        color: 'primary'
      },
      {
        label: t('public'),
        value: publicCount,
        icon: <PublicIcon />,
        color: 'success'
      },
      {
        label: t('friends'),
        value: friends.length,
        icon: <People />,
        color: 'secondary'
      }
    ];
  };

  const stats = getStatistics();

  return (
    <Box
      ref={scrollRef}
      sx={{
        height: '90vh',
        overflowY: 'auto',
        // '&::-webkit-scrollbar': { display: 'none' },
        // scrollbarWidth: 'none',
      }}
    >
      <Button onClick={scrollToTop} sx={{ position: "absolute", bottom: 20, right: { xs: 20 }, fontSize: "16px", borderRadius: "50%", border: "none", color: "white", backgroundColor: '#254D70', cursor: "pointer", display: visible ? "flex" : "none", zIndex: 1300, minWidth: 0, width: 45, height: 45 }}><NorthIcon /></Button>
      <Box
        sx={{
          py: { xs: 2 },
          px: { xs: 0, sm: 4 },
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            zIndex: -1,
          }
        }}
      >
        <Box sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexDirection: { xs: 'column', md: 'row' }
        }}>
          <Box>
            <Box
              sx={{
                position: 'relative',
                width: { xs: 140, sm: 160, md: 180 },
                height: { xs: 140, sm: 160, md: 180 },
                mx: { xs: 'auto', md: 0 },
              }}
            >
              <Box
                onClick={() => setAvatarMenuAnchor(document.getElementById('avatar-container'))}
                id="avatar-container"
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer',
                }}
              >
                <Avatar
                  src={currentAvatarUrl}
                  alt={profile?.username}
                  sx={{
                    width: '100%',
                    height: '100%',
                    fontSize: { xs: '3rem', sm: '3.5rem' },
                    bgcolor: 'primary.light',
                    border: `4px solid ${theme.palette.background.paper}`,
                    boxShadow: 4,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: 8,
                    }
                  }}
                >
                  {getUserInitials(profile?.username)}
                </Avatar>

                {/* Camera Icon Overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    bgcolor: 'background.paper',
                    width: { xs: 25, md: 36 },
                    height: { xs: 25, md: 36 },
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${theme.palette.primary.main}`,
                    color: 'primary.main',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      bgcolor: 'primary.main',
                      color: 'white',
                    }
                  }}
                >
                  <PhotoCamera sx={{ fontSize: 18 }} />
                </Box>

                {/* Verified Badge */}
                {profile?.is_verified && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: { xs: 8, md: 15 },
                      right: { xs: 8, md: 15 },
                      bgcolor: 'success.main',
                      color: 'white',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${theme.palette.background.paper}`,
                      boxShadow: 2,
                    }}
                  >
                    <Verified sx={{ fontSize: 14 }} />
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              width: { xs: '100%', md: '100%' },
              textAlign: { xs: 'center', md: 'start' }
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', },
                justifyContent: { xs: 'center', md: 'start' },
                alignItems: { xs: 'center', md: 'start' }
              }}
            >
              <Stack>
                {isEditing ? (
                  <TextField
                    variant="outlined"
                    size="small"
                    name="username"
                    value={formik.values.username}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.username && Boolean(formik.errors.username)}
                    helperText={formik.touched.username && formik.errors.username}
                    sx={{
                      maxWidth: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        mb: 1
                      }
                    }}
                  />
                ) : (
                  <>
                    <Typography
                      variant="h4"
                      fontWeight={800}
                      sx={{
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'primary.main',
                        fontSize: 24
                      }}
                    >
                      {profile?.username}
                    </Typography>

                    <Menu
                      anchorEl={editMenuAnchor}
                      open={Boolean(editMenuAnchor)}
                      onClose={handleEditMenuClose}
                      PaperProps={{
                        sx: {
                          borderRadius: 2,
                          minWidth: 150,
                          mt: 1,
                        }
                      }}
                    >
                      <MenuItem onClick={handleEditClick}>
                        <Edit sx={{ mr: 1, fontSize: 20 }} />
                        {t('edit_profile')}
                      </MenuItem>
                      <MenuItem onClick={() => fileInputRef.current?.click()}>
                        <CameraAlt sx={{ mr: 1, fontSize: 20 }} />
                        {t('change_photo')}
                      </MenuItem>
                      <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
                        <Delete sx={{ mr: 1, fontSize: 20 }} />
                        {t('delete_photo')}
                      </MenuItem>
                    </Menu>
                  </>
                )}
              </Stack>

              {isEditing ? (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  size="small"
                  name="bio"
                  value={formik.values.bio}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.bio && Boolean(formik.errors.bio)}
                  helperText={formik.touched.bio && formik.errors.bio}
                  placeholder={t('write_your_bio')}
                  sx={{
                    maxWidth: 400,
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              ) : (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    mb: 1,
                    maxWidth: 400,
                    mx: { xs: 'auto', md: 0 },
                    lineHeight: 1.6,
                    fontStyle: profile?.bio ? 'normal' : 'italic',
                  }}
                >
                  {profile?.bio || t('no_bio_yet')}
                </Typography>
              )}

              {stats.length > 0 && (
                <Box
                  direction="row"
                  sx={{
                    mb: 1,
                    display: 'flex'
                  }}
                >
                  {stats.map((stat, index) => (
                    <Box
                      key={index}
                      sx={{
                        textAlign: 'center',
                        minWidth: { xs: 75, sm: 80 },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mb: 0.5,
                          color: 'primary.main'
                        }}
                      >
                        {stat.icon}
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        <Typography
                          fontWeight={700}
                          color={`${stat.color}.main`}
                        >
                          {stat.value}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          {stat.label}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {isEditing ? (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size='small'
                    onClick={formik.handleSubmit}
                    disabled={loading || uploading}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4,
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {loading || uploading ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        {uploading ? t('uploading') : t('saving')}
                      </>
                    ) : (
                      t('save_changes')
                    )}
                  </Button>
                  <Button
                    variant="outlined"
                    size='small'
                    onClick={handleCancelEdit}
                    disabled={loading}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {t('cancel')}
                  </Button>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size='small'
                    onClick={handleEditClick}
                    startIcon={<Edit />}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4,
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {t('edit_profile')}
                  </Button>
                  <Tooltip title={t('settings')}>
                    <IconButton
                      variant="outlined"
                      size='small'
                      // onClick={() => setSettingsDialogOpen(true)}
                      onClick={onSetting}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                        color: 'primary.main'
                      }}
                    >
                      <Settings />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 4,
          my: 2,
          alignItems: 'center'
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: 0,
            bgcolor: 'transparent',
            borderBottom: 2,
            borderColor: 'divider',
            width: { xs: '50%', md: 500 }
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              }
            }}
          >
            <Tab
              icon={<MenuBookIcon />}
              label={isMobile ? '' : t('my_diaries')}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: 14,
                textTransform: 'none',
                minHeight: 40,
                minWidth: { xs: 10, sm: 120 },
              }}
            />
            <Tab
              icon={<Lock />}
              label={isMobile ? '' : t('private')}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: 14,
                textTransform: 'none',
                minHeight: 40,
                minWidth: { xs: 10, sm: 120 },
              }}
            />
            <Tab
              icon={<BookmarksIcon />}
              label={isMobile ? '' : t('saved')}
              iconPosition="start"
              sx={{
                fontWeight: 600,
                fontSize: 14,
                textTransform: 'none',
                minHeight: 40,
                minWidth: { xs: 10, sm: 120 },
              }}
            />
          </Tabs>
        </Paper>

        <Button
          variant="contained"
          onClick={onNewDiary}
          startIcon={<ArticleIcon />}
          sx={{
            borderRadius: '8px',
            width: { sm: 150 },
            height: 38
          }}
        >
          {isMobile ? t('new') : t('new_diary')}
        </Button>
      </Box>

      {(activeTab === 0 || activeTab === 1) && (
        <ProfileDiary
          groups={groups}
          diaries={diaries}
          profile={profile}
          onDataUpdate={handleSuccess}
          friends={friends}
          fetchStats={fetchStats}
        />
      )}

      {activeTab === 2 && (
        <ProfileDiary
          groups={groups}
          diaries={favorites}
          profile={profile}
          onDataUpdate={handleSuccess}
          friends={friends}
          fetchStats={fetchStats}
        />
      )}

      <Menu
        anchorEl={avatarMenuAnchor}
        open={avatarMenuOpen}
        onClose={() => setAvatarMenuAnchor(null)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 180,
            mt: 1,
            py: 0.5,
          }
        }}
      >
        <MenuItem onClick={() => { setAvatarMenuAnchor(null); fileInputRef.current?.click(); }}>
          <ListItemIcon>
            <PhotoCamera fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('upload_new_photo')} />
        </MenuItem>
        {profile?.avatar_url && (
          <MenuItem
            onClick={() => { setAvatarMenuAnchor(null); setDeleteDialogOpen(true); }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <Delete fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('delete_photo')} />
          </MenuItem>
        )}
      </Menu>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxWidth: 400,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          {t('delete_profile_photo')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('delete_photo_confirmation')}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 500,
            }}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={confirmDeleteAvatar}
            color="error"
            variant="contained"
            disabled={deleting}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 500,
            }}
          >
            {deleting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              t('delete')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog with System Logs */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            height: '80vh',
            maxHeight: 800,
          }
        }}
      >
        <DialogTitle sx={{
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 2,
          px: 3
        }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Settings />
            <Typography variant="h6" fontWeight={600} component="span">
              {t('settings')}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          <SystemLogs />
        </DialogContent>
        <DialogActions sx={{
          borderTop: 1,
          borderColor: 'divider',
          p: 2
        }}>
          <Button
            onClick={() => setSettingsDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
      />
    </Box>
  );
};

export default ProfileSection;