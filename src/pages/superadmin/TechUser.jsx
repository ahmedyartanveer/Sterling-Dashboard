import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Snackbar,
    Alert,
    CircularProgress,
    Button,
    Tooltip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TablePagination,
    useMediaQuery,
    useTheme,
    Switch,
    FormControlLabel,
    alpha,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axios';
import { Helmet } from 'react-helmet-async';
import DashboardLoader from '../../components/Loader/DashboardLoader';
import OutlineButton from '../../components/ui/OutlineButton';

// Import Lucide React icons
import {
    Search,
    User,
    UserPlus,
    UserCog,
    ShieldCheck,
    UserCheck,
    UserX,
    CheckCircle,
    XCircle,
    Edit,
    Trash2,
    Mail,
    RefreshCw,
    X,
} from 'lucide-react';
import GradientButton from '../../components/ui/GradientButton';

// Define color constants
const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const ORANGE_COLOR = '#ed6c02';
const GRAY_COLOR = '#6b7280';

export const TechUser = () => {
    const queryClient = useQueryClient();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 5 : 10);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'tech',
        isActive: true,
    });

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['tech-users-management'],
        queryFn: async () => {
            const response = await axiosInstance.get('/users/tech');
            return response.data.data || response.data.users || response.data;
        },
        staleTime: 30000,
        refetchInterval: 60000,
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

    const createUserMutation = useMutation({
        mutationFn: async (userData) => {
            const response = await axiosInstance.post('/users/', userData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tech-users-management'] });
            showSnackbar('Tech user created successfully!', 'success');
            setOpenDialog(false);
            resetForm();
            setPage(0);
        },
        onError: (err) => {
            showSnackbar(err.response?.data?.message || 'Failed to create tech user', 'error');
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId) => {
            const response = await axiosInstance.delete(`/users/${userId}/`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tech-users-management'] });
            showSnackbar('Tech user deleted successfully!', 'success');
            setOpenDeleteDialog(false);
            setUserToDelete(null);
            if (paginatedUsers.length === 1 && page > 0) {
                setPage(page - 1);
            }
        },
        onError: (err) => {
            showSnackbar(err.response?.data?.message || 'Failed to delete tech user', 'error');
            setOpenDeleteDialog(false);
            setUserToDelete(null);
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ userId, userData }) => {
            const response = await axiosInstance.put(`/users/${userId}/`, userData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tech-users-management'] });
            showSnackbar('Tech user updated successfully!', 'success');
            setOpenDialog(false);
            resetForm();
        },
        onError: (err) => {
            showSnackbar(err.response?.data?.message || 'Failed to update tech user', 'error');
        },
    });

    const toggleUserStatusMutation = useMutation({
        mutationFn: async (userId) => {
            const response = await axiosInstance.patch(`/users/${userId}/toggle-status`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tech-users-management'] });
            showSnackbar('Tech user status updated successfully!', 'success');
            setOpenStatusDialog(false);
            setUserToToggle(null);
        },
        onError: (err) => {
            showSnackbar(err.response?.data?.message || 'Failed to update tech user status', 'error');
            setOpenStatusDialog(false);
            setUserToToggle(null);
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
            deleteUserMutation.mutate(userToDelete.id || userToDelete._id);
        }
    };

    const handleToggleStatusClick = (user) => {
        setUserToToggle(user);
        setOpenStatusDialog(true);
    };

    const handleToggleStatusConfirm = () => {
        if (userToToggle) {
            toggleUserStatusMutation.mutate(userToToggle.id || userToToggle._id);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'tech',
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
            updateUserMutation.mutate({
                userId: selectedUser.id || selectedUser._id,
                userData: updateData
            });
        } else {
            createUserMutation.mutate(formData);
        }
    };

    const getRoleStyle = (role) => {
        return {
            backgroundColor: alpha(GREEN_COLOR, 0.08),
            color: GREEN_COLOR,
            border: `1px solid ${alpha(GREEN_COLOR, 0.3)}`,
        };
    };

    const getStatusStyle = (isActive) => {
        if (isActive) {
            return {
                backgroundColor: alpha(GREEN_COLOR, 0.08),
                color: GREEN_COLOR,
                border: `1px solid ${alpha(GREEN_COLOR, 0.3)}`,
            };
        } else {
            return {
                backgroundColor: alpha(RED_COLOR, 0.08),
                color: RED_COLOR,
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
        return <UserCog size={14} />;
    };

    // Search input component (consistent with other components)
    const SearchInput = ({ value, onChange, placeholder, color, fullWidth = false }) => {
        return (
            <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 250 }}>
                <Box
                    component="input"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    sx={{
                        width: '100%',
                        fontSize: '0.8rem',
                        height: '36px',
                        paddingLeft: '36px',
                        paddingRight: value ? '36px' : '16px',
                        border: `1px solid ${alpha(color, 0.2)}`,
                        borderRadius: '4px',
                        outline: 'none',
                        '&:focus': {
                            borderColor: color,
                            boxShadow: `0 0 0 2px ${alpha(color, 0.1)}`,
                        },
                        '&::placeholder': {
                            color: alpha(GRAY_COLOR, 0.6),
                        },
                    }}
                />
                <Search
                    size={16}
                    color={GRAY_COLOR}
                    style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                    }}
                />
                {value && (
                    <IconButton
                        size="small"
                        onClick={() => onChange('')}
                        sx={{
                            position: 'absolute',
                            right: '4px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            padding: '4px',
                        }}
                    >
                        <X size={16} />
                    </IconButton>
                )}
            </Box>
        );
    };

    if (isLoading) {
        return <DashboardLoader />;
    }

    return (
        <Box>
            <Helmet>
                <title>Tech User Management | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Manage tech users and their roles" />
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
                        Tech User Management
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: GRAY_COLOR,
                            fontSize: '0.8rem',
                            fontWeight: 400,
                        }}
                    >
                        Manage tech users and their roles
                    </Typography>
                </Box>
                <GradientButton
                    variant="contained"
                    startIcon={<UserPlus size={16} />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                        textTransform: 'none',
                        fontSize: isMobile ? '0.75rem' : '0.85rem',
                        fontWeight: 500,
                        backgroundColor: GREEN_COLOR,
                        '&:hover': {
                            backgroundColor: alpha(GREEN_COLOR, 0.9),
                        },
                    }}
                >
                    Add Tech User
                </GradientButton>
            </Box>

            {/* Main Table Section */}
            <Paper
                elevation={0}
                sx={{
                    mb: 4,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: `1px solid ${alpha(GREEN_COLOR, 0.15)}`,
                    bgcolor: 'white'
                }}
            >
                <Box
                    sx={{
                        p: isMobile ? 1 : 1.5,
                        bgcolor: 'white',
                        borderBottom: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: isMobile ? 1 : 0,
                    }}
                >
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        width: isMobile ? '100%' : 'auto',
                        justifyContent: isMobile ? 'space-between' : 'flex-start'
                    }}>
                        <Typography
                            sx={{
                                fontSize: isMobile ? '0.85rem' : '0.9rem',
                                color: TEXT_COLOR,
                                fontWeight: 600,
                            }}
                        >
                            Tech Users
                            <Chip
                                size="small"
                                label={filteredUsers.length}
                                sx={{
                                    ml: 1,
                                    bgcolor: alpha(GREEN_COLOR, 0.08),
                                    color: TEXT_COLOR,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    height: '22px',
                                    '& .MuiChip-label': {
                                        px: 1,
                                    },
                                }}
                            />
                        </Typography>
                    </Box>
                    <Box sx={{
                        display: { md: 'flex' },
                        alignItems: 'center',
                        gap: 1.5,
                        width: isMobile ? '100%' : 'auto',
                        justifyContent: isMobile ? 'space-between' : 'flex-end'
                    }}>
                        <Box sx={{
                            display: 'flex',
                            gap: 1,
                            width: isMobile ? '100%' : 'auto',
                            flexDirection: isMobile ? 'column' : 'row',
                            mt: isMobile ? 1 : 0
                        }}>
                            <SearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search tech users..."
                                color={GREEN_COLOR}
                                fullWidth={isMobile}
                            />
                        </Box>
                    </Box>
                </Box>

                <TableContainer sx={{
                    overflowX: 'auto',
                    '&::-webkit-scrollbar': {
                        height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        backgroundColor: alpha(GREEN_COLOR, 0.05),
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: alpha(GREEN_COLOR, 0.2),
                        borderRadius: '4px',
                    },
                }}>
                    <Table size="small" sx={{ minWidth: isMobile ? 800 : 'auto' }}>
                        <TableHead>
                            <TableRow sx={{
                                bgcolor: alpha(GREEN_COLOR, 0.04),
                                '& th': {
                                    borderBottom: `2px solid ${alpha(GREEN_COLOR, 0.1)}`,
                                    py: 1.5,
                                    px: 1.5,
                                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    whiteSpace: 'nowrap',
                                }
                            }}>
                                <TableCell sx={{ pl: isMobile ? 1.5 : 2.5, minWidth: 150 }}>
                                    Name
                                </TableCell>
                                <TableCell sx={{ minWidth: 180 }}>
                                    Email
                                </TableCell>
                                <TableCell sx={{ minWidth: 100 }}>
                                    Role
                                </TableCell>
                                <TableCell sx={{ minWidth: 100 }}>
                                    Status
                                </TableCell>
                                <TableCell align="right" sx={{ pr: isMobile ? 1.5 : 2.5, minWidth: 150 }}>
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
                                                {searchQuery ? 'No tech users found matching your search.' : 'No tech users found. Create one to get started.'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedUsers.map((user) => (
                                    <TableRow
                                        key={user._id || user.id}
                                        hover
                                        sx={{
                                            bgcolor: 'white',
                                            '&:hover': {
                                                backgroundColor: alpha(GREEN_COLOR, 0.05),
                                            },
                                            '&:last-child td': {
                                                borderBottom: 'none',
                                            },
                                        }}
                                    >
                                        <TableCell sx={{ pl: isMobile ? 1.5 : 2.5, py: 1.5 }}>
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Box sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: `linear-gradient(135deg, ${alpha(GREEN_COLOR, 0.8)} 0%, ${GREEN_COLOR} 100%)`,
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    fontSize: '0.8rem',
                                                }}>
                                                    {user.name?.charAt(0).toUpperCase()}
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: TEXT_COLOR,
                                                            fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                            fontWeight: 600,
                                                            lineHeight: 1.2,
                                                        }}
                                                    >
                                                        {user.name}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: GRAY_COLOR,
                                                            fontSize: '0.75rem',
                                                            fontWeight: 400,
                                                        }}
                                                    >
                                                        ID: {user.id || user._id?.slice(-6)}
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
                                                        fontSize: isMobile ? '0.8rem' : '0.85rem',
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
                                                    label="TECH"
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
                                        <TableCell align="right" sx={{ pr: isMobile ? 1.5 : 2.5, py: 1.5 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                                <Tooltip title="Edit Tech User">
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
                                                <Tooltip title={user.isActive ? "Deactivate Tech User" : "Activate Tech User"}>
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
                                                <Tooltip title="Delete Tech User">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteClick(user)}
                                                        disabled={user.role === 'superadmin'}
                                                        sx={{
                                                            color: RED_COLOR,
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

                    {filteredUsers.length > 0 && (
                        <TablePagination
                            rowsPerPageOptions={isMobile ? [5, 10, 25] : [5, 10, 25, 50]}
                            component="div"
                            count={filteredUsers.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            sx={{
                                borderTop: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                                '& .MuiTablePagination-toolbar': {
                                    minHeight: '44px',
                                },
                                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                                },
                            }}
                        />
                    )}
                </TableContainer>
            </Paper>

            {/* Add/Edit Tech User Dialog */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '8px',
                        bgcolor: 'white',
                        border: `1px solid ${alpha(GREEN_COLOR, 0.15)}`,
                    }
                }}
            >
                <DialogTitle sx={{
                    p: 2,
                    borderBottom: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                    bgcolor: 'white',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {selectedUser ? (
                            <>
                                <Edit size={18} color={GREEN_COLOR} />
                                <Typography
                                    sx={{
                                        fontSize: '0.95rem',
                                        color: TEXT_COLOR,
                                        fontWeight: 600,
                                    }}
                                >
                                    Edit Tech User
                                </Typography>
                            </>
                        ) : (
                            <>
                                <UserPlus size={18} color={GREEN_COLOR} />
                                <Typography
                                    sx={{
                                        fontSize: '0.95rem',
                                        color: TEXT_COLOR,
                                        fontWeight: 600,
                                    }}
                                >
                                    Add New Tech User
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
                            <Box
                                component="input"
                                fullWidth
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter full name"
                                sx={{
                                    width: '100%',
                                    fontSize: '0.85rem',
                                    height: '40px',
                                    padding: '0 12px',
                                    border: `1px solid ${alpha(TEXT_COLOR, 0.1)}`,
                                    borderRadius: '6px',
                                    outline: 'none',
                                    '&:focus': {
                                        borderColor: GREEN_COLOR,
                                        boxShadow: `0 0 0 2px ${alpha(GREEN_COLOR, 0.1)}`,
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
                            <Box
                                component="input"
                                fullWidth
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter email address"
                                sx={{
                                    width: '100%',
                                    fontSize: '0.85rem',
                                    height: '40px',
                                    padding: '0 12px',
                                    border: `1px solid ${alpha(TEXT_COLOR, 0.1)}`,
                                    borderRadius: '6px',
                                    outline: 'none',
                                    '&:focus': {
                                        borderColor: GREEN_COLOR,
                                        boxShadow: `0 0 0 2px ${alpha(GREEN_COLOR, 0.1)}`,
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
                            <Box
                                component="input"
                                fullWidth
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required={!selectedUser}
                                placeholder={selectedUser ? "Leave blank to keep current password" : "Enter password"}
                                sx={{
                                    width: '100%',
                                    fontSize: '0.85rem',
                                    height: '40px',
                                    padding: '0 12px',
                                    border: `1px solid ${alpha(TEXT_COLOR, 0.1)}`,
                                    borderRadius: '6px',
                                    outline: 'none',
                                    '&:focus': {
                                        borderColor: GREEN_COLOR,
                                        boxShadow: `0 0 0 2px ${alpha(GREEN_COLOR, 0.1)}`,
                                    },
                                }}
                            />
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
                        startIcon={<X size={16} />}
                        sx={{
                            fontSize: isMobile ? '0.75rem' : '0.85rem',
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
                    >
                        {createUserMutation.isPending || updateUserMutation.isPending ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <RefreshCw size={14} className="animate-spin" />
                                {selectedUser ? 'Updating...' : 'Creating...'}
                            </Box>
                        ) : (
                            selectedUser ? 'Update Tech User' : 'Create Tech User'
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
                                color: TEXT_COLOR,
                                fontWeight: 600,
                            }}
                        >
                            Confirm Delete
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 2.5 }}>
                    <Box py={1}>
                        <Typography
                            variant="body2"
                            sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.85rem',
                                lineHeight: 1.6,
                            }}
                        >
                            Are you sure you want to delete the tech user <strong>"{userToDelete?.name}"</strong>?
                            <br />
                            <span style={{ color: GRAY_COLOR, fontSize: '0.8rem' }}>
                                This action cannot be undone.
                            </span>
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                    <OutlineButton
                        onClick={() => setOpenDeleteDialog(false)}
                        startIcon={<X size={16} />}
                        sx={{
                            fontSize: isMobile ? '0.75rem' : '0.85rem',
                        }}
                    >
                        Cancel
                    </OutlineButton>
                    <Button
                        variant="contained"
                        sx={{
                            color: 'white',
                            borderRadius: '6px',
                            padding: '6px 20px',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            bgcolor: RED_COLOR,
                            '&:hover': {
                                bgcolor: alpha(RED_COLOR, 0.9),
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
                        {deleteUserMutation.isPending ? 'Deleting...' : 'Delete Tech User'}
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
                                color: TEXT_COLOR,
                                fontWeight: 600,
                            }}
                        >
                            Confirm Status Change
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 2.5 }}>
                    <Box py={1}>
                        <Typography
                            variant="body2"
                            sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.85rem',
                                lineHeight: 1.6,
                            }}
                        >
                            Are you sure you want to {userToToggle?.isActive ? 'deactivate' : 'activate'}
                            the tech user <strong>"{userToToggle?.name}"</strong>?
                            <br />
                            <span style={{ color: GRAY_COLOR, fontSize: '0.8rem' }}>
                                {userToToggle?.isActive
                                    ? "They will no longer be able to access the system."
                                    : "They will regain access to the system."
                                }
                            </span>
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                    <OutlineButton
                        onClick={() => setOpenStatusDialog(false)}
                        startIcon={<X size={16} />}
                        sx={{
                            fontSize: isMobile ? '0.75rem' : '0.85rem',
                        }}
                    >
                        Cancel
                    </OutlineButton>
                    <Button
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
                            textTransform: 'none',
                            px: 2,
                            py: 0.8,
                            bgcolor: userToToggle?.isActive ? RED_COLOR : GREEN_COLOR,
                            '&:hover': {
                                bgcolor: userToToggle?.isActive ? alpha(RED_COLOR, 0.9) : alpha(GREEN_COLOR, 0.9),
                            },
                        }}
                    >
                        {toggleUserStatusMutation.isPending ? 'Updating...' :
                            userToToggle?.isActive ? 'Deactivate Tech User' : 'Activate Tech User'}
                    </Button>
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
                    icon={<XCircle size={20} />}
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

export default TechUser;