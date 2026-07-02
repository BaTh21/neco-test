import {
  Alert,
  Box,
  Button,
  Card,
  Collapse,
  Link as MuiLink,
  TextField,
  Typography,
} from "@mui/material";
import { useFormik } from "formik";
import { useState, useRef } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import * as Yup from "yup";
import { verifyCode } from "../services/api";
import RegisterImg from "@/assets/verifycode.gif";
import ScanImg from "@/assets/scan.gif";
import { useAuth } from '../context/AuthContext';

const VerifyCodeForm = () => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { email } = useParams();
  const inputsRef = useRef([]);
  const { login } = useAuth();

  const formik = useFormik({
    initialValues: { code: "" },
    validationSchema: Yup.object({
      code: Yup.string()
        .matches(/^\d{6}$/, "Code must be 6 digits")
        .required("Required"),
    }),
    onSubmit: async (values) => {
      setError(null);
      setSuccess(null);
      setLoading(true);
      try {
        const tokens = await verifyCode({ email, code: values.code });
        await login(tokens);
        setSuccess("Email verified successfully");
        setTimeout(() => navigate("/dashboard"), 2000);
        
      } catch (err) {
        setError(err.msg || "Verification failed");
      } finally {
        setLoading(false);
      }
    },
  });

  const handleOtpChange = (index, value) => {
    const val = value.replace(/\D/g, ""); // only digits
    let codeArray = formik.values.code.split("");
    codeArray[index] = val;
    formik.setFieldValue("code", codeArray.join(""));

    if (val && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !formik.values.code[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        width: "100%",
        minHeight: "100vh",
      }}
    >
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
          src={ScanImg}
          sx={{
            width: { xs: "75%", sm: 280, md: 450 },
            maxWidth: "100%",
            height: "auto",
            display: {xs: 'none', md: 'block'}
          }}
        />

      </Box>
      <Box
        sx={{
          flex: { xs: "0 0 auto", md: 1 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: { md: "grey.200", sm: "white" },
          p: 2,
        }}
      >
        <Collapse in={!!error} sx={{ width: "100%", maxWidth: 430 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        </Collapse>
        <Collapse in={!!success} sx={{ width: "100%", maxWidth: 430 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        </Collapse>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'white',
            p: 2,
            borderRadius: 3,
            boxShadow: { md: 5, xs: 0 },
            width: 500
          }}
        >
          <Box
            sx={{
              width: { xs: "100%" },
              alignItems: "center",
              justifyContent: "center",
              display: "flex",
            }}
          >
            <Box
              component="img"
              src={RegisterImg}
              sx={{
                width: { xs: "75%", sm: 250 },
                maxWidth: "100%",
                height: "auto",
              }}
            />
          </Box>
          <Box
            component="form"
            onSubmit={formik.handleSubmit}
            sx={{
              width: "100%",
              maxWidth: { md: 430, xs: '80%' },
              p: { xs: 3, sm: 5 },
            }}
          >
            <Typography
              variant="h4"
              gutterBottom
              align="center"
              color="primary"
              sx={{ fontWeight: 600 }}
            >
              Verify Your Email
            </Typography>

            <Box display="flex" gap={1} justifyContent="space-between" mt={2} mb={2}>
              {Array.from({ length: 6 }).map((_, index) => (
                <TextField
                  key={index}
                  inputRef={(ref) => (inputsRef.current[index] = ref)}
                  value={formik.values.code[index] || ""}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  disabled={loading}
                  inputProps={{
                    maxLength: 1,
                    sx: {
                      textAlign: "center",
                      fontSize: "1.5rem",
                      width: { xs: '2rem', md: '3rem' },
                      height: "2rem",
                    },
                  }}
                />
              ))}
            </Box>
            {formik.touched.code && formik.errors.code && (
              <Typography color="error" fontSize="0.875rem" mb={1}>
                {formik.errors.code}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2, py: { xs: 1, sm: 1.5 } }}
              disabled={loading}
              aria-label="Verify Button"
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>

            <MuiLink
              component={RouterLink}
              to="/register"
              sx={{
                mt: 2,
                display: "block",
                textAlign: "center",
                color: "secondary.main",
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
              }}
              aria-label="Resend verification code"
            >
              Resend Verification Code
            </MuiLink>
          </Box>
        </Box>
      </Box>
    </Card>
  );
};

export default VerifyCodeForm;
