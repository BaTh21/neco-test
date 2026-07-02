import LogoImg from '@/assets/Login1.gif';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useFormik } from 'formik';
import { useRef, useState } from 'react';
import Draggable from "react-draggable";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { forgotPassword, login as loginApi, resetPassword } from '../services/api';

function DraggablePaper(props) {
  const nodeRef = useRef(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      handle="#draggable-dialog-title"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <div ref={nodeRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Paper {...props} />
      </div>
    </Draggable>
  );
}

const LoginForm = () => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Forgot Password States
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [resetStep, setResetStep] = useState('email'); // 'email' or 'code'
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const formik = useFormik({
    initialValues: { username: '', password: '' },
    validationSchema: Yup.object({
      username: Yup.string().email(t('invalid_email')).required(t('required')),
      password: Yup.string().required(t('required')),
    }),
    onSubmit: async (values) => {
      setError(null);
      setLoading(true);

      try {
        const result = await loginApi({
          email: values.username,
          password: values.password,
        });

        if (result.requires_2fa) {
          localStorage.setItem("temp_token", result.temp_token);
          localStorage.setItem("2fa_method", result.method || "totp");

          navigate("/2fa");
          return;
        }

        await login(result);

        navigate("/dashboard");

      } catch (err) {
        setError(err.message || "Login failed");
        toast.error(err.message || "Login failed");
      } finally {
        setLoading(false);
      }
    },

  });

  const handleForgotPassword = async () => {
    setResetError('');
    setResetLoading(true);
    try {
      if (resetStep === 'email') {
        await forgotPassword({ email: resetEmail });
        setResetStep('code');
        toast.success(t('reset_code_sent') || 'Reset code sent! Check your email.');
      } else {
        if (newPassword !== confirmPassword) {
          setResetError(t('passwords_do_not_match') || 'Passwords do not match');
          return;
        }
        await resetPassword({ code: resetCode, new_password: newPassword });
        setResetSuccess(t('password_reset_success') || 'Password reset successfully! You can now log in.');
        toast.success(t('password_changed') || 'Password changed!');
        setTimeout(() => {
          setForgotDialogOpen(false);
          setResetStep('email');
          setResetEmail('');
          setResetCode('');
          setNewPassword('');
          setConfirmPassword('');
          setResetSuccess('');
        }, 2000);
      }
    } catch (err) {
      setResetError(err.message || t('something_went_wrong') || 'Something went wrong');
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotDialog = () => {
    setForgotDialogOpen(false);
    setResetStep('email');
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess('');
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        minHeight: "100vh",
        width: "100%",
      }}
    >
      {/* LEFT SIDE IMAGE */}
      <Box
        sx={{
          width: { xs: "100%", md: "40%" },
          display: 'flex',
          alignItems: { xs: 'end', md: "center" },
          justifyContent: "center",
          mt: { xs: 8, md: 0 }
        }}
      >
        <Box
          component="img"
          src={LogoImg}
          sx={{
            width: { xs: "70%", sm: 300, md: 480 },
            maxWidth: "100%",
            height: "auto",
          }}
        />
      </Box>

      {/* RIGHT SIDE FORM */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: { xs: 'start', md: "center" },
          justifyContent: "center",
          backgroundColor: { xs: 'transparent', md: "grey.300" },
          height: { md: '100vh' },
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: "white",
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            boxShadow: { xs: 'none', md: 5 },
          }}
        >
          <Typography variant="h4" color="primary" sx={{ fontWeight: 600, mb: 3 }}>
            {t('sign_in')}
          </Typography>

          <Collapse in={!!error}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          </Collapse>

          <Box component="form" onSubmit={formik.handleSubmit}>
            {/* Email */}
            <TextField
              label={t('email')}
              name="username"
              type="email"
              fullWidth
              value={formik.values.username}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.username && !!formik.errors.username}
              helperText={formik.touched.username && formik.errors.username}
              margin="normal"
              required
              disabled={loading}
            />

            {/* Password */}
            <TextField
              label={t('password')}
              name="password"
              type={showPassword ? "text" : "password"}
              fullWidth
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && !!formik.errors.password}
              helperText={formik.touched.password && formik.errors.password}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Forgot Password Link */}
            <Box sx={{ mt: 1, textAlign: 'right' }}>
              <Button size="small" color="primary" onClick={() => setForgotDialogOpen(true)}>
                {t('forgot_password') || 'Forgot Password?'}
              </Button>
            </Box>

            {/* Create Account Link */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: 'center', mt: 2 }}>
              <Typography variant="body2">{t('dont_have_account') || "Don't have an account?"}</Typography>
              <Button sx={{ color: "red" }} onClick={() => navigate("/register")}>
                {t('create_new') || 'Create New'}
              </Button>
            </Box>

            {/* Login Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3, py: 1.5 }}
              disabled={loading}
            >
              {loading ? t('logging_in') || 'Logging in...' : t('login') || 'Login'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Draggable Forgot Password Dialog */}
      <Dialog
        open={forgotDialogOpen}
        onClose={closeForgotDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: 5,
            overflow: 'hidden',
          },
        }}
        PaperComponent={DraggablePaper}
      >
        {/* Custom Draggable Title Bar */}
        <Box
          id="draggable-dialog-title"
          sx={{
            cursor: 'move',
            backgroundColor: 'primary.main',
            color: 'white',
            padding: '16px 24px',
            textAlign: 'center',
            userSelect: 'none',
            fontWeight: 600,
            fontSize: '1.25rem',
            // Grip indicator (three dots or bar)
            '&::before': {
              content: '""',
              display: 'block',
              height: '5px',
              width: '40px',
              backgroundColor: 'rgba(255,255,255,0.5)',
              borderRadius: '3px',
              margin: '0 auto 10px auto',
            },
          }}
        >
          {t('reset_password') || 'Reset Password'}
        </Box>

        <DialogContent sx={{ p: { xs: 3, sm: 5 }, backgroundColor: 'white' }}>
          {resetStep === 'email' ? (
            <>
              <Typography sx={{ mb: 3, color: 'text.secondary', textAlign: 'center' }}>
                Enter your email address and we'll send you a code to reset your password.
              </Typography>
              <TextField
                autoFocus
                fullWidth
                label={t('email') || 'Email'}
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                margin="normal"
              />
            </>
          ) : (
            <>
              <Typography sx={{ mb: 3, color: 'text.secondary', textAlign: 'center' }}>
                Check your email for the 6-digit code.
              </Typography>

              {resetSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {resetSuccess}
                </Alert>
              )}

              <TextField
                fullWidth
                label={t('reset_code') || 'Verification Code'}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                margin="normal"
                inputProps={{ maxLength: 6 }}
              />
              <TextField
                fullWidth
                label={t('new_password') || 'New Password'}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
              />
              <TextField
                fullWidth
                label={t('confirm_password') || 'Confirm New Password'}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                error={newPassword !== confirmPassword && confirmPassword !== ''}
                helperText={
                  newPassword !== confirmPassword && confirmPassword !== ''
                    ? t('passwords_do_not_match') || 'Passwords do not match'
                    : ''
                }
              />
            </>
          )}

          {resetError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {resetError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Button fullWidth onClick={closeForgotDialog} disabled={resetLoading}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handleForgotPassword}
              disabled={
                resetLoading ||
                (resetStep === 'email'
                  ? !resetEmail.includes('@')
                  : !resetCode || !newPassword || newPassword !== confirmPassword)
              }
            >
              {resetLoading
                ? t('sending') || 'Sending...'
                : resetStep === 'email'
                  ? t('send_code') || 'Send Code'
                  : t('reset_password') || 'Reset Password'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LoginForm;