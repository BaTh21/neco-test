import {
  Avatar,
  Box,
  Modal,
  Typography,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import DeleteDialog from '../dialogs/DeleteDialog';
import { removeGroupMember } from '../../services/api';

function UserProfileDialog({ open, onClose, userData, group, onSuccess, creatorId }) {
  const { auth } = useAuth();
  const currentUser = auth?.user;

  const [openDelete, setOpenDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isOwner = currentUser?.id === (group?.creator_id ?? creatorId);
  const isSelf = currentUser?.id === userData?.id;
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleConfirmRemove = async () => {
    setIsLoading(true);
    try {
      await removeGroupMember(group.id, userData.id);
      setSuccess("Member has been removed");
      onSuccess();
      setOpenDelete(false);
      onClose();
    } catch (error) {
      console.error(error);
      setError(`Failed to remove member ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 500,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            p: 3,
          }}
        >
          {error && (
            <Typography variant="body2" color="error.main">
              {error}
            </Typography>
          )}
          {success && (
            <Typography variant="body2" color="success">
              {success}
            </Typography>
          )}
          {/* Profile Info */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
            }}
          >
            <Avatar
              src={userData?.avatar_url}
              alt={userData?.username}
              sx={{ width: 75, height: 75 }}
            >
              {userData?.username?.[0]?.toUpperCase() || 'U'}
            </Avatar>

            <Typography sx={{ fontSize: 24, mt: 1 }}>
              {userData?.username}
            </Typography>

            <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
              {userData?.bio || 'No bio available'}
            </Typography>
          </Box>

          {/* Kick Member Option (Only visible to group owner, not self) */}
          {isOwner && !isSelf && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <ListItemButton
                onClick={() => setOpenDelete(true)}
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mt: 2,
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  },
                }}
              >
                <ListItemIcon>
                  <PersonRemoveIcon sx={{ color: 'red' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Kick this member"
                  primaryTypographyProps={{
                    color: 'red',
                    fontWeight: 500,
                  }}
                />
              </ListItemButton>
            </>
          )}
        </Box>
      </Modal>

      {/* Confirmation Dialog */}
      <DeleteDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        title="Remove member"
        description={`Are you sure you want to remove ${userData?.username} from ${group?.name}?`}
        onConfirm={handleConfirmRemove}
        loading={isLoading}
      />
    </>
  );
}

export default UserProfileDialog;
