import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { createDiaryForGroup } from '../../services/api';
import { toast } from 'react-toastify';

const CreateDiaryForGroupDialog = ({ open, onClose, group, onSuccess }) => {
  const formik = useFormik({
    initialValues: {
      title: '',
      content: '',
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Title is required'),
      content: Yup.string().required('Content is required'),
    }),
    validateOnMount: true,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        if (!group?.id) {
          toast.error("Group not found or invalid");
          return;
        }

        const payload = {
          title: values.title,
          content: values.content,
        };

        await createDiaryForGroup(group.id, payload);

        toast.success("Diary has been created successfully");
        resetForm();
        onSuccess?.();
        handleClose();
      } catch (error) {
        console.error('Error creating diary for group:', error);
        toast.error(error.message || 'Failed to create diary');
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>Create New Diary</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            label="Title"
            name="title"
            value={formik.values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.title && !!formik.errors.title}
            helperText={formik.touched.title && formik.errors.title}
            fullWidth
            margin="normal"
            required
          />

          <TextField
            label="Content"
            name="content"
            multiline
            minRows={4}
            value={formik.values.content}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.content && !!formik.errors.content}
            helperText={formik.touched.content && formik.errors.content}
            fullWidth
            margin="normal"
            required
          />

          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose} disabled={formik.isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!formik.isValid || formik.isSubmitting}
              startIcon={formik.isSubmitting && <CircularProgress size={18} />}
            >
              {formik.isSubmitting ? 'Creating...' : 'Create Diary'}
            </Button>
          </DialogActions>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDiaryForGroupDialog;
