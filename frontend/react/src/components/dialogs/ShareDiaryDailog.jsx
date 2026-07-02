import { getUserGroups, shareDiaryById } from "../../services/api";
import { useState, useEffect } from "react";
import { Box, Modal, Button, FormGroup, FormControlLabel, Checkbox, Typography } from '@mui/material';
import { toast } from 'react-toastify';

function ShareDiaryDialog({ open, onClose, onSuccess, diary }) {
    const [groups, setGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchGroup = async () => {
        try {
            const res = await getUserGroups();
            setGroups(res || []);
            console.log("group data", res);
        } catch (error) {
            console.log("Groups", error);
        }
    }

    useEffect(() => {
        if (open) fetchGroup();
    }, [open]);

    const handleCheckboxChange = (groupId) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    }

    const handleShareDiary = async () => {
        if (selectedGroups.length === 0) {
            setError("Please select at least one group");
            return;
        }

        try {
            await shareDiaryById(diary.id, { group_ids: selectedGroups });
            setSuccess("Diary has been shared");
            onSuccess?.();
            onClose();
        } catch (error) {
            const msg = error.response?.data?.detail || error.message || "Unknown error";
            setError(`Error: ${msg}`);
        }
    }

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 400,
                    bgcolor: "background.paper",
                    borderRadius: 3,
                    boxShadow: 24,
                    p: 3,
                }}
            >
                <Typography variant="h6" mb={2}>Share Diary with Groups</Typography>
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
                <Box
                    sx={{
                        maxHeight: 200,
                        overflowY: 'auto',
                        mb: 2,
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        p: 1
                    }}
                >
                    {groups.length > 0 ? (
                        <FormGroup>
                            {groups.map(group => (
                                <FormControlLabel
                                    key={group.id}
                                    control={
                                        <Checkbox
                                            checked={selectedGroups.includes(group.id)}
                                            onChange={() => handleCheckboxChange(group.id)}
                                        />
                                    }
                                    label={group.name}
                                />
                            ))}
                        </FormGroup>
                    ) : (
                        <Typography variant="body2">No groups available</Typography>
                    )}
                </Box>
                <Box mt={2} display="flex" justifyContent="flex-end">
                    <Button variant="contained" color="primary" onClick={handleShareDiary}>
                        Share
                    </Button>
                </Box>
            </Box>
        </Modal>
    )
}

export default ShareDiaryDialog;
