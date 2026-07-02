import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Tooltip, Typography
} from '@mui/material';
import { useFormik } from 'formik';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import { createDiary } from '../../services/api';

const CreateDiaryComposer = ({ user, groups, onSuccess, setError }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [showContent, setShowContent] = useState(false);
  const getPreviewUrl = (file) => URL.createObjectURL(file);

  const formik = useFormik({
    initialValues: {
      title: '',
      content: '',
      share_type: 'public',
      group_ids: []
    },
    validationSchema: Yup.object({
      title: Yup.string(),
      content: Yup.string(),
      group_ids: Yup.array().when('share_type', {
        is: 'group',
        then: (schema) => schema.min(1, t('select_group')),
        otherwise: (schema) => schema.notRequired()
      })
    }),
    validateOnMount: true,
    onSubmit: async (values, { resetForm }) => {
      try {
        setUploading(true);

        await createDiary({
          title: values.title,
          content: values.content,
          share_type: values.share_type,
          group_ids: values.share_type === 'group' ? values.group_ids : [],
          images: selectedImages,
          videos: selectedVideos
        });

        resetForm();
        setSelectedImages([]);
        setSelectedVideos([]);
        onSuccess();
      } catch (err) {
        setError(err.message || t('failed_create_diary'));
      } finally {
        setUploading(false);
      }
    }
  });

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 10 - selectedImages.length);
    setSelectedImages((prev) => [...prev, ...files]);
  };

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 3 - selectedVideos.length);
    setSelectedVideos((prev) => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index) => {
    setSelectedVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const isPostDisabled =
    uploading ||
    !(
      formik.values.title ||
      formik.values.content ||
      selectedImages.length > 0 ||
      selectedVideos.length > 0
    );

  const handleCancel = () => {
    formik.resetForm();
    setSelectedImages([]);
    setSelectedVideos([]);
    setShowContent(false);
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, border: 1, borderColor: 'divider', p: 2, mb: 2, position: 'relative' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Avatar src={user?.avatar_url} alt={user?.username}>
          {user?.username?.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1 }}>

          <TextField
            placeholder={t('whats_on_your_mind')}
            name="title"
            value={formik.values.title}
            onChange={formik.handleChange}
            onFocus={() => setShowContent(true)}
            variant="standard"
            fullWidth
            InputProps={{
              disableUnderline: true,
              sx: { fontSize: '1.1rem', fontWeight: 'bold' }
            }}
          />

          {showContent && (
            <TextField
              placeholder={t('enter_content')}
              name="content"
              multiline
              minRows={3}
              maxRows={10}
              value={formik.values.content}
              onChange={formik.handleChange}
              variant="standard"
              fullWidth
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: '1rem' }
              }}
              sx={{ mt: 1 }}
            />
          )}

        </Box>
      </Box>

      <Box sx={{ position: 'absolute', top: 0, right: 0, display: 'flex' }}>
        {showContent && (
          <Tooltip title="Clear all">
            <IconButton onClick={handleCancel} sx={{ minWidth: 0, '&:hover': { backgroundColor: 'transparent', transform: 'scale(1.1)' } }}>
              <CloseIcon sx={{ fontSize: { xs: 24, md: 28 }, color: 'error.main' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Group Selection (only when share_type is 'group') */}
      {formik.values.share_type === 'group' && groups?.length > 0 && (
        <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
          <InputLabel>{t('select_groups')}</InputLabel>
          <Select
            multiple
            name="group_ids"
            value={formik.values.group_ids}
            onChange={formik.handleChange}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {groups
                  .filter((g) => selected.includes(g.id))
                  .map((g) => (
                    <Chip key={g.id} label={g.name} size="small" />
                  ))}
              </Box>
            )}
          >
            {groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                <Checkbox checked={formik.values.group_ids.includes(g.id)} />
                <ListItemText primary={g.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title='Please enter title and content first'>
            <Button component="label" sx={{ minWidth: 0 }}
            >
              <ImageIcon color="success" />
              <Typography sx={{ ml: 1, display: { xs: 'none', md: 'block' } }}>
                {t('photo')}
              </Typography>
              <Typography sx={{ ml: 1 }}>
                {selectedImages.length ? (selectedImages.length) : ('')}
              </Typography>
              <input hidden multiple type="file" accept="image/*" onChange={handleImageUpload} />
            </Button>
          </Tooltip>

          <Tooltip title='Please enter title and content first'>
            <Button component="label" sx={{ minWidth: 0 }}
            >
              <VideocamIcon color="error" />
              <Typography sx={{ ml: 1, display: { xs: 'none', md: 'block' } }}>
                {t('video')}
              </Typography>
              <Typography sx={{ ml: 1 }}>
                {selectedVideos.length ? (selectedVideos.length) : ''}
              </Typography>
              <input hidden multiple type="file" accept="video/*" onChange={handleVideoUpload} />
            </Button>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl size="small">
            <Select
              name="share_type"
              value={formik.values.share_type}
              onChange={formik.handleChange}
              displayEmpty
            >
              <MenuItem value="public">{t('public')}</MenuItem>
              <MenuItem value="friends">{t('friends')}</MenuItem>
              <MenuItem value="group">{t('group')}</MenuItem>
              <MenuItem value="personal">{t('personal')}</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            disabled={isPostDisabled}
            onClick={formik.handleSubmit}
            sx={{
              borderRadius: 1
            }}
          >
            {uploading ? t('publishing') : t('publish')}
          </Button>
        </Box>
      </Box>

      {(selectedImages.length > 0 || selectedVideos.length > 0) && (
        <Box sx={{ mt: 2 }}>
          {/* Image previews */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedImages.map((file, index) => (
              <Box
                key={index}
                sx={{
                  position: 'relative',
                  width: 100,
                  height: 100,
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: 1,
                  borderColor: 'divider'
                }}
              >
                <img
                  src={getPreviewUrl(file)}
                  alt="preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                <IconButton
                  size="small"
                  onClick={() => removeImage(index)}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>

          {/* Video previews */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            {selectedVideos.map((file, index) => (
              <Box
                key={index}
                sx={{
                  position: 'relative',
                  width: 160,
                  height: 100,
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: 1,
                  borderColor: 'divider'
                }}
              >
                <video
                  src={getPreviewUrl(file)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  muted
                />

                <IconButton
                  size="small"
                  onClick={() => removeVideo(index)}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box >
  );
};

export default CreateDiaryComposer;