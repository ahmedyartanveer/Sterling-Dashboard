import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { Helmet } from 'react-helmet-async';
import {
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
  Building,
  Shield,
  User,
  Key,
  HelpCircle,
} from 'lucide-react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Container,
  alpha,
  Link,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import GradientButton from '../../components/ui/GradientButton';
import StyledTextField from '../../components/ui/StyledTextField';
import OutlineButton from '../../components/ui/OutlineButton';

// Define color constants (same as other components)
const TEXT_COLOR = '#0F1115';
const BLUE_LIGHT = '#A8C9E9';
const BLUE_COLOR = '#1976d2';
const BLUE_DARK = '#1565c0';
const RED_COLOR = '#ef4444';
const RED_DARK = '#dc2626';
const GREEN_COLOR = '#10b981';
const GREEN_DARK = '#059669';
const GRAY_COLOR = '#6b7280';
const GRAY_LIGHT = '#f3f4f6';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved email from localStorage on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Save or remove email based on rememberMe state
  useEffect(() => {
    if (rememberMe && email) {
      localStorage.setItem('rememberedEmail', email);
    } else if (!rememberMe) {
      localStorage.removeItem('rememberedEmail');
    }
  }, [rememberMe, email]);

  // Login form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    // Implement forgot password logic
    console.log('Forgot password clicked');
  };

  // Handle remember me checkbox change
  const handleRememberMeChange = (e) => {
    const isChecked = e.target.checked;
    setRememberMe(isChecked);

    if (isChecked && email) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }
  };

  // Clear remembered email
  const handleClearRememberedEmail = () => {
    localStorage.removeItem('rememberedEmail');
    setEmail('');
    setRememberMe(false);
  };

  return (
    <>
      <Helmet>
        <title>Login | Sterling Septic & Plumbing LLC</title>
        <meta name="description" content="Sign in to your account" />
      </Helmet>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          background: `linear-gradient(135deg, ${alpha('#f8fafc', 1)} 0%, ${alpha('#f1f5f9', 1)} 50%, ${alpha(BLUE_LIGHT, 0.05)} 100%)`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',          }
        }}
      >
        {/* Background decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(BLUE_COLOR, 0.08)} 0%, transparent 70%)`,
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -150,
            left: -150,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(GREEN_COLOR, 0.05)} 0%, transparent 70%)`,
            zIndex: 0,
          }}
        />

        <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: `1px solid ${alpha(BLUE_COLOR, 0.15)}`,
              background: 'white',
              position: 'relative',
            }}
          >
            {/* Form Header */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
                <Typography
                  sx={{
                    fontSize: '1.25rem',
                    color: TEXT_COLOR,
                    fontWeight: 600,
                  }}
                >
                  Sterling Septic & Plumbing
                </Typography>
              </Box>
              <Typography
                sx={{
                  color: GRAY_COLOR,
                  fontSize: '0.8rem',
                  fontWeight: 400,
                }}
              >
                Enter your credentials to continue
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert
                severity="error"
                icon={<AlertCircle size={16} />}
                sx={{
                  mb: 3,
                  borderRadius: '6px',
                  backgroundColor: alpha(RED_COLOR, 0.08),
                  color: RED_DARK,
                  border: `1px solid ${alpha(RED_COLOR, 0.2)}`,
                  '& .MuiAlert-icon': {
                    color: RED_DARK,
                  },
                  '& .MuiAlert-message': {
                    padding: '4px 0',
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: RED_DARK,
                  }}
                >
                  {error}
                </Typography>
              </Alert>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ '& > *': { mb: 2.5 } }}>
              {/* Email Field */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: TEXT_COLOR,
                      fontSize: '0.8rem',
                      fontWeight: 500,
                    }}
                  >
                    Email Address
                  </Typography>
                  {localStorage.getItem('rememberedEmail') && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: BLUE_COLOR,
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                      onClick={handleClearRememberedEmail}
                    >
                      Clear remembered email
                    </Typography>
                  )}
                </Box>
                <StyledTextField
                  fullWidth
                  size="small"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Mail size={16} color={GRAY_COLOR} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: '0.85rem',
                      height: '42px',
                    },
                    '& .MuiInputBase-input': {
                      padding: '10px 12px',
                    },
                  }}
                />
              </Box>

              {/* Password Field */}
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    mb: 1,
                    color: TEXT_COLOR,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                  }}
                >
                  Password
                </Typography>
                <StyledTextField
                  fullWidth
                  size="small"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock size={16} color={GRAY_COLOR} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          sx={{
                            padding: '6px',
                            color: GRAY_COLOR,
                            '&:hover': {
                              backgroundColor: alpha(BLUE_COLOR, 0.1),
                            },
                          }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: '0.85rem',
                      height: '42px',
                    },
                    '& .MuiInputBase-input': {
                      padding: '10px 12px',
                    },
                  }}
                />
              </Box>

              {/* Remember Me and Forgot Password */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={rememberMe}
                      onChange={handleRememberMeChange}
                      sx={{
                        color: BLUE_COLOR,
                        '&.Mui-checked': {
                          color: BLUE_COLOR,
                        },
                        padding: '6px',
                        '& .MuiSvgIcon-root': {
                          fontSize: 16,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        color: TEXT_COLOR,
                        fontWeight: 400,
                      }}
                    >
                      Remember me
                    </Typography>
                  }
                />
                {/* <Link
                  component="button"
                  type="button"
                  onClick={handleForgotPassword}
                  sx={{
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: BLUE_COLOR,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Forgot password?
                </Link> */}
              </Box>

              {/* Submit Button */}
              <GradientButton
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                startIcon={isLoading ? null : <LogIn size={16} />}
                sx={{
                  mt: 2,
                  py: 0.9,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                {isLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <CircularProgress
                      size={18}
                      sx={{
                        color: 'white',
                        width: '18px !important',
                        height: '18px !important',
                      }}
                    />
                    Signing in...
                  </Box>
                ) : (
                  'Sign In'
                )}
              </GradientButton>
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
};