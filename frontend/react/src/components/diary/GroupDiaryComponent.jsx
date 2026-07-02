import { Box, ListItem, List, Typography } from "@mui/material"
import { getGroupDiaries } from "../../services/api";
import { useState, useEffect } from "react";
import ProfileDiary from "./ProfileDiary";

function GroupDiaryComponent({ groups, profile, setError, setSuccess, onDataUpdate, friends, pendingRequests, search  }) {
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [diaries, setDiaries] = useState([]);

    const getLatestImage = (group) =>
        group.images?.length
            ? group.images[group.images.length - 1].url
            : null;

    const handleGroupClick = async (groupId) => {
        try {
            const res = await getGroupDiaries(groupId, search);
            setDiaries(res);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (selectedGroupId) {
            handleGroupClick(selectedGroupId);
        }
    }, [search, selectedGroupId]);

    return (
        <Box>
            <Box
                onWheel={(e) => {
                    if (e.deltaY !== 0) {
                        e.currentTarget.scrollLeft += e.deltaY;
                        e.preventDefault();
                    }
                }}
                sx={{
                    display: 'flex',
                    overflowX: 'auto',
                    scrollBehavior: 'smooth',
                    whiteSpace: 'nowrap',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}
            >

                <List
                    sx={{
                        display: 'flex',
                        gap: 2,
                        flexShrink: 0,
                    }}
                >
                    {groups.slice(0, 10).map((group) => {
                        const latestImage = getLatestImage(group);

                        return (
                            <ListItem
                                key={group.id}
                                sx={{
                                    width: { xs: 220, md: 260 },
                                    p: 0,
                                }}
                                onClick={() => {
                                    setSelectedGroupId(group.id);
                                    handleGroupClick(group.id);
                                }}

                            >
                                <Box
                                    sx={{
                                        position: 'relative',
                                        width: '100%',
                                        height: { xs: 140, md: 170 },
                                        borderRadius: 3,
                                        overflow: 'hidden',
                                        border: '1px solid',
                                        borderColor: selectedGroupId === group.id ? 'primary.main' : 'divider',
                                        boxShadow:
                                            selectedGroupId === group.id
                                                ? '0 0 0 2px rgba(37,77,112,0.4), 0 8px 24px rgba(37,77,112,0.45)'
                                                : '0 2px 8px rgba(0,0,0,0.12)',
                                        cursor: 'pointer',
                                        transition: '0.25s',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 3,
                                        },
                                    }}
                                >
                                    {/* Image */}
                                    {latestImage ? (
                                        <Box
                                            component="img"
                                            src={latestImage}
                                            alt={group.name}
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: 'grey.200',
                                                color: 'text.secondary',
                                                fontSize: 44
                                            }}
                                        >
                                            {group.name.charAt(0).toUpperCase()}
                                        </Box>
                                    )}

                                    {/* Gradient Overlay */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            background:
                                                'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))',
                                        }}
                                    />

                                    {/* Group Name */}
                                    <Typography
                                        sx={{
                                            position: 'absolute',
                                            bottom: 10,
                                            left: 12,
                                            right: 12,
                                            color: '#fff',
                                            fontWeight: 600,
                                            fontSize: '1rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {group.name}
                                    </Typography>
                                </Box>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>
            
            <br />
            <ProfileDiary
                diaries={diaries}
                profile={profile}
                groups={groups}
                onNewDiary={() => setDiaryDialogOpen(true)}
                setError={setError}
                setSuccess={setSuccess}
                onDataUpdate={onDataUpdate}
                friends={friends}
                pendingRequests={pendingRequests}
            />
        </Box>
    )
}

export default GroupDiaryComponent
