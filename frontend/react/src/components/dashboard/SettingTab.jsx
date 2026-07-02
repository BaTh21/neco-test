import {
    Box,
    Typography,
    Paper,
    Stack,
    useMediaQuery,
    useTheme,
    Avatar,
    Divider
} from "@mui/material"
import NotificationsIcon from "@mui/icons-material/Notifications"
import SecurityIcon from "@mui/icons-material/Security"
import PrivacyTipIcon from "@mui/icons-material/PrivacyTip"
import { useState } from "react"
import SecuritySettings from '../setting/SecuritySettings';
import NotificationComponent from "../notification/NotificationComponent"

function SettingTab({ profile, onDataUpdate }) {

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [showContent, setShowContent] = useState(false);

    const [active, setActive] = useState(isMobile ? '' : "security");

    const menuItems = [
        {
            key: "security",
            label: "Security & Privacy",
            icon: <SecurityIcon />,
        },
        {
            key: "notifications",
            label: "Notifications",
            icon: <NotificationsIcon />,
        },
    ]

    return (
        <Box
            sx={{
                height: "89vh",
                display: "flex",
                width: '100%',
                bgcolor: 'white',
                border: 1,
                borderRadius: 0,
                borderColor: 'divider'
            }}
        >
            {(!isMobile || !showContent) && (
                <Stack
                    spacing={0.5}
                    py={2}
                    sx={{
                        width: isMobile ? '100%' : 260
                    }}
                >
                    <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        py: 4
                    }}
                    >
                        <Avatar
                            src={profile?.avatar_url}
                            alt={profile?.username}
                            sx={{
                                width: 100,
                                height: 100,
                                fontSize: { xs: '1.5rem', sm: '2rem' },
                                // bgcolor: 'primary.light',
                                border: `4px solid divider`,
                                boxShadow: 1,
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {profile?.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography mt={1}>{profile.email}</Typography>
                    </Box>

                    <Divider/>
                    {menuItems.map(item => (
                        <Paper
                            key={item.key}
                            onClick={() => { setActive(item.key); setShowContent(true) }}
                            elevation={active === item.key ? 4 : 1}
                            sx={{
                                p: 1.5,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                borderRadius: 0,
                                color: active === item.key
                                    ? 'white'
                                    : 'grey.700',
                                borderColor: active === item.key
                                    ? "primary.main"
                                    : "divider",
                                bgcolor: active === item.key
                                    ? "primary.main"
                                    : "transparent",
                                transition: "0.2s",
                                boxShadow: 0,
                                "&:hover": {
                                    bgcolor: "grey.100",
                                }
                            }}
                        >
                            {item.icon}
                            <Typography fontWeight={active === item.key ? 600 : 400}>
                                {item.label}
                            </Typography>
                        </Paper>
                    ))}
                </Stack>
            )}
            

            {(!isMobile || showContent) && (
                <Paper
                    elevation={3}
                    sx={{
                        flex: 1,
                        p: 3,
                        boxShadow: 0,
                        bgcolor: 'transparent',
                        borderLeft: 1,
                        borderRadius: 0,
                        borderColor: 'divider'
                    }}
                >

                    {active === "notifications" && (
                        <NotificationComponent onBack={() => setShowContent(false)}/>
                    )}

                    {active === "security" && (
                        <SecuritySettings onBack={() => setShowContent(false)} profile={profile} onDataUpdate={onDataUpdate} />
                    )}
                </Paper>
            )}
        </Box>
    )
}

export default SettingTab
