import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useFormik } from 'formik';
import { useRef } from "react";
import Draggable from "react-draggable";
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import { createGroup } from '../services/api';

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

const CreateGroupDialog = ({ 
  open, 
  onClose, 
  onSuccess, 
  setError, 
  friends = [] 
}) => {
  const { t } = useTranslation();

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      invited_friends: [],
    },
    validationSchema: Yup.object({
      name: Yup.string().required(t('group_name_required')),
      description: Yup.string().max(500, t('description_too_long')),
      invited_friends: Yup.array(),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const groupData = {
          name: values.name,
          description: values.description,
          invited_user_ids: values.invited_friends,
        };

        const newGroup = await createGroup(groupData);
        onSuccess(newGroup);
        resetForm();
        setError(null);
      } catch (err) {
        setError(err.message || t('failed_create_group'));
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}
      PaperComponent={DraggablePaper}
    >
      <DialogTitle id="draggable-dialog-title" sx={{ fontWeight: 600, pb: 1 }}>
        {t('create_new_group')}
      </DialogTitle>
      
      <DialogContent>
        <Box component="form" sx={{ mt: 1 }}>
          {/* Group Name */}
          <TextField
            label={t('group_name') + ' *'}
            name="name"
            fullWidth
            margin="normal"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.name && !!formik.errors.name}
            helperText={formik.touched.name && formik.errors.name}
            InputProps={{ sx: { borderRadius: '8px' } }}
          />

          {/* Group Description */}
          <TextField
            label={t('description')}
            name="description"
            multiline
            rows={3}
            fullWidth
            margin="normal"
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.description && !!formik.errors.description}
            helperText={formik.touched.description && formik.errors.description}
            InputProps={{ sx: { borderRadius: '8px' } }}
          />

          {/* Friend Invitation Section */}
          {/* <FormControl fullWidth margin="normal">
            <InputLabel>{t('invite_friends')}</InputLabel>
            <Select
              multiple
              name="invited_friends"
              value={formik.values.invited_friends}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((friendId) => {
                    const friend = friends.find(f => f.id === friendId);
                    return (
                      <Chip 
                        key={friendId}
                        label={friend?.username || t('unknown')} 
                        size="small"
                        sx={{ borderRadius: '6px' }}
                      />
                    );
                  })}
                </Box>
              )}
              MenuProps={{
                PaperProps: { sx: { maxHeight: 300 } }
              }}
            >
              {friends.length === 0 ? (
                <MenuItem disabled>
                  <Typography color="text.secondary">
                    {t('no_friends_available')}
                  </Typography>
                </MenuItem>
              ) : (
                friends.map((friend) => (
                  <MenuItem key={friend.id} value={friend.id}>
                    <Checkbox checked={formik.values.invited_friends.includes(friend.id)} />
                    <ListItemAvatar>
                      <Avatar 
                        src={friend.avatar_url}
                        sx={{ width: 32, height: 32, mr: 2 }}
                        imgProps={{ onError: (e) => { e.target.style.display = 'none'; } }}
                      >
                        {friend.username?.charAt(0)?.toUpperCase() || 'F'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={<Typography variant="body1" fontWeight="500">{friend.username}</Typography>}
                      secondary={friend.email}
                    />
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl> */}

          {/* Selected Friends Count */}
          {formik.values.invited_friends.length > 0 && (
            <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
              {formik.values.invited_friends.length} {t('friends_selected')}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={handleClose} sx={{ borderRadius: '8px' }}>
          {t('cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={formik.handleSubmit}
          disabled={!formik.isValid || formik.isSubmitting}
          sx={{ borderRadius: '8px' }}
        >
          {t('create_group')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateGroupDialog;
