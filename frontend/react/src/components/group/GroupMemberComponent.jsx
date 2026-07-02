import { Box, Modal, Typography, Avatar, List, ListItem, Chip  } from '@mui/material';
import UserProfileDialog from '../dialogs/UserProfileDialog';
import { useState } from 'react';

export default function GroupMemberComponent({ open, onClose, members, creatorId, group }) {

    const [openUserProfile, setOpenUserProfile] = useState(false);
    const [selectedMember, setSelectedMember] = useState(false);

    const handleSuccess = () => {
        onClose();
    }

    return (
        <>
            <Modal open={open} onClose={onClose}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 480,
                        maxHeight: 600,
                        bgcolor: 'background.paper',
                        borderRadius: 3,
                        boxShadow: 24,
                        p: 3,
                        overflowY: 'auto',
                    }}
                >
                    {/* Header */}
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                        Group Members
                    </Typography>

                    <List>
                        {members.map((member, index) => {
                            const key = member.id ?? `member-${index}`; // fallback

                            return (
                                <Box key={key}>
                                    <ListItem
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            py: 1.5,
                                        }}
                                        onClick={() => {
                                            setSelectedMember(member);
                                            setOpenUserProfile(true);
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                            <Avatar
                                                sx={{ width: 48, height: 48, fontSize: 16 }}
                                                src={member.avatar_url}
                                                alt={member?.username}
                                            >
                                                {member?.username?.charAt(0) ?? "P"}
                                            </Avatar>

                                            <Box>
                                                <Typography fontWeight={600}>{member.username}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {member.email}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {creatorId === member?.id && (
                                            <Chip
                                                label="Admin"
                                                color="primary"
                                                size="small"
                                                sx={{ fontWeight: 600 }}
                                            />
                                        )}
                                    </ListItem>
                                </Box>
                            );
                        })}
                    </List>
                </Box>
            </Modal>
            <UserProfileDialog
                open={openUserProfile}
                onClose={() => setOpenUserProfile(false)}
                userData={selectedMember}
                onSuccess={handleSuccess}
                creatorId={creatorId}
                group={group}
            />
        </>
    );
}
