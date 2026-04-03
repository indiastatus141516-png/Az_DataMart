// import React, { useState } from 'react';
// import { TextField, Button, Paper, Typography, Alert } from '@mui/material';
// import { authAPI } from '../services/api';

// const Register = () => {
//   const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setSuccess('');

//     if (formData.password !== formData.confirmPassword) {
//       setError('Passwords do not match');
//       return;
//     }

//     try {
//       await authAPI.register({ email: formData.email, password: formData.password });
//       setSuccess('Registration successful! Please wait for admin approval.');
//       setFormData({ email: '', password: '', confirmPassword: '' });
//     } catch (err) {
//       setError(err.response?.data?.message || 'Registration failed');
//     }
//   };

//   return (
//     <Paper elevation={3} sx={{ p: 3, maxWidth: 400, mx: 'auto', mt: 4 }}>
//       <Typography variant="h5" component="h1" gutterBottom>
//         Register
//       </Typography>
//       {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
//       {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
//       <form onSubmit={handleSubmit}>
//         <TextField
//           fullWidth
//           label="Email"
//           name="email"
//           type="email"
//           value={formData.email}
//           onChange={handleChange}
//           margin="normal"
//           required
//         />
//         <TextField
//           fullWidth
//           label="Password"
//           name="password"
//           type="password"
//           value={formData.password}
//           onChange={handleChange}
//           margin="normal"
//           required
//         />
//         <TextField
//           fullWidth
//           label="Confirm Password"
//           name="confirmPassword"
//           type="password"
//           value={formData.confirmPassword}
//           onChange={handleChange}
//           margin="normal"
//           required
//         />
//         <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }}>
//           Register
//         </Button>
//       </form>
//     </Paper>
//   );
// };

// export default Register;


import React, { useState } from 'react';
import { Box, TextField, Button, Paper, Typography, Alert, Stack, Avatar } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await authAPI.register({ email: formData.email, password: formData.password });
      setSuccess('Registration successful! Please wait for admin approval.');
      setFormData({ email: '', password: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #071A52 0%, #0B6B79 50%)', py: 8 }}>
      <Paper elevation={10} sx={{ p: 4, width: '100%', maxWidth: 520, mx: 2, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography variant="h5" component="h1" gutterBottom>
            Create an account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
            Join Az DataMart — registration is subject to admin approval.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            required
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <Button type="submit" variant="contained" fullWidth={false} sx={{ flex: 1 }} disabled={loading}>
              {loading ? 'Creating...' : 'Create account'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/login')} sx={{ whiteSpace: 'nowrap' }}>
              Already registered? Login
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default Register;
