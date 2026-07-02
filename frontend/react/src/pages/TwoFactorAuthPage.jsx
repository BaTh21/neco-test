import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verify2Factor, verifyEmailTwoFac } from "../services/api";
import { Box, TextField, Button, Typography, Alert } from "@mui/material";
import TwoFacImg from '../assets/two-step-verification.gif';

export const TwoFactorAuthPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const method = localStorage.getItem("2fa_method") || "totp";

  console.log("method", method)

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = async () => {
    if (code.includes("")) return setError("Please enter all digits");

    setLoading(true);
    setError("");

    try {
      const joinedCode = code.join("");
      let res;

      if (method === "email") {
        res = await verifyEmailTwoFac({ code: joinedCode });
      } else {
        res = await verify2Factor({ code: joinedCode });
      }

      await login({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        token_type: res.token_type || "bearer",
      });

      localStorage.removeItem("temp_token");
      localStorage.removeItem("2fa_method");

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.getElementById("code-0")?.focus();
  }, []);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" px={2}>
      <Box
        component="img"
        src={TwoFacImg}
        sx={{
          width: { xs: "70%", sm: 300, md: 400 },
          maxWidth: "100%",
          height: "auto",
          mb: 2,
        }}
      />

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }} textAlign="center">
        {method === "email"
          ? "Enter the 6-digit code sent to your email"
          : "Enter the 6-digit code from your authenticator app"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box display="flex" gap={1} mb={2} justifyContent="center">
        {code.map((digit, index) => (
          <TextField
            key={index}
            id={`code-${index}`}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
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

      <Button
        variant="contained"
        onClick={handleVerify}
        disabled={code.includes("") || loading}
        sx={{ borderRadius: 1, width: 150 }}
      >
        {loading ? "Verifying..." : "Verify"}
      </Button>
    </Box>
  );
};
