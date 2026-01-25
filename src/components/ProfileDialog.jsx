import React from 'react';
import { alpha } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import {
    User,
    ShieldCheck,
    Briefcase,
    UserCog,
    Mail,
    Shield,
    Calendar,
    Edit,
    X,
} from 'lucide-react';
import GradientButton from './ui/GradientButton';

// Color constants matching your other components
const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const ORANGE_COLOR = '#ed6c02';
const GRAY_COLOR = '#6b7280';

const ProfileDialog = ({ open, onClose, user, userRole }) => {
    const navigate = useNavigate();

    if (!user) return null;

    const getDashboardBasePath = () => {
        switch (userRole?.toUpperCase()) {
            case 'SUPER-ADMIN':
            case 'SUPERADMIN':
                return '/super-admin-dashboard';
            case 'MANAGER':
                return '/manager-dashboard';
            case 'TECH':
                return '/tech-dashboard';
            default:
                return '/';
        }
    };

    const getRoleColor = (role) => {
        switch (role?.toUpperCase()) {
            case 'SUPERADMIN':
            case 'SUPER-ADMIN':
                return RED_COLOR;
            case 'MANAGER':
                return BLUE_COLOR;
            case 'TECH':
                return GREEN_COLOR;
            default:
                return GRAY_COLOR;
        }
    };

    const getRoleLabel = (role) => {
        switch (role?.toUpperCase()) {
            case 'SUPERADMIN':
            case 'SUPER-ADMIN':
                return 'Super Admin';
            case 'MANAGER':
                return 'Manager';
            case 'TECH':
                return 'Technician';
            default:
                return 'User';
        }
    };

    const getRoleIcon = (role) => {
        switch (role?.toUpperCase()) {
            case 'SUPERADMIN':
            case 'SUPER-ADMIN':
                return <ShieldCheck size={16} />;
            case 'MANAGER':
                return <Briefcase size={16} />;
            case 'TECH':
                return <UserCog size={16} />;
            default:
                return <User size={16} />;
        }
    };

    const handleEditProfile = () => {
        const basePath = getDashboardBasePath();
        onClose();
        navigate(`${basePath}/profile`);
    };

    const getInitials = (name) =>
        name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#ffffff',
                    borderRadius: '8px',
                    border: `1px solid ${alpha(BLUE_COLOR, 0.15)}`,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                }
            }}
        >
            <DialogTitle sx={{
                borderBottom: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
                pb: 2,
                position: 'relative',
                bgcolor: 'white',
                p: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: alpha(BLUE_COLOR, 0.1),
                        color: BLUE_COLOR,
                    }}>
                        <User size={18} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            lineHeight: 1.2,
                        }}>
                            User Profile
                        </Typography>
                        <Typography variant="caption" sx={{
                            color: GRAY_COLOR,
                            fontSize: '0.75rem',
                            fontWeight: 400,
                        }}>
                            View and manage your profile information
                        </Typography>
                    </Box>
                </Box>
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        color: GRAY_COLOR,
                        '&:hover': {
                            backgroundColor: alpha(GRAY_COLOR, 0.1),
                            color: TEXT_COLOR,
                        },
                    }}
                >
                    <X size={18} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3, pb: 2, px: 2.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ position: 'relative', mb: 2 }}>
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                bgcolor: BLUE_COLOR,
                                color: '#ffffff',
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                border: '3px solid #ffffff',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                        >
                            {getInitials(user?.name)}
                        </Avatar>
                    </Box>

                    <Typography variant="h5" sx={{
                        color: TEXT_COLOR,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        mb: 1,
                        textAlign: 'center',
                    }}>
                        {user?.name || 'Jenny Wilson'}
                    </Typography>

                    <Chip
                        icon={getRoleIcon(userRole)}
                        label={getRoleLabel(userRole)}
                        size="small"
                        sx={{
                            backgroundColor: alpha(getRoleColor(userRole), 0.08),
                            color: getRoleColor(userRole),
                            border: `1px solid ${alpha(getRoleColor(userRole), 0.3)}`,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            height: '24px',
                            mb: 2,
                            '& .MuiChip-icon': {
                                color: getRoleColor(userRole),
                                marginLeft: '6px',
                                marginRight: '-4px',
                            },
                            '& .MuiChip-label': {
                                px: 1,
                            },
                        }}
                    />
                </Box>

                <Box sx={{
                    backgroundColor: alpha(BLUE_COLOR, 0.03),
                    borderRadius: '6px',
                    p: 2,
                    mb: 2,
                    border: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
                }}>
                    <Typography variant="subtitle2" sx={{
                        color: GRAY_COLOR,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                    }}>
                        <User size={14} />
                        Personal Information
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box>
                            <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                mb: 0.5,
                                display: 'block',
                            }}>
                                Email Address
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Mail size={14} color={GRAY_COLOR} />
                                <Typography variant="body2" sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    wordBreak: 'break-word',
                                }}>
                                    {user?.email || 'jennywilson@gmail.com'}
                                </Typography>
                            </Box>
                        </Box>

                        <Box>
                            <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                mb: 0.5,
                                display: 'block',
                            }}>
                                Account Role
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Shield size={14} color={GRAY_COLOR} />
                                <Typography variant="body2" sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                }}>
                                    {getRoleLabel(userRole)}
                                </Typography>
                            </Box>
                        </Box>

                        <Box>
                            <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                mb: 0.5,
                                display: 'block',
                            }}>
                                Member Since
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Calendar size={14} color={GRAY_COLOR} />
                                <Typography variant="body2" sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                }}>
                                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    }) : 'January 2024'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{
                p: 2,
                pt: 1.5,
                borderTop: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
            }}>
                <GradientButton
                    onClick={handleEditProfile}
                    variant="contained"
                    startIcon={<Edit size={16} />}
                >
                    Edit Profile
                </GradientButton>
            </DialogActions>
        </Dialog>
    );
};

export default ProfileDialog;