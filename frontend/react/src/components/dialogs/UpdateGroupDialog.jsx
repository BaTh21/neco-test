import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useAuth } from '../../context/AuthContext';
import {updateGroupById} from '../../services/api';

function UpdateGroupDialog({ open, onClose, group, onSuccess }) {
    const [name, setName] = useState(group?.name || "");
    const [description, setDescription] = useState(group?.description || "");
    const { auth } = useAuth();
    const user = auth?.user;

    useEffect(() => {
        if (group) {
            setName(group.name || "");
            setDescription(group.description || "");
        }
    }, [group]);

    const isAdmin = group?.creator_id === user?.id;

    const handleSave = async () => {
        try {
            await updateGroupById(group.id, { name, description });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to update group", error);
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 3,
                }}
            >
                <Typography variant="h6" mb={2}>
                    Edit Group
                </Typography>
                <TextField
                    label="Group Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                    disabled={!isAdmin}
                />
                <TextField
                    label="Group Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                    disabled={!isAdmin}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button 
                        onClick={handleSave} 
                        variant="contained" 
                        disabled={!isAdmin}
                    >
                        Save
                    </Button>
                </Box>
                {!isAdmin && (
                    <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        mt={2} 
                        textAlign="center"
                    >
                        Only the group creator can edit this group.
                    </Typography>
                )}
            </Box>
        </Modal>
    );
}

export default UpdateGroupDialog;
