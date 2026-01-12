import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
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
    LinearProgress,
    useTheme,
    useMediaQuery,
    alpha,
} from '@mui/material';
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Security as SecurityIcon,
    Email as EmailIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import axiosInstance from '../api/axios';
import { useAuth } from '../auth/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StyledTextField from './ui/StyledTextField';
import GradientButton from './ui/GradientButton';
import OutlineButton from './ui/OutlineButton';
import DeviceList from './DeviceList';

// Define color constants
const TEXT_COLOR = '#0F1115';
const BLUE_LIGHT = '#A8C9E9';
const BLUE_COLOR = '#1976d2';
const BLUE_DARK = '#1565c0';
const RED_COLOR = '#ef4444';
const RED_DARK = '#dc2626';
const GREEN_COLOR = '#10b981';

export const ProfilePage = ({ roleLabel }) => {
    const { user, updateUser } = useAuth();
    const queryClient = useQueryClient();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
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
            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
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

            setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
            setTimeout(() => setError(''), 3000);
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
            setSuccess('Password changed successfully!');
            setOpenPasswordDialog(false);
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            setTimeout(() => setSuccess(''), 3000);
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
            setError('Name is required');
            setTimeout(() => setError(''), 3000);
            return;
        }

        if (!formData.email?.trim()) {
            setError('Email is required');
            setTimeout(() => setError(''), 3000);
            return;
        }

        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            setError('Please enter a valid email address');
            setTimeout(() => setError(''), 3000);
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
    };

    const handleCloseSnackbar = () => {
        setSuccess('');
        setError('');
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress sx={{ color: BLUE_COLOR }} />
            </Box>
        );
    }

    if (isError) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Alert severity="error" sx={{ 
                    width: '100%', 
                    maxWidth: 500,
                    borderRadius: 2,
                    backgroundColor: alpha(RED_COLOR, 0.05),
                    borderLeft: `4px solid ${RED_COLOR}`,
                }}>
                    <Typography variant="h6" sx={{ color: TEXT_COLOR }} gutterBottom>
                        Failed to load profile
                    </Typography>
                    <Typography variant="body2" sx={{ color: TEXT_COLOR, opacity: 0.7 }}>
                        {fetchError?.message || 'Please try again later.'}
                    </Typography>
                </Alert>
            </Box>
        );
    }

    if (!profile && !isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Alert severity="warning" sx={{ 
                    width: '100%', 
                    maxWidth: 500,
                    borderRadius: 2,
                    backgroundColor: alpha('#f59e0b', 0.05),
                    borderLeft: `4px solid #f59e0b`,
                }}>
                    <Typography variant="h6" sx={{ color: TEXT_COLOR }} gutterBottom>
                        Profile not found
                    </Typography>
                    <Typography variant="body2" sx={{ color: TEXT_COLOR, opacity: 0.7 }}>
                        Unable to load profile data. Please refresh the page.
                    </Typography>
                </Alert>
            </Box>
        );
    }

    const updating = updateProfileMutation.isPending;

    return (
        <Box position="relative">
            {(updateProfileMutation.isPending || changePasswordMutation.isPending) && (
                <LinearProgress
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        height: 3,
                        backgroundColor: alpha(BLUE_COLOR, 0.1),
                        '& .MuiLinearProgress-bar': {
                            backgroundColor: BLUE_COLOR,
                        },
                    }}
                />
            )}

            <Box sx={{ display: { xs: '', lg: 'flex' } }} justifyContent="space-between" alignItems="center" mb={1}>
                <Box mb={isMobile ? 2 : 0}>
                    <Typography sx={{ 
                        fontWeight: 'bold', 
                        mb: 0.5, 
                        fontSize: 20,
                        color: TEXT_COLOR,
                    }}>
                        My Profile
                    </Typography>
                    <Typography variant="body2" sx={{ color: TEXT_COLOR, opacity: 0.7 }}>
                        Manage your account settings and preferences
                    </Typography>
                </Box>
                {!isEditing ? (
                    <GradientButton
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => setIsEditing(true)}
                        disabled={updating}
                        size={isMobile ? "small" : "large"}
                    >
                        Edit Profile
                    </GradientButton>
                ) : (
                    <Box display="flex" gap={2}>
                        <OutlineButton
                            startIcon={<CancelIcon />}
                            onClick={handleCancel}
                            disabled={updating}
                            size='small'
                        >
                            Cancel
                        </OutlineButton>
                        <GradientButton
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            disabled={updating}
                        >
                            {updating ? 'Saving...' : 'Save Changes'}
                        </GradientButton>
                    </Box>
                )}
            </Box>

            {updating && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                    }}
                >
                    <CircularProgress sx={{ color: BLUE_COLOR }} />
                </Box>
            )}

            <Grid container spacing={3}>
                {/* KEPT ORIGINAL SYNTAX: size={{ xs: 12, md: 8 }} */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            height: '100%',
                            borderRadius: 2,
                            border: `1px solid ${alpha(TEXT_COLOR, 0.1)}`,
                            bgcolor: 'white'
                        }}
                    >
                        <Box display="flex" alignItems="center" mb={3}>
                            <Typography fontWeight="bold" sx={{ color: TEXT_COLOR , fontSize: '1.2rem' }}>
                                Personal Information
                            </Typography>
                        </Box>

                        <Grid container spacing={2}>
                            {/* KEPT ORIGINAL SYNTAX: size={{ xs: 12, md: 6 }} */}
                            <Grid size={{ xs: 12, md: 6 }}>
                                <StyledTextField
                                    fullWidth
                                    label="Full Name"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleInputChange}
                                    disabled={!isEditing || updating}
                                    error={!formData.name?.trim() && isEditing}
                                    helperText={!formData.name?.trim() && isEditing ? "Name is required" : ""}
                                    InputProps={{
                                        startAdornment: <PersonIcon sx={{ mr: 1, color: '#0F1115' }} />,
                                    }}
                                    variant="outlined"
                                    size="small"
                                    sx={{ mb: 2 }}
                                />
                            </Grid>

                            {/* KEPT ORIGINAL SYNTAX: size={{ xs: 12, md: 6 }} */}
                            <Grid size={{ xs: 12, md: 6 }}>
                                <StyledTextField
                                    fullWidth
                                    label="Email Address"
                                    name="email"
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={handleInputChange}
                                    disabled={!isEditing || updating}
                                    error={(!/\S+@\S+\.\S+/.test(formData.email)) && isEditing && formData.email}
                                    helperText={(!/\S+@\S+\.\S+/.test(formData.email)) && isEditing && formData.email ? "Enter valid email" : ""}
                                    InputProps={{
                                        startAdornment: <EmailIcon sx={{ mr: 1, color: '#0F1115' }} />,
                                    }}
                                    variant="outlined"
                                    size="small"
                                    sx={{ mb: 2 }}
                                />
                            </Grid>
                        </Grid>

                        <Divider sx={{ 
                            my: 3,
                            backgroundColor: alpha(TEXT_COLOR, 0.1),
                        }} />

                        <DeviceList devices={profile?.devices || []} />

                        {profile?.createdAt && (
                            <Box mt={3}>
                                <Typography variant="caption" sx={{ color: TEXT_COLOR, opacity: 0.7 }}>
                                    Account created: {new Date(profile.createdAt).toLocaleDateString()}
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* KEPT ORIGINAL SYNTAX: size={{ xs: 12, md: 4 }} */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            height: '100%',
                            borderRadius: 2,
                            border: `1px solid ${alpha(TEXT_COLOR, 0.1)}`,
                            bgcolor: 'white'
                        }}
                    >
                        <Box display="flex" flexDirection="column" alignItems="center">
                            <Avatar
                                sx={{
                                    width: 120,
                                    height: 120,
                                    fontSize: 48,
                                    fontWeight: 'bold',
                                    mb: 3,
                                }}
                            >
                                {(formData.name?.charAt(0) || profile?.name?.charAt(0) || user?.name?.charAt(0) || 'U')?.toUpperCase()}
                            </Avatar>

                            <Typography variant="h5" fontWeight="bold" align="center" gutterBottom sx={{ color: TEXT_COLOR }}>
                                {formData.name || profile?.name || user?.name || 'User'}
                            </Typography>
                            <Typography variant="body2" align="center" mb={3} sx={{ color: TEXT_COLOR, opacity: 0.7 }}>
                                {formData.email || profile?.email || user?.email || ''}
                            </Typography>

                            <Chip
                                label={roleLabel || (profile?.role || user?.role || 'USER').replace('_', ' ').toUpperCase()}
                                size="small"
                                sx={{
                                    mb: 4,
                                    fontWeight: 'bold',
                                    px: 2,
                                    py: 1,
                                    color: '#0F1115',
                                    '& .MuiChip-icon': {
                                        color: '#FFFFFF',
                                    },
                                }}
                            />
                        </Box>

                        <Divider sx={{ 
                            my: 4,
                            backgroundColor: alpha(TEXT_COLOR, 0.1),
                        }} />

                        <Box display="flex" flexDirection="column" gap={2}>
                            <OutlineButton
                                fullWidth
                                onClick={() => setOpenPasswordDialog(true)}
                                disabled={updating || changePasswordMutation.isPending}
                                size="large"
                            >
                                Change Password
                            </OutlineButton>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Dialog
                open={openPasswordDialog}
                onClose={handleClosePasswordDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: 'white'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    color: '#0F1115',
                }}>
                    <Box display="flex" alignItems="center" sx={{fontSize: '1.2rem'}} gap={1}>
                        Change Password
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        {passwordError && (
                            <Alert severity="error" sx={{ 
                                borderRadius: 2,
                                backgroundColor: alpha(RED_COLOR, 0.05),
                                borderLeft: `4px solid ${RED_COLOR}`,
                            }}>
                                <Typography sx={{ color: TEXT_COLOR }}>{passwordError}</Typography>
                            </Alert>
                        )}

                        <StyledTextField
                            fullWidth
                            label="Current Password"
                            name="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            margin="normal"
                            required
                            size='small'
                            disabled={changePasswordMutation.isPending}
                            variant="outlined"
                        />

                        <StyledTextField
                            fullWidth
                            label="New Password"
                            name="newPassword"
                            type="password"
                            size='small'
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            margin="normal"
                            required
                            helperText="Password must be at least 6 characters"
                            disabled={changePasswordMutation.isPending}
                            variant="outlined"
                        />

                        <StyledTextField
                            fullWidth
                            label="Confirm New Password"
                            name="confirmPassword"
                            type="password"
                            size='small'
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            margin="normal"
                            required
                            disabled={changePasswordMutation.isPending}
                            variant="outlined"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <OutlineButton
                        onClick={handleClosePasswordDialog}
                        disabled={changePasswordMutation.isPending}
                        variant="outlined"
                    >
                        Cancel
                    </OutlineButton>
                    <GradientButton
                        onClick={handleChangePassword}
                        variant="contained"
                        disabled={changePasswordMutation.isPending}
                    >
                        {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                    </GradientButton>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={!!success}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity="success"
                    sx={{ 
                        width: '100%',
                        borderRadius: 2,
                        backgroundColor: alpha(GREEN_COLOR, 0.05),
                        borderLeft: `4px solid ${GREEN_COLOR}`,
                        '& .MuiAlert-icon': {
                            color: GREEN_COLOR,
                        },
                    }}
                    elevation={6}
                >
                    <Typography fontWeight={500} sx={{ color: TEXT_COLOR }}>{success}</Typography>
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity="error"
                    sx={{ 
                        width: '100%',
                        borderRadius: 2,
                        backgroundColor: alpha(RED_COLOR, 0.05),
                        borderLeft: `4px solid ${RED_COLOR}`,
                        '& .MuiAlert-icon': {
                            color: RED_COLOR,
                        },
                    }}
                    elevation={6}
                >
                    <Typography fontWeight={500} sx={{ color: TEXT_COLOR }}>{error}</Typography>
                </Alert>
            </Snackbar>
        </Box>
    );
};