import { Box, Button, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import SettingMenuComponent from "./SettingMenuComponent";
import LoginDetailsView from "./view/LoginDetailsView";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChangePasswordView from "./view/ChangePasswordView";
import RecoveryEmailView from "./view/RecoveryEmailView";
import TwoFactorView from "./view/TwoFactorView";

const VIEWS = {
    MAIN: "main",
    LOGIN_DETAILS: "login_details",
    CHANGE_PASSWORD: "change_password",
    RECOVERY_EMAIL: "recovery_email",
    TWO_FA: "two_fa",
};

export default function SecuritySettings({ onBack, profile, onDataUpdate }) {
    const { t } = useTranslation();
    const [view, setView] = useState(VIEWS.MAIN);

    const handleBack = () => setView(VIEWS.MAIN);

    return (
        <Box>
            {view !== VIEWS.MAIN && (
                <Button
                    sx={{
                        mb: 2,
                        fontSize: 16,
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'start',
                        color: 'primary.contrastText',
                        backgroundImage: 'linear-gradient(90deg, #254D70, #1e78c7ff, #198d17e7)',
                        backgroundSize: '200% 100%',
                        backgroundPosition: '0% 50%',
                        transition: 'background-position 0.4s ease, box-shadow 0.3s ease',
                        '&:hover': {
                            backgroundPosition: '100% 50%',
                            boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                            transform: 'scale(1)'
                        },
                    }}
                    onClick={handleBack}
                >
                    <ArrowBackIcon sx={{ mr: 1 }} />
                    {t('back_to_setting_page')}
                </Button>
            )}

            {view === VIEWS.MAIN && (
                <SettingMenuComponent onNavigate={setView} onBack={onBack} profile={profile} />
            )}

            {view === VIEWS.LOGIN_DETAILS && (
                <LoginDetailsView />
            )}

            {view === VIEWS.CHANGE_PASSWORD && (
                <ChangePasswordView />
            )}

            {view === VIEWS.RECOVERY_EMAIL && (
                <RecoveryEmailView profile={profile} onDataUpdate={onDataUpdate} />
            )}

            {view === VIEWS.TWO_FA && (
                <TwoFactorView mode="settings" profile={profile} onDataUpdate={onDataUpdate} />
            )}
        </Box>
    );
}