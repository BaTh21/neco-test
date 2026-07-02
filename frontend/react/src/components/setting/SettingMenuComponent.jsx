import {
    Box,
    Typography,
    Paper,
    Stack,
    Button,
    Divider,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import SecurityIcon from "@mui/icons-material/Security";
import LockIcon from "@mui/icons-material/Lock";
import EmailIcon from "@mui/icons-material/Email";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import BlockIcon from "@mui/icons-material/Block";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { deactivateAccount } from "../../services/api";
import { useAuth } from '../../context/AuthContext';

function SettingMenuComponent({ onNavigate, onBack, profile }) {
    const { t } = useTranslation();
    const [openDeactivate, setOpenDeactivate] = useState(false);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { logout } = useAuth();

    const handleDeactivate = async () => {
        setLoading(true);
        setError(null);
        try {
            await deactivateAccount({ password });
            logout();
            window.location.href = "/login";
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const Section = ({ icon, title, description, actionText, color = "primary", onClick }) => (
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                borderRadius: 2,
                border: 1,
                borderColor: "divider"
            }}
        >
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ sm: "center" }}
                justifyContent="space-between"
            >
                <Stack direction="row" spacing={2} alignItems="center">
                    {icon}
                    <Box>
                        <Typography fontWeight={600}>
                            {title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {description}
                        </Typography>
                    </Box>
                </Stack>

                <Button
                    variant="outlined"
                    color={color}
                    sx={{ minWidth: 150, borderRadius: 1 }}
                    onClick={onClick}
                >
                    {actionText}
                </Button>
            </Stack>
        </Paper>
    );

    return (
        <Box
            sx={{
                height: '80vh',
                overflowY: 'auto',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
            }}
        >
            <Stack spacing={1} mb={3}>
                <Button
                    sx={{
                        mb: 2,
                        fontSize: 16,
                        width: '100%',
                        display: { xs: 'flex', sm: 'none' },
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
                    onClick={onBack}
                >
                    <ArrowBackIcon sx={{ mr: 1 }} />
                    {t('back_to_menu_page')}
                </Button>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}
                >
                    <Typography variant="h5" fontWeight={600}>
                        {t('security_and_privacy')}
                    </Typography>
                </Box>
                <Typography color="text.secondary">
                    {t('manage_account_security')}
                </Typography>
            </Stack>

            <Stack spacing={2}>
                <Typography fontWeight={600}>{t('account_details')}</Typography>

                <Section
                    icon={<SecurityIcon color="primary" />}
                    title={t('login_information')}
                    description={t('view_recent_login_activity')}
                    actionText={t('view_details')}
                    onClick={() => onNavigate("login_details")}
                />

                <Section
                    icon={<LockIcon color="primary" />}
                    title={t('update_password')}
                    description={t('change_account_password')}
                    actionText={t('change_password')}
                    onClick={() => onNavigate("change_password")}
                />

                <Divider />

                <Typography fontWeight={600}>{t('recovery_settings')}</Typography>

                <Section
                    icon={<EmailIcon color="primary" />}
                    title={t('recovery_email')}
                    description={t('update_recovery_email_desc')}
                    actionText={t('change')}
                    onClick={() => onNavigate("recovery_email")}
                />

                <Divider />

                <Typography fontWeight={600}>{t('two_factor_authentication')}</Typography>

                <Section
                    icon={<VerifiedUserIcon color="primary" />}
                    title={t('two_factor_authentication')}
                    description={t('two_fa_desc')}
                    actionText={profile.is_2fa_enabled ? t('disable') : t('enable')}
                    onClick={() => onNavigate("two_fa")}
                    color={profile.is_2fa_enabled ? 'error' : 'success'}
                />

                <Divider />

                <Typography fontWeight={600} color="error">
                    {t('danger_zone')}
                </Typography>

                <Section
                    icon={<BlockIcon color="error" />}
                    title={t('deactivate_account')}
                    description={t('deactivate_account_desc')}
                    actionText={t('deactivate')}
                    color="error"
                    onClick={() => setOpenDeactivate(true)}
                />
            </Stack>

            <Dialog
                open={openDeactivate}
                onClose={() => setOpenDeactivate(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle color="error">
                    {t('deactivate_account')}
                </DialogTitle>

                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {t('deactivate_warning')}
                    </Alert>

                    <TextField
                        label={t('confirm_password')}
                        type="password"
                        fullWidth
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                    />

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() => setOpenDeactivate(false)}
                        disabled={loading}
                        sx={{ borderRadius: 1 }}
                        variant="outlined"
                    >
                        {t('cancel')}
                    </Button>

                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeactivate}
                        disabled={!password || loading}
                        sx={{ borderRadius: 1 }}
                    >
                        {t('deactivate')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default SettingMenuComponent;