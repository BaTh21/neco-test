import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  setUp2Factor,
  enable2Factor,
  verify2Factor,
  disable2Factor,
  enableEmailVerify,
  disableEmailVerify,
} from "../../../services/api";

import {
  Box,
  Button,
  Typography,
  TextField,
  Alert,
} from "@mui/material";
import QrCode2Icon from '@mui/icons-material/QrCode2';
import EmailIcon from '@mui/icons-material/Email';

function TwoFactorView({ mode = "settings", onVerified, profile, onDataUpdate }) {
  const { t } = useTranslation();
  const [qrUri, setQrUri] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(profile.is_2fa_enabled);
  const [isEmail2SAEnabled, setIsEmail2SAEnabled] = useState(
    profile.is_email_2sa_enabled
  );

  useEffect(() => {
    setIs2FAEnabled(profile.is_2fa_enabled);
    setIsEmail2SAEnabled(profile.is_email_2sa_enabled);
  }, [profile.is_2fa_enabled, profile.is_email_2sa_enabled]);

  const handleSetup = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await setUp2Factor();
      setQrUri(data.qr_uri);
      setSecret(data.secret);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    try {
      setLoading(true);
      setError("");
      await enable2Factor({ code: code.join("") });
      setIs2FAEnabled(true);
      setSuccess(t('two_factor_enabled'));
      setQrUri("");
      setSecret("");
      setCode(["", "", "", "", "", ""]);
      onDataUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError("");
      const tokenData = await verify2Factor({ code: code.join("") });
      onVerified?.(tokenData);
      onDataUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    try {
      setLoading(true);
      setError("");
      await disable2Factor({ code: code.join("") });
      setIs2FAEnabled(false);
      setSuccess(t('two_factor_disabled'));
      setCode(["", "", "", "", "", ""]);
      onDataUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowDisable(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (/^\d?$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      if (value && index < code.length - 1) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleEnableEmail2SA = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await enableEmailVerify();
      setIsEmail2SAEnabled(true);
      setSuccess(t('email_2sa_enabled'));
      onDataUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableEmail2SA = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await disableEmailVerify();
      setIsEmail2SAEnabled(false);
      setSuccess(t('email_2sa_disabled'));
      onDataUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCodeInputs = () => (
    <Box display="flex" gap={1} justifyContent="center">
      {code.map((digit, idx) => (
        <TextField
          key={idx}
          id={`code-${idx}`}
          value={digit}
          onChange={(e) => handleCodeChange(idx, e.target.value)}
          inputProps={{
            maxLength: 1,
            sx: {
              textAlign: "center",
              fontSize: { xs: "1.5rem", lg: "3rem" },
              width: { xs: '2rem', md: '3rem' },
              height: { xs: "2rem", lg: '3rem' },
            },
          }}
          sx={{ width: { xs: 45, md: 50, lg: 75 } }}
        />
      ))}
    </Box>
  );

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Typography variant="h6" mb={2} fontWeight={600} textAlign={{ xs: 'start', md: 'start' }}>
        {t('two_factor_authentication')}
      </Typography>

      {mode === "login" && (
        <>
          <Typography mb={1}>{t('enter_2fa_code')}</Typography>
          {renderCodeInputs()}
          <Button
            variant="contained"
            sx={{ mt: 2, borderRadius: 1 }}
            onClick={handleVerify}
            disabled={loading}
            fullWidth
          >
            {t('verify')}
          </Button>
        </>
      )}

      {mode === "settings" && (
        <>
          {!qrUri && !is2FAEnabled && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: "column", sm: "row" },
                flexWrap: 'now-wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2.5,
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
                gap: 2
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <QrCode2Icon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography fontWeight={600}>
                    {t('authentication_with_qr')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="start">
                    {t('qr_code_desc')}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                onClick={handleSetup}
                disabled={loading}
                fullWidth
                color="success"
                sx={{ borderRadius: 1, width: { xs: '100%', sm: 120 } }}
              >
                {t('enable')}
              </Button>
            </Box>
          )}

          {qrUri && (
            <Box mt={2} textAlign="center">
              <Typography mb={1}>{t('scan_qr_instruction')}</Typography>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                  qrUri
                )}&size=200x200`}
                alt="2FA QR Code"
              />
              <Typography mt={1} fontSize={{ xs: 12, md: 16 }}>
                {t('manual_key', { secret })}
              </Typography>

              <Box mt={2}>
                {renderCodeInputs()}
                <Button
                  variant="outlined"
                  sx={{ borderRadius: 1, width: { xs: '100%', sm: 200 }, mt: 2 }}
                  onClick={handleEnable}
                  disabled={loading}
                  fullWidth
                >
                  {t('confirm_and_enable')}
                </Button>
              </Box>
            </Box>
          )}

          {!showDisable && is2FAEnabled && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: "column", sm: "row" },
                flexWrap: 'now-wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2.5,
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
                gap: 2
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <QrCode2Icon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography fontWeight={600}>
                    {t('authentication_with_qr')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="start">
                    {t('qr_code_desc')}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                onClick={() => setShowDisable(true)}
                disabled={loading}
                fullWidth
                color="error.main"
                sx={{ borderRadius: 1, width: { xs: '100%', sm: 120 }, color: 'red' }}
              >
                {t('disable')}
              </Button>
            </Box>
          )}

          {is2FAEnabled && showDisable && (
            <Box maxWidth={{ md: 500 }} marginX={{ sm: 'auto' }}>
              <Typography mb={1} fontWeight={600}>{t('enter_disable_2fa_code')}</Typography>
              {renderCodeInputs()}
              <Button
                variant="outlined"
                sx={{ mt: 2, borderRadius: 1, width: { xs: '100%', sm: 150 } }}
                onClick={handleDisable}
                disabled={loading}
                fullWidth
              >
                {t('disable_2fa')}
              </Button>
            </Box>
          )}
        </>
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2.5,
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          gap: 2,
          mt: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon sx={{ color: 'primary.main' }} />
          <Box>
            <Typography fontWeight={600}>
              {t('authentication_with_email')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('email_2fa_desc')}
            </Typography>
          </Box>
        </Box>

        {!isEmail2SAEnabled ? (
          <Button
            variant="outlined"
            color="success"
            onClick={handleEnableEmail2SA}
            disabled={loading}
            sx={{ borderRadius: 1, width: { xs: '100%', sm: 120 } }}
          >
            {t('enable')}
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="error"
            onClick={handleDisableEmail2SA}
            disabled={loading}
            sx={{ borderRadius: 1, width: { xs: '100%', sm: 120 }, color: 'red' }}
          >
            {t('disable')}
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default TwoFactorView;