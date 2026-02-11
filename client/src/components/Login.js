import React, { useState, useContext } from "react";
import { Box, TextField, Button, Paper, Typography, Alert, Stack, Avatar } from "@mui/material";
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { authAPI } from "../services/api";
import { getClientId } from "../services/clientId";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const clientId = getClientId();
      const response = await authAPI.login({ ...formData, clientId });
      // Store token only and verify role from backend
      const me = await login(response.data.token);
      if (me?.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/user/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #071A52 0%, #0B6B79 50%, #06283D 100%)', py: 8 }}>
      <Paper
        elevation={12}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 460,
          mx: 2,
          borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 50px rgba(2,6,23,0.6)',
          backdropFilter: 'blur(6px)'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar sx={{ m: 1, bgcolor: 'transparent', color: 'white', width: 56, height: 56, border: '1px solid rgba(255,255,255,0.12)' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography variant="h5" component="h1" gutterBottom sx={{ color: 'common.white', fontWeight: 700 }}>
            Welcome back
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
            Sign in to continue to Az DataMart
          </Typography>
        </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          variant="filled"
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          margin="normal"
          required
          sx={{
            bgcolor: 'rgba(255,255,255,0.03)',
            borderRadius: 1,
            '& .MuiFilledInput-root': { color: 'common.white' },
            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
          }}
        />
        <TextField
          fullWidth
          variant="filled"
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          margin="normal"
          required
          sx={{
            bgcolor: 'rgba(255,255,255,0.03)',
            borderRadius: 1,
            '& .MuiFilledInput-root': { color: 'common.white' },
            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
          }}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{
            mt: 2,
            py: 1.1,
            fontWeight: 700,
            background: 'linear-gradient(90deg, #7C3AED 0%, #06B6D4 100%)',
            color: 'common.white',
            boxShadow: '0 8px 20px rgba(124,58,237,0.28)',
            '&:hover': { boxShadow: '0 12px 30px rgba(6,182,212,0.18)' }
          }}
        >
          Sign In
        </Button>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            New here?
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate("/register")}
            sx={{
              borderColor: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.9)',
              '&:hover': { borderColor: 'rgba(255,255,255,0.2)' }
            }}
          >
            Create an account
          </Button>
        </Stack>
      </form>
      </Paper>
    </Box>
  );
};

export default Login;
