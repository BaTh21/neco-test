import { Close as CloseIcon, Image as ImageIcon, Videocam as VideocamIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from '@mui/material';
import { useFormik } from 'formik';
import { useRef, useState } from 'react';
import Draggable from "react-draggable";
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import { createDiary } from '../../services/api';

function DraggablePaper(props) {
  const nodeRef = useRef(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      handle="#draggable-dialog-title"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <div ref={nodeRef} style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
        <Paper {...props} />
      </div>
    </Draggable>
  );
}

const CreateDiaryDialog = ({ open, onClose, groups, onSuccess, setError }) => {
  const { t, i18n } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoPreviews, setVideoPreviews] = useState([]);

  const formik = useFormik({
    initialValues: {
      title: '',
      content: '',
      share_type: 'public',
      group_ids: [],
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Title is required'),
      content: Yup.string().required('Content is required'),
      share_type: Yup.string().oneOf(['public', 'friends', 'group', 'personal']),
      group_ids: Yup.array().when('share_type', {
        is: 'group',
        then: (schema) => schema.min(1, 'Please select at least one group'),
        otherwise: (schema) => schema.notRequired(),
      }),
    }),
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        setUploading(true);

        const formData = {
          title: values.title,
          content: values.content,
          share_type: values.share_type,
          group_ids: values.share_type === 'group' ? values.group_ids : [],
        };

        if (selectedImages.length > 0) {
          formData.images = selectedImages;
        }

        if (selectedVideos.length > 0) {
          formData.videos = selectedVideos;
        }

        await createDiary(formData);

        resetForm();
        setSelectedImages([]);
        setSelectedVideos([]);
        setImagePreviews([]);
        setVideoPreviews([]);
        onSuccess();

      } catch (err) {
        console.error('Create diary error:', err);
        setError(err.message || 'Failed to create diary');
      } finally {
        setUploading(false);
        setSubmitting(false);
      }
    },

  });

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);

    // Filter valid images
    const validImages = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      const isValidCount = selectedImages.length + files.length <= 10;

      if (!isValidType) {
        setError('Only image files are allowed (jpg, png, gif, etc.)');
        return false;
      }

      if (!isValidSize) {
        setError('Each image must be less than 10MB');
        return false;
      }

      if (!isValidCount) {
        setError('Maximum 10 images allowed');
        return false;
      }

      return true;
    });

    if (validImages.length === 0) return;

    // Add to selected images
    setSelectedImages(prev => [...prev, ...validImages]);

    // Create previews
    validImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, {
          url: e.target.result,
          name: file.name,
          size: file.size,
          type: 'image'
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoUpload = (event) => {
    const files = Array.from(event.target.files);

    // Filter valid videos
    const validVideos = files.filter(file => {
      const isValidType = file.type.startsWith('video/') ||
        ['.mp4', '.mov', '.avi', '.webm', '.mkv'].some(ext =>
          file.name.toLowerCase().endsWith(ext));
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB
      const isValidCount = selectedVideos.length + files.length <= 3;

      if (!isValidType) {
        setError('Only video files are allowed (mp4, mov, avi, webm, mkv)');
        return false;
      }

      if (!isValidSize) {
        setError('Each video must be less than 50MB');
        return false;
      }

      if (!isValidCount) {
        setError('Maximum 3 videos allowed');
        return false;
      }

      return true;
    });

    if (validVideos.length === 0) return;

    // Add to selected videos
    setSelectedVideos(prev => [...prev, ...validVideos]);

    // Create previews
    validVideos.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setVideoPreviews(prev => [...prev, {
          url: e.target.result,
          name: file.name,
          size: file.size,
          type: 'video',
          thumbnail: null // Placeholder for video thumbnail
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index, type) => {
    if (type === 'image') {
      setSelectedImages(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      setSelectedVideos(prev => prev.filter((_, i) => i !== index));
      setVideoPreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleClose = () => {
    formik.resetForm();
    setSelectedImages([]);
    setSelectedVideos([]);
    setImagePreviews([]);
    setVideoPreviews([]);
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileExtension = (fileName) => {
    return fileName.split('.').pop().toUpperCase();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxHeight: '90vh'
        }
      }}
      PaperComponent={DraggablePaper}
    >

      <DialogTitle id="draggable-dialog-title" sx={{ fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>
        {t('create_new_diary')}
      </DialogTitle>

      <DialogContent sx={{ mt: 2, pb: 2 }} >
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('title')}
            name="title"
            value={formik.values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.title && !!formik.errors.title}
            helperText={formik.touched.title && formik.errors.title}
            fullWidth
            required
            size="medium"
            disabled={uploading}
          />

          <TextField
            label={t('content')}
            name="content"
            multiline
            rows={4}
            value={formik.values.content}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.content && !!formik.errors.content}
            helperText={formik.touched.content && formik.errors.content}
            fullWidth
            required
            size="medium"
            disabled={uploading}
          />

          <FormControl fullWidth>
            <InputLabel>{t('share_type')}</InputLabel>
            <Select
              name="share_type"
              value={formik.values.share_type}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              label={t('share_type')}
              disabled={uploading}
            >
              <MenuItem value="public">{t('public')}</MenuItem>
              <MenuItem value="friends">{t('friends')}</MenuItem>
              <MenuItem value="group">{t('group')}</MenuItem>
              <MenuItem value="personal">{t('personal')}</MenuItem>
            </Select>
          </FormControl>

          {formik.values.share_type === 'group' && (
            <FormControl fullWidth>
              <InputLabel>{t('select_groups')}</InputLabel>
              <Select
                multiple
                name="group_ids"
                value={formik.values.group_ids}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                label="Groups"
                disabled={uploading}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {groups
                      .filter((group) => selected.includes(group.id))
                      .map((group) => (
                        <Chip key={group.id} label={group.name} size="small" />
                      ))}
                  </Box>
                )}
                error={formik.touched.group_ids && !!formik.errors.group_ids}
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    <Checkbox checked={formik.values.group_ids.includes(group.id)} />
                    <ListItemText primary={group.name} />
                  </MenuItem>
                ))}
              </Select>
              {formik.touched.group_ids && formik.errors.group_ids && (
                <Typography color="error" variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                  {formik.errors.group_ids}
                </Typography>
              )}
            </FormControl>
          )}

          {/* Media Upload Section */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              {t('add_media_optional')}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              {/* Image Upload */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageIcon />}
                  disabled={uploading || selectedImages.length >= 10}
                  sx={{ flexShrink: 0 }}
                >
                  {t('add_images')}
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {t('images_selected_info', {
                    count: selectedImages.length,
                    maxSize: '10MB'
                  })}
                </Typography>
              </Box>

              {/* Video Upload */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<VideocamIcon />}
                  disabled={uploading || selectedVideos.length >= 3}
                  sx={{ flexShrink: 0 }}
                >
                  {t('add_videos')}
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="video/*"
                    onChange={handleVideoUpload}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {t('videos_selected_info', {
                    count: selectedVideos.length,
                    maxSize: '50MB'
                  })}
                </Typography>
              </Box>
            </Box>

            {/* Media Previews */}
            {(imagePreviews.length > 0 || videoPreviews.length > 0) && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                 {t('selected_media', { count: imagePreviews.length + videoPreviews.length })}
                </Typography>

                {/* Images Grid */}
                {imagePreviews.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {t('images_preview', { count: imagePreviews.length })}
                    </Typography>
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: 1.5
                    }}>
                      {imagePreviews.map((preview, index) => (
                        <Box
                          key={`image-${index}`}
                          sx={{
                            position: 'relative',
                            borderRadius: 2,
                            overflow: 'hidden',
                            aspectRatio: '1'
                          }}
                        >
                          <img
                            src={preview.url}
                            alt={`Preview ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeMedia(index, 'image')}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'rgba(0,0,0,0.7)',
                              color: 'white',
                              width: 24,
                              height: 24,
                              '&:hover': {
                                bgcolor: 'rgba(0,0,0,0.9)',
                                color: 'error.light'
                              }
                            }}
                            disabled={uploading}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                          <Typography
                            variant="caption"
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              bgcolor: 'rgba(0,0,0,0.7)',
                              color: 'white',
                              px: 0.5,
                              py: 0.25,
                              fontSize: '0.6rem',
                              textAlign: 'center'
                            }}
                          >
                            {formatFileSize(preview.size)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Videos Grid */}
                {videoPreviews.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {t('videos_preview', { count: videoPreviews.length })}
                    </Typography>
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)'
                      },
                      gap: 1.5
                    }}>
                      {videoPreviews.map((preview, index) => (
                        <Box
                          key={`video-${index}`}
                          sx={{
                            position: 'relative',
                            borderRadius: 2,
                            overflow: 'hidden',
                            aspectRatio: '16/9',
                            bgcolor: '#000'
                          }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white'
                            }}
                          >
                            <VideocamIcon sx={{ fontSize: 40, mb: 1, opacity: 0.7 }} />
                            <Typography variant="caption" sx={{ textAlign: 'center', px: 1 }}>
                              {preview.name.length > 20
                                ? preview.name.substring(0, 20) + '...'
                                : preview.name}
                            </Typography>
                            <Typography variant="caption" sx={{ mt: 0.5, opacity: 0.8 }}>
                              {getFileExtension(preview.name)} • {formatFileSize(preview.size)}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => removeMedia(index, 'video')}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'rgba(0,0,0,0.7)',
                              color: 'white',
                              width: 24,
                              height: 24,
                              '&:hover': {
                                bgcolor: 'rgba(0,0,0,0.9)',
                                color: 'error.light'
                              }
                            }}
                            disabled={uploading}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 4,
                              left: 4,
                              bgcolor: 'rgba(0,0,0,0.7)',
                              color: 'white',
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              fontSize: '0.6rem',
                              fontWeight: 500
                            }}
                          >
                            {t('video')}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button
          onClick={handleClose}
          disabled={uploading}
        >
          {t('cancel')}
        </Button>
        <Button
          onClick={formik.handleSubmit}
          variant="contained"
          disabled={!formik.isValid || formik.isSubmitting || uploading}
          startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ minWidth: 120 }}
        >
          {uploading ? t('uploading') : t('create_diary')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDiaryDialog;