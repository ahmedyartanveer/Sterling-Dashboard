import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Alert,
    Snackbar,
    CircularProgress,
    Switch,
    FormControlLabel,
    Tooltip,
    DialogContentText,
    alpha,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axios';
import GradientButton from '../../components/ui/GradientButton';
import OutlineButton from '../../components/ui/OutlineButton';
import StyledTextField from '../../components/ui/StyledTextField';
import { Helmet } from 'react-helmet-async';

// Import Lucide React icons
import {
    Search,
    User,
    UserPlus,
    UserCog,
    Shield,
    ShieldCheck,
    UserCheck,
    UserX,
    CheckCircle,
    XCircle,
    Edit,
    Trash2,
    Filter,
    MoreVertical,
    AlertCircle,
    Mail,
    Phone,
    Calendar,
    MapPin,
    Clock,
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    RefreshCw,
} from 'lucide-react';

// Define color constants
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
const PURPLE_COLOR = '#8b5cf6';
const ORANGE_COLOR = '#f97316';

export const UserManagement = () => {
    const queryClient = useQueryClient();
    const [openDialog, setOpenDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openStatusDialog, setOpenStatusDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [userToToggle, setUserToToggle] = useState(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'manager',
        isActive: true,
    });

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await axiosInstance.get('/users');
            return response.data.users || response.data.data || response.data;
        },
    });

    // Filter users based on search query
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;

        const query = searchQuery.toLowerCase();
        return users.filter(user =>
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.role?.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    // Pagination logic
    const paginatedUsers = useMemo(() => {
        return filteredUsers.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage
        );
    }, [filteredUsers, page, rowsPerPage]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const createUserMutation = useMutation({
        mutationFn: async (userData) => {
            const response = await axiosInstance.post('/users/', userData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setSuccess('User created successfully!');
            setOpenDialog(false);
            resetForm();
            setTimeout(() => setSuccess(''), 3000);
            setPage(0);
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Failed to create user');
            setTimeout(() => setError(''), 3000);
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId) => {
            const response = await axiosInstance.delete(`/users/${userId}/`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setSuccess('User deleted successfully!');
            setOpenDeleteDialog(false);
            setUserToDelete(null);
            setTimeout(() => setSuccess(''), 3000);
            if (paginatedUsers.length === 1 && page > 0) {
                setPage(page - 1);
            }
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Failed to delete user');
            setOpenDeleteDialog(false);
            setUserToDelete(null);
            setTimeout(() => setError(''), 3000);
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ userId, userData }) => {
            const response = await axiosInstance.put(`/users/${userId}/`, userData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setSuccess('User updated successfully!');
            setOpenDialog(false);
            resetForm();
            setTimeout(() => setSuccess(''), 3000);
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Failed to update user');
            setTimeout(() => setError(''), 3000);
        },
    });

    const toggleUserStatusMutation = useMutation({
        mutationFn: async (userId) => {
            const response = await axiosInstance.patch(`/users/${userId}/toggle-status`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setSuccess('User status updated successfully!');
            setOpenStatusDialog(false);
            setUserToToggle(null);
            setTimeout(() => setSuccess(''), 3000);
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Failed to update user status');
            setOpenStatusDialog(false);
            setUserToToggle(null);
            setTimeout(() => setError(''), 3000);
        },
    });

    const handleOpenDialog = (user = null) => {
        if (user) {
            setSelectedUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '',
                role: user.role,
                isActive: user.isActive !== undefined ? user.isActive : true,
            });
        } else {
            resetForm();
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedUser(null);
        resetForm();
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setOpenDeleteDialog(true);
    };

    const handleDeleteConfirm = () => {
        if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id);
        }
    };

    const handleToggleStatusClick = (user) => {
        setUserToToggle(user);
        setOpenStatusDialog(true);
    };

    const handleToggleStatusConfirm = () => {
        if (userToToggle) {
            toggleUserStatusMutation.mutate(userToToggle.id);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'manager',
            isActive: true,
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSwitchChange = (e) => {
        setFormData(prev => ({
            ...prev,
            isActive: e.target.checked
        }));
    };

    const handleSubmit = () => {
        if (selectedUser) {
            const updateData = { ...formData };
            if (!updateData.password) {
                delete updateData.password;
            }
            updateUserMutation.mutate({ userId: selectedUser.id, userData: updateData });
        } else {
            createUserMutation.mutate(formData);
        }
    };

    const getRoleStyle = (role) => {
        switch (role) {
            case 'superadmin':
                return {
                    backgroundColor: alpha(RED_COLOR, 0.08),
                    color: RED_DARK,
                    border: `1px solid ${alpha(RED_COLOR, 0.3)}`,
                };
            case 'manager':
                return {
                    backgroundColor: alpha(BLUE_COLOR, 0.08),
                    color: BLUE_DARK,
                    border: `1px solid ${alpha(BLUE_COLOR, 0.3)}`,
                };
            case 'tech':
                return {
                    backgroundColor: alpha(GREEN_COLOR, 0.08),
                    color: GREEN_DARK,
                    border: `1px solid ${alpha(GREEN_COLOR, 0.3)}`,
                };
            default:
                return {
                    backgroundColor: alpha(GRAY_COLOR, 0.08),
                    color: TEXT_COLOR,
                    border: `1px solid ${alpha(GRAY_COLOR, 0.3)}`,
                };
        }
    };

    const getStatusStyle = (isActive) => {
        if (isActive) {
            return {
                backgroundColor: alpha(GREEN_COLOR, 0.08),
                color: GREEN_DARK,
                border: `1px solid ${alpha(GREEN_COLOR, 0.3)}`,
            };
        } else {
            return {
                backgroundColor: alpha(RED_COLOR, 0.08),
                color: RED_DARK,
                border: `1px solid ${alpha(RED_COLOR, 0.3)}`,
            };
        }
    };

    const getStatusLabel = (isActive) => {
        return isActive ? 'Active' : 'Inactive';
    };

    const getStatusIcon = (isActive) => {
        return isActive ? (
            <UserCheck size={14} />
        ) : (
            <UserX size={14} />
        );
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'superadmin':
                return <ShieldCheck size={14} />;
            case 'manager':
                return <UserCog size={14} />;
            case 'tech':
                return <User size={14} />;
            default:
                return <User size={14} />;
        }
    };

    // Custom pagination icons
    const PaginationActions = ({ count, page, rowsPerPage, onPageChange }) => {
        const handleFirstPageButtonClick = (event) => {
            onPageChange(event, 0);
        };

        const handleBackButtonClick = (event) => {
            onPageChange(event, page - 1);
        };

        const handleNextButtonClick = (event) => {
            onPageChange(event, page + 1);
        };

        const handleLastPageButtonClick = (event) => {
            onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
        };

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title="First Page">
                    <Box
                        component="button"
                        onClick={handleFirstPageButtonClick}
                        disabled={page === 0}
                        sx={{
                            padding: '4px',
                            border: 'none',
                            background: 'transparent',
                            cursor: page === 0 ? 'default' : 'pointer',
                            color: page === 0 ? GRAY_COLOR : TEXT_COLOR,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            '&:hover': page === 0 ? {} : {
                                backgroundColor: alpha(BLUE_COLOR, 0.1),
                            },
                            '&:disabled': {
                                opacity: 0.5,
                                cursor: 'default',
                            },
                        }}
                    >
                        <ChevronsLeft size={16} />
                    </Box>
                </Tooltip>
                <Tooltip title="Previous Page">
                    <Box
                        component="button"
                        onClick={handleBackButtonClick}
                        disabled={page === 0}
                        sx={{
                            padding: '4px',
                            border: 'none',
                            background: 'transparent',
                            cursor: page === 0 ? 'default' : 'pointer',
                            color: page === 0 ? GRAY_COLOR : TEXT_COLOR,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            '&:hover': page === 0 ? {} : {
                                backgroundColor: alpha(BLUE_COLOR, 0.1),
                            },
                            '&:disabled': {
                                opacity: 0.5,
                                cursor: 'default',
                            },
                        }}
                    >
                        <ChevronLeft size={16} />
                    </Box>
                </Tooltip>
                <Tooltip title="Next Page">
                    <Box
                        component="button"
                        onClick={handleNextButtonClick}
                        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                        sx={{
                            padding: '4px',
                            border: 'none',
                            background: 'transparent',
                            cursor: page >= Math.ceil(count / rowsPerPage) - 1 ? 'default' : 'pointer',
                            color: page >= Math.ceil(count / rowsPerPage) - 1 ? GRAY_COLOR : TEXT_COLOR,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            '&:hover': page >= Math.ceil(count / rowsPerPage) - 1 ? {} : {
                                backgroundColor: alpha(BLUE_COLOR, 0.1),
                            },
                            '&:disabled': {
                                opacity: 0.5,
                                cursor: 'default',
                            },
                        }}
                    >
                        <ChevronRight size={16} />
                    </Box>
                </Tooltip>
                <Tooltip title="Last Page">
                    <Box
                        component="button"
                        onClick={handleLastPageButtonClick}
                        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                        sx={{
                            padding: '4px',
                            border: 'none',
                            background: 'transparent',
                            cursor: page >= Math.ceil(count / rowsPerPage) - 1 ? 'default' : 'pointer',
                            color: page >= Math.ceil(count / rowsPerPage) - 1 ? GRAY_COLOR : TEXT_COLOR,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            '&:hover': page >= Math.ceil(count / rowsPerPage) - 1 ? {} : {
                                backgroundColor: alpha(BLUE_COLOR, 0.1),
                            },
                            '&:disabled': {
                                opacity: 0.5,
                                cursor: 'default',
                            },
                        }}
                    >
                        <ChevronsRight size={16} />
                    </Box>
                </Tooltip>
            </Box>
        );
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress
                    sx={{
                        color: BLUE_COLOR,
                        width: '32px !important',
                        height: '32px !important',
                    }}
                />
            </Box>
        );
    }

    return (
        <Box>
            <Helmet>
                <title>User Management | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Manage users and their roles" />
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
                        User Management
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: GRAY_COLOR,
                            fontSize: '0.8rem',
                            fontWeight: 400,
                        }}
                    >
                        Manage users and their roles
                    </Typography>
                </Box>
                <GradientButton
                    variant="contained"
                    startIcon={<UserPlus size={16} />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        px: 2,
                        py: 0.8,
                    }}
                >
                    Add User
                </GradientButton>
            </Box>

            {/* Main Table Section */}
            <Paper
                elevation={0}
                sx={{
                    mb: 4,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: `1px solid ${alpha(BLUE_COLOR, 0.15)}`,
                    bgcolor: 'white'
                }}
            >
                <Box
                    sx={{
                        p: 1.5,
                        bgcolor: 'white',
                        borderBottom: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <UserCog size={18} color={BLUE_COLOR} />
                            <Typography
                                sx={{
                                    fontSize: '0.9rem',
                                    color: TEXT_COLOR,
                                    fontWeight: 600,
                                }}
                            >
                                Users
                            </Typography>
                        </Box>
                        <Chip
                            size="small"
                            label={filteredUsers.length}
                            sx={{
                                bgcolor: alpha(BLUE_COLOR, 0.08),
                                color: TEXT_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                height: '22px',
                                '& .MuiChip-label': {
                                    px: 1,
                                },
                            }}
                        />
                    </Box>

                    {/* Search Field in Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <StyledTextField
                            size="small"
                            placeholder="Search by name, email, or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{
                                width: 280,
                                '& .MuiInputBase-root': {
                                    fontSize: '0.8rem',
                                    height: '36px',
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        mr: 1,
                                        color: BLUE_COLOR
                                    }}>
                                        <Search size={16} />
                                    </Box>
                                ),
                            }}
                        />
                    </Box>
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{
                                bgcolor: alpha(BLUE_COLOR, 0.04),
                                '& th': {
                                    borderBottom: `2px solid ${alpha(BLUE_COLOR, 0.1)}`,
                                }
                            }}>
                                <TableCell sx={{
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    py: 1.5,
                                    pl: 2.5,
                                }}>
                                    Name
                                </TableCell>
                                <TableCell sx={{
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    py: 1.5,
                                }}>
                                    Email
                                </TableCell>
                                <TableCell sx={{
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    py: 1.5,
                                }}>
                                    Role
                                </TableCell>
                                <TableCell sx={{
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    py: 1.5,
                                }}>
                                    Status
                                </TableCell>
                                <TableCell align="right" sx={{
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    py: 1.5,
                                    pr: 2.5,
                                }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                        <Box sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 1,
                                        }}>
                                            <User size={32} color={alpha(TEXT_COLOR, 0.2)} />
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: TEXT_COLOR,
                                                    opacity: 0.6,
                                                    fontSize: '0.85rem',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {searchQuery ? 'No users found matching your search.' : 'No users found. Create one to get started.'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedUsers.map((user) => (
                                    <TableRow
                                        key={user._id}
                                        hover
                                        sx={{
                                            bgcolor: 'white',
                                            '&:hover': {
                                                backgroundColor: alpha(BLUE_COLOR, 0.02),
                                            },
                                            '&:last-child td': {
                                                borderBottom: 'none',
                                            },
                                        }}
                                    >
                                        <TableCell sx={{ pl: 2.5, py: 1.5 }}>
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Box sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: `linear-gradient(135deg, ${BLUE_LIGHT} 0%, ${BLUE_COLOR} 100%)`,
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    fontSize: '0.8rem',
                                                }}>
                                                    {user.name?.charAt(0).toUpperCase()}
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight="600"
                                                        sx={{
                                                            color: TEXT_COLOR,
                                                            fontSize: '0.85rem',
                                                            lineHeight: 1.2,
                                                        }}
                                                    >
                                                        {user.name}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: GRAY_COLOR,
                                                            fontSize: '0.7rem',
                                                            fontWeight: 400,
                                                        }}
                                                    >
                                                        ID: {user.id}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Mail size={14} color={GRAY_COLOR} />
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: TEXT_COLOR,
                                                        fontSize: '0.85rem',
                                                        fontWeight: 400,
                                                    }}
                                                >
                                                    {user.email}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {getRoleIcon(user.role)}
                                                <Chip
                                                    label={user.role.toUpperCase()}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 500,
                                                        ...getRoleStyle(user.role),
                                                        height: '22px',
                                                        '& .MuiChip-label': {
                                                            px: 1,
                                                            fontSize: '0.75rem',
                                                        },
                                                    }}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {getStatusIcon(user.isActive)}
                                                <Chip
                                                    label={getStatusLabel(user.isActive)}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 500,
                                                        ...getStatusStyle(user.isActive),
                                                        height: '22px',
                                                        '& .MuiChip-label': {
                                                            px: 1,
                                                            fontSize: '0.75rem',
                                                        },
                                                    }}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right" sx={{ pr: 2.5, py: 1.5 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                                <Tooltip title="Edit User">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenDialog(user)}
                                                        disabled={user.role === 'superadmin'}
                                                        sx={{
                                                            color: BLUE_COLOR,
                                                            padding: '4px',
                                                            '&:hover': {
                                                                backgroundColor: alpha(BLUE_COLOR, 0.1),
                                                            },
                                                        }}
                                                    >
                                                        <Edit size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={user.isActive ? "Deactivate User" : "Activate User"}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleToggleStatusClick(user)}
                                                        disabled={user.role === 'superadmin'}
                                                        sx={{
                                                            color: user.isActive ? RED_COLOR : GREEN_COLOR,
                                                            padding: '4px',
                                                            '&:hover': {
                                                                backgroundColor: user.isActive ?
                                                                    alpha(RED_COLOR, 0.1) :
                                                                    alpha(GREEN_COLOR, 0.1),
                                                            },
                                                        }}
                                                    >
                                                        {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete User">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteClick(user)}
                                                        disabled={user.role === 'superadmin'}
                                                        sx={{
                                                            color: RED_DARK,
                                                            padding: '4px',
                                                            '&:hover': {
                                                                backgroundColor: alpha(RED_COLOR, 0.1),
                                                            },
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {filteredUsers.length > 0 && (
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            px: 2,
                            py: 1.5,
                            borderTop: `1px solid ${alpha(TEXT_COLOR, 0.08)}`,
                            backgroundColor: alpha(BLUE_COLOR, 0.02),
                        }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: GRAY_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                }}
                            >
                                Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: GRAY_COLOR,
                                            fontSize: '0.8rem',
                                            fontWeight: 400,
                                        }}
                                    >
                                        Rows per page:
                                    </Typography>
                                    <Box
                                        component="select"
                                        value={rowsPerPage}
                                        onChange={handleChangeRowsPerPage}
                                        sx={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            border: `1px solid ${alpha(TEXT_COLOR, 0.1)}`,
                                            backgroundColor: 'white',
                                            fontSize: '0.8rem',
                                            color: TEXT_COLOR,
                                            cursor: 'pointer',
                                            '&:hover': {
                                                borderColor: BLUE_COLOR,
                                            },
                                            '&:focus': {
                                                outline: 'none',
                                                borderColor: BLUE_COLOR,
                                                boxShadow: `0 0 0 2px ${alpha(BLUE_COLOR, 0.1)}`,
                                            },
                                        }}
                                    >
                                        {[5, 10, 25, 50].map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </Box>
                                </Box>

                                <PaginationActions
                                    count={filteredUsers.length}
                                    page={page}
                                    rowsPerPage={rowsPerPage}
                                    onPageChange={handleChangePage}
                                />
                            </Box>
                        </Box>
                    )}
                </TableContainer>
            </Paper>

            {/* Add/Edit User Dialog */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
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
                        {selectedUser ? (
                            <>
                                <Edit size={18} color={BLUE_COLOR} />
                                <Typography
                                    sx={{
                                        fontSize: '0.95rem',
                                        color: TEXT_COLOR,
                                        fontWeight: 600,
                                    }}
                                >
                                    Edit User
                                </Typography>
                            </>
                        ) : (
                            <>
                                <UserPlus size={18} color={BLUE_COLOR} />
                                <Typography
                                    sx={{
                                        fontSize: '0.95rem',
                                        color: TEXT_COLOR,
                                        fontWeight: 600,
                                    }}
                                >
                                    Add New User
                                </Typography>
                            </>
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                                Name
                            </Typography>
                            <StyledTextField
                                fullWidth
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                size="small"
                                placeholder="Enter full name"
                                sx={{
                                    '& .MuiInputBase-root': {
                                        fontSize: '0.85rem',
                                    },
                                }}
                            />
                        </Box>

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
                                Email
                            </Typography>
                            <StyledTextField
                                fullWidth
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                size="small"
                                placeholder="Enter email address"
                                sx={{
                                    '& .MuiInputBase-root': {
                                        fontSize: '0.85rem',
                                    },
                                }}
                            />
                        </Box>

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
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required={!selectedUser}
                                size="small"
                                placeholder={selectedUser ? "Leave blank to keep current password" : "Enter password"}
                                sx={{
                                    '& .MuiInputBase-root': {
                                        fontSize: '0.85rem',
                                    },
                                }}
                            />
                        </Box>

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
                                Role
                            </Typography>
                            <FormControl fullWidth size="small">
                                <Select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    sx={{
                                        fontSize: '0.85rem',
                                        color: TEXT_COLOR,
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: BLUE_COLOR,
                                        },
                                    }}
                                >
                                    <MenuItem value="manager" sx={{ fontSize: '0.85rem' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <UserCog size={14} />
                                            Manager
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="tech" sx={{ fontSize: '0.85rem' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <User size={14} />
                                            Tech
                                        </Box>
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        {selectedUser && (
                            <Box>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.isActive}
                                            onChange={handleSwitchChange}
                                            name="isActive"
                                            size="small"
                                            sx={{
                                                '& .MuiSwitch-switchBase.Mui-checked': {
                                                    color: GREEN_COLOR,
                                                },
                                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                    backgroundColor: GREEN_COLOR,
                                                },
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: TEXT_COLOR,
                                                fontSize: '0.85rem',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {formData.isActive ? 'Active' : 'Inactive'}
                                        </Typography>
                                    }
                                />
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                    <OutlineButton
                        onClick={handleCloseDialog}
                        sx={{
                            fontSize: '0.85rem',
                            px: 2,
                            py: 0.8,
                        }}
                    >
                        Cancel
                    </OutlineButton>
                    <GradientButton
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={
                            createUserMutation.isPending ||
                            updateUserMutation.isPending ||
                            !formData.name ||
                            !formData.email ||
                            (!selectedUser && !formData.password)
                        }
                        startIcon={selectedUser ? <Edit size={16} /> : <UserPlus size={16} />}
                        sx={{
                            fontSize: '0.85rem',
                            px: 2,
                            py: 0.8,
                        }}
                    >
                        {createUserMutation.isPending || updateUserMutation.isPending ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <RefreshCw size={14} className="animate-spin" />
                                {selectedUser ? 'Updating...' : 'Creating...'}
                            </Box>
                        ) : (
                            selectedUser ? 'Update User' : 'Create User'
                        )}
                    </GradientButton>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '8px',
                        bgcolor: 'white',
                        border: `1px solid ${alpha(RED_COLOR, 0.15)}`,
                    }
                }}
            >
                <DialogTitle sx={{
                    p: 2,
                    borderBottom: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                    bgcolor: 'white',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Trash2 size={18} color={RED_COLOR} />
                        <Typography
                            sx={{
                                fontSize: '0.95rem',
                                color: RED_DARK,
                                fontWeight: 600,
                            }}
                        >
                            Confirm Delete
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 2.5 }}>
                    <Box py={1}>
                        <DialogContentText
                            sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.85rem',
                                lineHeight: 1.6,
                            }}
                        >
                            Are you sure you want to delete the user <strong>"{userToDelete?.name}"</strong>?
                            <br />
                            <span style={{ color: GRAY_COLOR, fontSize: '0.8rem' }}>
                                This action cannot be undone.
                            </span>
                        </DialogContentText>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                    <OutlineButton
                        onClick={() => setOpenDeleteDialog(false)}
                        sx={{
                            fontSize: '0.85rem',
                            px: 2,
                            py: 0.8,
                        }}
                    >
                        Cancel
                    </OutlineButton>
                    <Button
                        variant="contained"
                        sx={{
                            background: `linear-gradient(135deg, ${RED_DARK} 0%, ${RED_COLOR} 100%)`,
                            color: 'white',
                            borderRadius: '6px',
                            padding: '6px 20px',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: `linear-gradient(135deg, ${RED_COLOR} 0%, #b91c1c 100%)`,
                            },
                        }}
                        onClick={handleDeleteConfirm}
                        disabled={deleteUserMutation.isPending}
                        startIcon={deleteUserMutation.isPending ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : (
                            <Trash2 size={16} />
                        )}
                    >
                        {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Toggle Status Confirmation Dialog */}
            <Dialog
                open={openStatusDialog}
                onClose={() => setOpenStatusDialog(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '8px',
                        bgcolor: 'white',
                        border: `1px solid ${userToToggle?.isActive ? alpha(RED_COLOR, 0.15) : alpha(GREEN_COLOR, 0.15)}`,
                    }
                }}
            >
                <DialogTitle sx={{
                    p: 2,
                    borderBottom: `1px solid ${userToToggle?.isActive ? alpha(RED_COLOR, 0.1) : alpha(GREEN_COLOR, 0.1)}`,
                    bgcolor: 'white',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {userToToggle?.isActive ? (
                            <UserX size={18} color={RED_COLOR} />
                        ) : (
                            <UserCheck size={18} color={GREEN_COLOR} />
                        )}
                        <Typography
                            sx={{
                                fontSize: '0.95rem',
                                color: userToToggle?.isActive ? RED_DARK : GREEN_DARK,
                                fontWeight: 600,
                            }}
                        >
                            Confirm Status Change
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 2.5 }}>
                    <Box py={1}>
                        <DialogContentText
                            sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.85rem',
                                lineHeight: 1.6,
                            }}
                        >
                            Are you sure you want to {userToToggle?.isActive ? 'deactivate' : 'activate'}
                            the user <strong>"{userToToggle?.name}"</strong>?
                            <br />
                            <span style={{ color: GRAY_COLOR, fontSize: '0.8rem' }}>
                                {userToToggle?.isActive
                                    ? "They will no longer be able to access the system."
                                    : "They will regain access to the system."
                                }
                            </span>
                        </DialogContentText>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                    <OutlineButton
                        onClick={() => setOpenStatusDialog(false)}
                        sx={{
                            fontSize: '0.85rem',
                            px: 2,
                            py: 0.8,
                        }}
                    >
                        Cancel
                    </OutlineButton>
                    <GradientButton
                        variant="contained"
                        onClick={handleToggleStatusConfirm}
                        disabled={toggleUserStatusMutation.isPending}
                        startIcon={toggleUserStatusMutation.isPending ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : userToToggle?.isActive ? (
                            <UserX size={16} />
                        ) : (
                            <UserCheck size={16} />
                        )}
                        sx={{
                            fontSize: '0.85rem',
                            px: 2,
                            py: 0.8,
                            background: userToToggle?.isActive
                                ? `linear-gradient(135deg, ${RED_DARK} 0%, ${RED_COLOR} 100%)`
                                : undefined,
                        }}
                    >
                        {toggleUserStatusMutation.isPending ? 'Updating...' :
                            userToToggle?.isActive ? 'Deactivate User' : 'Activate User'}
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
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        border: `1px solid ${alpha(GREEN_COLOR, 0.2)}`,
                        backgroundColor: alpha(GREEN_COLOR, 0.08),
                        color: GREEN_DARK,
                        '& .MuiAlert-icon': {
                            color: GREEN_DARK,
                        },
                    }}
                    elevation={0}
                >
                    <Typography
                        fontWeight={500}
                        sx={{
                            color: GREEN_DARK,
                            fontSize: '0.85rem',
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
                    icon={<XCircle size={20} />}
                    sx={{
                        width: '100%',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        border: `1px solid ${alpha(RED_COLOR, 0.2)}`,
                        backgroundColor: alpha(RED_COLOR, 0.08),
                        color: RED_DARK,
                        '& .MuiAlert-icon': {
                            color: RED_DARK,
                        },
                    }}
                    elevation={0}
                >
                    <Typography
                        fontWeight={500}
                        sx={{
                            color: RED_DARK,
                            fontSize: '0.85rem',
                        }}
                    >
                        {error}
                    </Typography>
                </Alert>
            </Snackbar>
        </Box>
    );
};

// Add CSS for spinner animation
const styles = `
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
    .animate-spin {
        animation: spin 1s linear infinite;
    }
`;

// Add styles to document
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}