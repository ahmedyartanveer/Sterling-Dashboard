import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Alert,
    Snackbar,
    CircularProgress,
    Avatar,
    Divider,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    useTheme,
    useMediaQuery,
    alpha,
    IconButton,
    Button,
    Tooltip,
} from '@mui/material';
import axiosInstance from '../api/axios';
import { useAuth } from '../auth/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Import Lucide React icons
import {
    Edit,
    Save,
    X,
    ShieldCheck,
    Mail,
    User,
    Lock,
    Smartphone,
    Calendar,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Key,
    RefreshCw,
    Shield,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import DashboardLoader from './Loader/DashboardLoader';
import OutlineButton from './ui/OutlineButton';
import DeviceList from './DeviceList'; // Add this import
import GradientButton from './ui/GradientButton';

// Define color constants (matching your other components)
const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const ORANGE_COLOR = '#ed6c02';
const GRAY_COLOR = '#6b7280';

export const ProfilePage = ({ roleLabel }) => {
    const { user, updateUser } = useAuth();
    const queryClient = useQueryClient();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordError, setPasswordError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
    });

    const {
        data: profile,
        isLoading,
        isError,
        error: fetchError
    } = useQuery({
        queryKey: ['userProfile', user?.id],
        queryFn: async () => {
            const response = await axiosInstance.get('/auth/me');
            const userData = response.data.user || response.data.data || response.data;
            return userData;
        },
        enabled: !!user?.id,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                email: profile.email || '',
            });
        }
    }, [profile]);

    const updateProfileMutation = useMutation({
        mutationFn: async (formData) => {
            const response = await axiosInstance.put('/auth/profile', formData);
            return response.data.data || response.data;
        },
        onMutate: async (newData) => {
            await queryClient.cancelQueries({ queryKey: ['userProfile', user?.id] });
            const previousProfile = queryClient.getQueryData(['userProfile', user?.id]);

            const optimisticProfile = {
                ...previousProfile,
                ...newData,
                updatedAt: new Date().toISOString(),
            };

            queryClient.setQueryData(['userProfile', user?.id], optimisticProfile);
            setFormData(newData);

            if (updateUser) {
                updateUser(newData);
            }

            return { previousProfile };
        },
        onSuccess: (updatedData) => {
            setFormData({
                name: updatedData.name || '',
                email: updatedData.email || '',
            });

            if (updateUser) {
                updateUser(updatedData);
            }

            setIsEditing(false);
            showSnackbar('Profile updated successfully!', 'success');
        },
        onError: (err, newData, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(['userProfile', user?.id], context.previousProfile);
                setFormData({
                    name: context.previousProfile.name || '',
                    email: context.previousProfile.email || '',
                });

                if (updateUser) {
                    updateUser(context.previousProfile);
                }
            }

            showSnackbar(err.response?.data?.message || 'Failed to update profile. Please try again.', 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: async (passwordData) => {
            const response = await axiosInstance.put('/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            return response.data;
        },
        onSuccess: () => {
            showSnackbar('Password changed successfully!', 'success');
            setOpenPasswordDialog(false);
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        },
        onError: (err) => {
            setPasswordError(err.response?.data?.message || 'Failed to change password. Please check your current password.');
        },
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {
        if (!formData.name?.trim()) {
            showSnackbar('Name is required', 'error');
            return;
        }

        if (!formData.email?.trim()) {
            showSnackbar('Email is required', 'error');
            return;
        }

        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            showSnackbar('Please enter a valid email address', 'error');
            return;
        }

        updateProfileMutation.mutate(formData);
    };

    const handleCancel = () => {
        setIsEditing(false);
        const currentProfile = queryClient.getQueryData(['userProfile', user?.id]);
        if (currentProfile) {
            setFormData({
                name: currentProfile.name || '',
                email: currentProfile.email || '',
            });
        } else if (profile) {
            setFormData({
                name: profile.name || '',
                email: profile.email || '',
            });
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
        if (passwordError) {
            setPasswordError('');
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        changePasswordMutation.mutate(passwordData);
    };

    const handleClosePasswordDialog = () => {
        setOpenPasswordDialog(false);
        setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        });
        setPasswordError('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    const showSnackbar = (message, severity = 'success') => {
        if (severity === 'success') {
            setSuccess(message);
        } else {
            setError(message);
        }
        setTimeout(() => {
            severity === 'success' ? setSuccess('') : setError('');
        }, 3000);
    };

    if (isLoading) {
        return <DashboardLoader />;
    }

    if (isError) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <Alert severity="error" sx={{
                    width: '100%',
                    maxWidth: 500,
                    borderRadius: '6px',
                    backgroundColor: alpha(RED_COLOR, 0.05),
                    borderLeft: `4px solid ${RED_COLOR}`,
                    '& .MuiAlert-icon': {
                        color: RED_COLOR,
                    },
                }}>
                    <Typography
                        sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 500,
                        }}
                    >
                        Failed to load profile
                    </Typography>
                </Alert>
            </Box>
        );
    }

    if (!profile && !isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <Alert severity="warning" sx={{
                    width: '100%',
                    maxWidth: 500,
                    borderRadius: '6px',
                    backgroundColor: alpha(ORANGE_COLOR, 0.05),
                    borderLeft: `4px solid ${ORANGE_COLOR}`,
                    '& .MuiAlert-icon': {
                        color: ORANGE_COLOR,
                    },
                }}>
                    <Typography
                        sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 500,
                        }}
                    >
                        Profile not found
                    </Typography>
                </Alert>
            </Box>
        );
    }

    const updating = updateProfileMutation.isPending;

    // Custom input component for consistency
    const CustomInput = ({ label, name, value, onChange, type = 'text', disabled, error, helperText, icon: Icon, showPassword, onTogglePassword }) => {
        return (
            <Box sx={{ mb: 2 }}>
                <Typography
                    variant="body2"
                    sx={{
                        mb: 0.5,
                        color: TEXT_COLOR,
                        fontSize: '0.8rem',
                        fontWeight: 500,
                    }}
                >
                    {label}
                </Typography>
                <Box sx={{ position: 'relative' }}>
                    {Icon && (
                        <Box sx={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: GRAY_COLOR,
                        }}>
                            <Icon size={16} />
                        </Box>
                    )}
                    <Box
                        component="input"
                        name={name}
                        value={value || ''}
                        onChange={onChange}
                        type={showPassword ? 'text' : type}
                        disabled={disabled}
                        placeholder={label}
                        sx={{
                            width: '100%',
                            fontSize: '0.85rem',
                            height: '40px',
                            paddingLeft: Icon ? '36px' : '12px',
                            paddingRight: onTogglePassword ? '36px' : '12px',
                            border: `1px solid ${error ? RED_COLOR : alpha(TEXT_COLOR, 0.1)}`,
                            borderRadius: '6px',
                            outline: 'none',
                            backgroundColor: disabled ? alpha(GRAY_COLOR, 0.05) : 'white',
                            color: TEXT_COLOR,
                            '&:focus': {
                                borderColor: BLUE_COLOR,
                                boxShadow: `0 0 0 2px ${alpha(BLUE_COLOR, 0.1)}`,
                            },
                            '&:disabled': {
                                opacity: 0.6,
                                cursor: 'not-allowed',
                            },
                        }}
                    />
                    {onTogglePassword && (
                        <IconButton
                            size="small"
                            onClick={onTogglePassword}
                            sx={{
                                position: 'absolute',
                                right: '4px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                padding: '4px',
                                color: GRAY_COLOR,
                            }}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconButton>
                    )}
                </Box>
                {helperText && (
                    <Typography
                        variant="caption"
                        sx={{
                            color: error ? RED_COLOR : GRAY_COLOR,
                            fontSize: '0.75rem',
                            mt: 0.5,
                            display: 'block',
                        }}
                    >
                        {helperText}
                    </Typography>
                )}
            </Box>
        );
    };

    return (
        <Box>
            <Helmet>
                <title>Profile | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Profile page" />
            </Helmet>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography
                        sx={{
                            fontWeight: 600,
                            mb: 0.5,
                            fontSize: '0.95rem',
                            color: TEXT_COLOR,
                            letterSpacing: '-0.01em',
                        }}
                    >
                        My Profile
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: GRAY_COLOR,
                            fontSize: '0.8rem',
                            fontWeight: 400,
                        }}
                    >
                        Manage your account and security
                    </Typography>
                </Box>
                {!isEditing ? (
                    <GradientButton
                        variant="contained"
                        startIcon={<Edit size={16} />}
                        onClick={() => setIsEditing(true)}
                        disabled={updating}
                    >
                        Edit Profile
                    </GradientButton>
                ) : (
                    <Box display="flex" gap={1}>
                        <OutlineButton
                            startIcon={<X size={16} />}
                            onClick={handleCancel}
                            disabled={updating}
                            sx={{
                                fontSize: isMobile ? '0.75rem' : '0.85rem',
                            }}
                        >
                            Cancel
                        </OutlineButton>
                        <GradientButton
                            variant="contained"
                            startIcon={<Save size={16} />}
                            onClick={handleSave}
                            disabled={updating}
                        >
                            {updating ? 'Saving...' : 'Save Changes'}
                        </GradientButton>
                    </Box>
                )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2.5 }}>
                {/* Left Column - Personal Information & Devices */}
                <Box sx={{ flex: 1 }}>
                    {/* Personal Information Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            mb: 2.5,
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: `1px solid ${alpha(BLUE_COLOR, 0.15)}`,
                            bgcolor: 'white'
                        }}
                    >
                        <Box
                            sx={{
                                p: isMobile ? 1 : 1.5,
                                bgcolor: 'white',
                                borderBottom: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <User size={18} color={BLUE_COLOR} />
                                    <Typography
                                        sx={{
                                            fontSize: isMobile ? '0.85rem' : '0.9rem',
                                            color: TEXT_COLOR,
                                            fontWeight: 600,
                                        }}
                                    >
                                        Personal Information
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ p: isMobile ? 1.5 : 2 }}>
                            {/* Name Field */}
                            <CustomInput
                                label="Full Name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                disabled={!isEditing || updating}
                                error={!formData.name?.trim() && isEditing}
                                helperText={!formData.name?.trim() && isEditing ? "Name is required" : ""}
                                icon={User}
                            />

                            {/* Email Field */}
                            <CustomInput
                                label="Email Address"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                disabled={!isEditing || updating}
                                error={(!/\S+@\S+\.\S+/.test(formData.email)) && isEditing && formData.email}
                                helperText={(!/\S+@\S+\.\S+/.test(formData.email)) && isEditing && formData.email ? "Enter valid email" : ""}
                                icon={Mail}
                            />

                            {profile?.createdAt && (
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    mt: 2,
                                    pt: 2,
                                    borderTop: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
                                }}>
                                    <Calendar size={14} color={GRAY_COLOR} />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: GRAY_COLOR,
                                            fontSize: '0.75rem',
                                            fontWeight: 400,
                                        }}
                                    >
                                        Account created: {new Date(profile.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Paper>

                    {/* Device List Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: `1px solid ${alpha(BLUE_COLOR, 0.15)}`,
                            bgcolor: 'white'
                        }}
                    >
                        <Box
                            sx={{
                                p: isMobile ? 1 : 1.5,
                                bgcolor: 'white',
                                borderBottom: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Smartphone size={18} color={BLUE_COLOR} />
                                    <Typography
                                        sx={{
                                            fontSize: isMobile ? '0.85rem' : '0.9rem',
                                            color: TEXT_COLOR,
                                            fontWeight: 600,
                                        }}
                                    >
                                        Active Devices
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ p: isMobile ? 1.5 : 2 }}>
                            <DeviceList
                                devices={profile?.devices || []}
                                title=""
                                subtitle=""
                            />
                        </Box>
                    </Paper>
                </Box>

                {/* Right Column - Profile Summary */}
                <Box sx={{ width: isMobile ? '100%' : 300 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: `1px solid ${alpha(BLUE_COLOR, 0.15)}`,
                            bgcolor: 'white'
                        }}
                    >
                        <Box
                            sx={{
                                p: isMobile ? 1 : 1.5,
                                bgcolor: 'white',
                                borderBottom: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
                            }}
                        >
                            <Typography
                                sx={{
                                    fontSize: isMobile ? '0.85rem' : '0.9rem',
                                    color: TEXT_COLOR,
                                    fontWeight: 600,
                                }}
                            >
                                Profile Summary
                            </Typography>
                        </Box>

                        <Box sx={{ p: isMobile ? 1.5 : 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {/* Profile Avatar */}
                            <Box sx={{ mb: 2 }}>
                                <Avatar
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        fontSize: '1.5rem',
                                        fontWeight: 600,
                                        bgcolor: BLUE_COLOR,
                                        color: '#ffffff',
                                        border: '3px solid #ffffff',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    {(formData.name?.charAt(0) || profile?.name?.charAt(0) || user?.name?.charAt(0) || 'U')?.toUpperCase()}
                                </Avatar>
                            </Box>

                            {/* User Name */}
                            <Typography
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    mb: 0.5,
                                    textAlign: 'center',
                                }}
                            >
                                {formData.name || profile?.name || user?.name || 'User'}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: GRAY_COLOR,
                                    fontSize: '0.85rem',
                                    fontWeight: 400,
                                    mb: 2,
                                    textAlign: 'center',
                                }}
                            >
                                {formData.email || profile?.email || user?.email || ''}
                            </Typography>

                            {/* Role Badge */}
                            <Chip
                                icon={<Shield size={14} />}
                                label={roleLabel || (profile?.role || user?.role || 'USER').replace('_', ' ').toUpperCase()}
                                size="small"
                                sx={{
                                    mb: 2,
                                    fontWeight: 500,
                                    height: '24px',
                                    backgroundColor: alpha(BLUE_COLOR, 0.08),
                                    color: BLUE_COLOR,
                                    border: `1px solid ${alpha(BLUE_COLOR, 0.3)}`,
                                    fontSize: '0.75rem',
                                    '& .MuiChip-icon': {
                                        color: BLUE_COLOR,
                                        marginLeft: '6px',
                                    },
                                    '& .MuiChip-label': {
                                        px: 1,
                                    },
                                }}
                            />

                            <Divider sx={{
                                width: '100%',
                                my: 2,
                                backgroundColor: alpha(BLUE_COLOR, 0.1),
                            }} />

                            {/* Security Actions */}
                            <Box sx={{ width: '100%' }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={() => setOpenPasswordDialog(true)}
                                    disabled={updating || changePasswordMutation.isPending}
                                    startIcon={<Key size={16} />}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: '0.85rem',
                                        color: BLUE_COLOR,
                                        borderColor: alpha(BLUE_COLOR, 0.3),
                                        '&:hover': {
                                            borderColor: BLUE_COLOR,
                                            backgroundColor: alpha(BLUE_COLOR, 0.05),
                                        },
                                    }}
                                >
                                    Change Password
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            </Box>

            {/* Password Change Dialog */}
            <Dialog
                open={openPasswordDialog}
                onClose={handleClosePasswordDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '8px',
                        bgcolor: 'white',
                        border: `1px solid ${alpha(BLUE_COLOR, 0.15)}`,
                    }
                }}
            >
                <DialogTitle sx={{
                    p: 2,
                    borderBottom: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
                    bgcolor: 'white',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Lock size={18} color={BLUE_COLOR} />
                        <Typography
                            sx={{
                                fontSize: '0.95rem',
                                color: TEXT_COLOR,
                                fontWeight: 600,
                            }}
                        >
                            Change Password
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 2.5 }}>
                    {passwordError && (
                        <Alert
                            severity="error"
                            icon={<AlertCircle size={18} />}
                            sx={{
                                borderRadius: '6px',
                                backgroundColor: alpha(RED_COLOR, 0.05),
                                borderLeft: `4px solid ${RED_COLOR}`,
                                '& .MuiAlert-icon': {
                                    color: RED_COLOR,
                                },
                                mb: 2,
                            }}
                        >
                            <Typography
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                }}
                            >
                                {passwordError}
                            </Typography>
                        </Alert>
                    )}

                    {/* Current Password */}
                    <CustomInput
                        label="Current Password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        disabled={changePasswordMutation.isPending}
                        icon={Lock}
                        type="password"
                        showPassword={showCurrentPassword}
                        onTogglePassword={() => setShowCurrentPassword(!showCurrentPassword)}
                    />

                    {/* New Password */}
                    <CustomInput
                        label="New Password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        disabled={changePasswordMutation.isPending}
                        icon={Key}
                        type="password"
                        showPassword={showNewPassword}
                        onTogglePassword={() => setShowNewPassword(!showNewPassword)}
                        helperText="Password must be at least 6 characters"
                    />

                    {/* Confirm Password */}
                    <CustomInput
                        label="Confirm New Password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        disabled={changePasswordMutation.isPending}
                        icon={CheckCircle}
                        type="password"
                        showPassword={showConfirmPassword}
                        onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                    <OutlineButton
                        startIcon={<X size={16} />}
                        onClick={handleClosePasswordDialog}
                        sx={{
                            fontSize: isMobile ? '0.75rem' : '0.85rem',
                        }}
                    >
                        Cancel
                    </OutlineButton>
                    <GradientButton
                        onClick={handleChangePassword}
                        variant="contained"
                        disabled={changePasswordMutation.isPending}
                        startIcon={changePasswordMutation.isPending ? <RefreshCw size={16} /> : <Key size={16} />}
                    >
                        {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                    </GradientButton>
                </DialogActions>
            </Dialog>

            {/* Success Notification */}
            <Snackbar
                open={!!success}
                autoHideDuration={3000}
                onClose={() => setSuccess('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity="success"
                    icon={<CheckCircle size={20} />}
                    sx={{
                        width: '100%',
                        borderRadius: '6px',
                        backgroundColor: alpha(GREEN_COLOR, 0.05),
                        borderLeft: `4px solid ${GREEN_COLOR}`,
                        '& .MuiAlert-icon': {
                            color: GREEN_COLOR,
                        },
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: TEXT_COLOR,
                        }}
                    >
                        {success}
                    </Typography>
                </Alert>
            </Snackbar>

            {/* Error Notification */}
            <Snackbar
                open={!!error}
                autoHideDuration={3000}
                onClose={() => setError('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity="error"
                    icon={<AlertCircle size={20} />}
                    sx={{
                        width: '100%',
                        borderRadius: '6px',
                        backgroundColor: alpha(RED_COLOR, 0.05),
                        borderLeft: `4px solid ${RED_COLOR}`,
                        '& .MuiAlert-icon': {
                            color: RED_COLOR,
                        },
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: TEXT_COLOR,
                        }}
                    >
                        {error}
                    </Typography>
                </Alert>
            </Snackbar>
        </Box>
    );
};