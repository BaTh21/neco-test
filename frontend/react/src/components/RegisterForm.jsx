import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  Collapse,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { useFormik } from 'formik';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { register } from '../services/api';
import RegisterImg from '@/assets/register.gif';

const RegisterForm = () => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: { username: '', email: '', password: '' },
    validationSchema: Yup.object({
      username: Yup.string()
        .min(3, t('username_min'))
        .required(t('required')),
      email: Yup.string().email(t('invalid_email')).required(t('required')),
      password: Yup.string().required(t('required')),
    }),
    onSubmit: async (values) => {
      setError(null);
      setSuccess(null);
      setLoading(true);
      try {
        await register(values);
        navigate(`/verify-code/${values.email}`);
        setSuccess(t('verification_sent'));
      } catch (err) {
        setError(err.message || t('registration_failed'));
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row-reverse" },
        width: "100%",
        minHeight: "100vh",
      }}
    >
      {/* Alerts */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 10,
          px: 2
        }}
      >
        <Collapse in={!!error} sx={{ width: "100%", maxWidth: 600 }}>
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        </Collapse>
        <Collapse in={!!success} sx={{ width: "100%", maxWidth: 600 }}>
          <Alert severity="success" sx={{ mb: 1 }}>
            {success}
          </Alert>
        </Collapse>
      </Box>

      {/* Image Section */}
      <Box
        sx={{
          width: { xs: "100%", md: "40%" },
          alignItems: "center",
          justifyContent: "center",
          display: 'flex'
        }}
      >
        <Box
          component="img"
          src={RegisterImg}
          sx={{
            width: { xs: "75%", sm: 280, md: 450 },
            maxWidth: "100%",
            height: "auto",
          }}
        />
      </Box>

      {/* Form Section */}
      <Box
        sx={{
          flex: { xs: "0 0 auto", md: 1 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: { md: "grey.200", sm: 'white' },
          height: { md: '100vh' }
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 430,
            backgroundColor: "white",
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            boxShadow: { md: 5 },
          }}
          component="form"
          onSubmit={formik.handleSubmit}
        >
          <Typography
            variant="h4"
            gutterBottom
            color="primary"
            sx={{ fontWeight: 600, mb: 3 }}
          >
            {t('create_account')}
          </Typography>

          {/* Username */}
          <TextField
            label={t('username')}
            name="username"
            value={formik.values.username}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.username && !!formik.errors.username}
            helperText={formik.touched.username && formik.errors.username}
            fullWidth
            margin="normal"
            required
            disabled={loading}
          />

          {/* Email */}
          <TextField
            label={t('email')}
            name="email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && !!formik.errors.email}
            helperText={formik.touched.email && formik.errors.email}
            fullWidth
            margin="normal"
            required
            disabled={loading}
          />

          {/* Password */}
          <TextField
            label={t('password')}
            name="password"
            type={showPassword ? "text" : "password"}
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && !!formik.errors.password}
            helperText={formik.touched.password && formik.errors.password}
            fullWidth
            margin="normal"
            required
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Login Link */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 2,
            }}
          >
            <Typography variant="body2">{t('already_have_account')}</Typography>
            <Button sx={{ color: "red" }} onClick={() => navigate("/login")}>
              {t('login')}
            </Button>
          </Box>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? t('registering') : t('register')}
          </Button>
        </Box>
      </Box>
    </Card>
  );
};

export default RegisterForm;
