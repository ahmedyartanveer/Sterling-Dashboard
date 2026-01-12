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
    TablePagination,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Person as PersonIcon,
    Search as SearchIcon,
    Block as BlockIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axios';
import GradientButton from '../../components/ui/GradientButton';
import OutlineButton from '../../components/ui/OutlineButton';
import StyledTextField from '../../components/ui/StyledTextField';
import { Helmet } from 'react-helmet-async';

// Define color constants
const TEXT_COLOR = '#0F1115';
const BLUE_LIGHT = '#A8C9E9';
const BLUE_COLOR = '#1976d2';
const BLUE_DARK = '#1565c0';
const RED_COLOR = '#ef4444';
const RED_LIGHT = '#fca5a5';
const RED_DARK = '#dc2626';
const GREEN_COLOR = '#10b981';
const GREEN_LIGHT = '#a7f3d0';
const GREEN_DARK = '#059669';

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
            const response = await axiosInstance.post('/users', userData);
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
            const response = await axiosInstance.delete(`/users/${userId}`);
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
            const response = await axiosInstance.put(`/users/${userId}`, userData);
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
            deleteUserMutation.mutate(userToDelete._id);
        }
    };

    const handleToggleStatusClick = (user) => {
        setUserToToggle(user);
        setOpenStatusDialog(true);
    };

    const handleToggleStatusConfirm = () => {
        if (userToToggle) {
            toggleUserStatusMutation.mutate(userToToggle._id);
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
            updateUserMutation.mutate({ userId: selectedUser._id, userData: updateData });
        } else {
            createUserMutation.mutate(formData);
        }
    };

    const getRoleStyle = (role) => {
        switch (role) {
            case 'superadmin':
                return {
                    backgroundColor: alpha(RED_COLOR, 0.1),
                    color: TEXT_COLOR,
                    borderColor: RED_COLOR,
                };
            case 'manager':
                return {
                    backgroundColor: alpha(BLUE_COLOR, 0.1),
                    color: TEXT_COLOR,
                    borderColor: BLUE_COLOR,
                };
            case 'tech':
                return {
                    backgroundColor: alpha(GREEN_COLOR, 0.1),
                    color: TEXT_COLOR,
                    borderColor: GREEN_COLOR,
                };
            default:
                return {};
        }
    };

    const getStatusStyle = (isActive) => {
        if (isActive) {
            return {
                backgroundColor: alpha(GREEN_COLOR, 0.1),
                color: TEXT_COLOR,
                borderColor: GREEN_COLOR,
            };
        } else {
            return {
                backgroundColor: alpha(RED_COLOR, 0.1),
                color: TEXT_COLOR,
                borderColor: RED_COLOR,
            };
        }
    };

    const getStatusLabel = (isActive) => {
        return isActive ? 'Active' : 'Inactive';
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress sx={{ color: BLUE_COLOR }} />
            </Box>
        );
    }

    return (
        <Box>
            <Helmet>
                <title>User management | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Super administrator user management dashboard" />
            </Helmet>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography
                    sx={{
                        fontWeight: 'bold',
                        mb: 0.5,
                        fontSize: 20,
                        color: TEXT_COLOR,
                    }}
                >
                    User Management
                </Typography>
                <GradientButton
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add User
                </GradientButton>
            </Box>

            {/* Main Table Section */}
            <Paper
                elevation={0}
                sx={{
                    mb: 5,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: `1px solid ${alpha(BLUE_COLOR, 0.3)}`,
                    bgcolor: 'white'
                }}
            >
                <Box
                    sx={{
                        p: 1.2,
                        bgcolor: 'white',
                        borderBottom: `3px solid ${BLUE_COLOR}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography
                            sx={{ fontSize: '1rem', color: TEXT_COLOR }}
                            fontWeight={600}>
                            Users
                            <Chip
                                size="small"
                                label={filteredUsers.length}
                                sx={{
                                    ml: 1,
                                    bgcolor: alpha(BLUE_COLOR, 0.1),
                                    color: TEXT_COLOR
                                }}
                            />
                        </Typography>
                    </Box>

                    {/* Search Field in Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <StyledTextField
                            size="small"
                            placeholder="Search by name, email, or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{ width: 300 }}
                            InputProps={{
                                startAdornment: (
                                    <SearchIcon sx={{ mr: 1, color: BLUE_COLOR, fontSize: 'small' }} />
                                ),
                            }}
                        />
                    </Box>
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(BLUE_COLOR, 0.06) }}>
                                <TableCell sx={{
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    fontSize: '0.875rem'
                                }}>
                                    Name
                                </TableCell>
                                <TableCell sx={{
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    fontSize: '0.875rem'
                                }}>
                                    Email
                                </TableCell>
                                <TableCell sx={{
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    fontSize: '0.875rem'
                                }}>
                                    Role
                                </TableCell>
                                <TableCell sx={{
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    fontSize: '0.875rem'
                                }}>
                                    Status
                                </TableCell>
                                <TableCell align="right" sx={{
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    fontSize: '0.875rem'
                                }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                        <PersonIcon sx={{ fontSize: 48, color: alpha(TEXT_COLOR, 0.1), mb: 2 }} />
                                        <Typography variant="body2" sx={{ color: TEXT_COLOR, opacity: 0.7 }}>
                                            {searchQuery ? 'No users found matching your search.' : 'No users found. Create one to get started.'}
                                        </Typography>
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
                                                backgroundColor: alpha(BLUE_COLOR, 0.03),
                                            },
                                        }}
                                    >
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Box sx={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: `linear-gradient(135deg, ${BLUE_LIGHT} 0%, ${BLUE_COLOR} 100%)`,
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                }}>
                                                    {user.name?.charAt(0).toUpperCase()}
                                                </Box>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="medium" sx={{ color: TEXT_COLOR }}>
                                                        {user.name}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: TEXT_COLOR, opacity: 0.7 }}>
                                                        ID: {user._id?.substring(0, 8)}...
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ color: TEXT_COLOR }}>
                                                {user.email}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.role.toUpperCase()}
                                                size="small"
                                                sx={{
                                                    fontWeight: 500,
                                                    ...getRoleStyle(user.role),
                                                    '& .MuiChip-label': {
                                                        px: 1.5,
                                                    },
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={getStatusLabel(user.isActive)}
                                                size="small"
                                                variant="outlined"
                                                icon={user.isActive ?
                                                    <CheckCircleIcon sx={{ fontSize: 16 }} /> :
                                                    <BlockIcon sx={{ fontSize: 16 }} />
                                                }
                                                sx={{
                                                    fontWeight: 500,
                                                    ...getStatusStyle(user.isActive),
                                                    '& .MuiChip-label': {
                                                        px: 1.5,
                                                    },
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Edit User">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenDialog(user)}
                                                    disabled={user.role === 'superadmin'}
                                                    sx={{
                                                        color: BLUE_COLOR,
                                                        '&:hover': {
                                                            backgroundColor: alpha(BLUE_COLOR, 0.1),
                                                        },
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={user.isActive ? "Deactivate User" : "Activate User"}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleToggleStatusClick(user)}
                                                    disabled={user.role === 'superadmin' || user._id === 'current-user-id'}
                                                    sx={{
                                                        color: user.isActive ? RED_COLOR : GREEN_COLOR,
                                                        '&:hover': {
                                                            backgroundColor: user.isActive ?
                                                                alpha(RED_COLOR, 0.1) :
                                                                alpha(GREEN_COLOR, 0.1),
                                                        },
                                                    }}
                                                >
                                                    {user.isActive ?
                                                        <BlockIcon fontSize="small" /> :
                                                        <CheckCircleIcon fontSize="small" />
                                                    }
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete User">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteClick(user)}
                                                    disabled={user.role === 'superadmin' || user._id === 'current-user-id'}
                                                    sx={{
                                                        color: RED_DARK,
                                                        '&:hover': {
                                                            backgroundColor: alpha(RED_COLOR, 0.1),
                                                        },
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {filteredUsers.length > 0 && (
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            component="div"
                            count={filteredUsers.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            sx={{
                                borderTop: `1px solid ${alpha(TEXT_COLOR, 0.1)}`,
                                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                    fontSize: '0.875rem',
                                    color: TEXT_COLOR,
                                    opacity: 0.7,
                                },
                                '& .MuiTablePagination-actions': {
                                    '& .MuiIconButton-root': {
                                        '&:hover': {
                                            backgroundColor: alpha(BLUE_COLOR, 0.1),
                                        },
                                    },
                                },
                                '& .MuiSelect-select': {
                                    padding: '6px 32px 6px 12px',
                                    color: TEXT_COLOR,
                                },
                                '& .MuiSvgIcon-root': {
                                    color: TEXT_COLOR,
                                },
                            }}
                        />
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
                        borderRadius: 3,
                        bgcolor: 'white'
                    }
                }}
            >
                <DialogTitle sx={{
                    background: `linear-gradient(135deg, ${BLUE_COLOR} 0%, ${BLUE_DARK} 100%)`,
                    color: 'white',
                }}>
                    {selectedUser ? 'Edit User' : 'Add New User'}
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <StyledTextField
                            fullWidth
                            label="Name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            size="small"
                            sx={{ mt: 1 }}
                        />
                        <StyledTextField
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            size="small"
                        />
                        <StyledTextField
                            fullWidth
                            label={selectedUser ? 'Password (leave blank to keep current)' : 'Password'}
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required={!selectedUser}
                            size="small"
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel sx={{
                                color: TEXT_COLOR,
                                opacity: 0.7,
                                '&.Mui-focused': {
                                    color: BLUE_COLOR,
                                }
                            }}>
                                Role
                            </InputLabel>
                            <Select
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                label="Role"
                                sx={{
                                    '& .MuiSelect-select': {
                                        color: TEXT_COLOR,
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: BLUE_COLOR,
                                    },
                                }}
                            >
                                <MenuItem value="manager">Manager</MenuItem>
                                <MenuItem value="tech">Tech</MenuItem>
                            </Select>
                        </FormControl>
                        {selectedUser && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.isActive}
                                        onChange={handleSwitchChange}
                                        name="isActive"
                                        color="primary"
                                    />
                                }
                                label={
                                    <Typography variant="body2" fontWeight={500} sx={{ color: TEXT_COLOR }}>
                                        Active
                                    </Typography>
                                }
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <OutlineButton onClick={handleCloseDialog}>
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
                    >
                        {selectedUser ? 'Update User' : 'Create User'}
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
                        borderRadius: 3,
                        bgcolor: 'white'
                    }
                }}
            >
                <DialogTitle sx={{
                    pb: 2,
                    color: RED_DARK,
                    fontWeight: 600,
                }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <DeleteIcon />
                        Confirm Delete
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box py={1}>
                        <DialogContentText sx={{ color: TEXT_COLOR, opacity: 0.7 }}>
                            Are you sure you want to delete the user <strong>"{userToDelete?.name}"</strong>?
                            This action cannot be undone.
                        </DialogContentText>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <OutlineButton onClick={() => setOpenDeleteDialog(false)}>
                        Cancel
                    </OutlineButton>
                    <Button
                        variant="contained"
                        sx={{
                            background: `linear-gradient(135deg, ${RED_DARK} 0%, ${RED_COLOR} 100%)`,
                            color: 'white',
                            borderRadius: '8px',
                            padding: '6px 20px',
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: `linear-gradient(135deg, ${RED_COLOR} 0%, #b91c1c 100%)`,
                            },
                        }}
                        onClick={handleDeleteConfirm}
                        disabled={deleteUserMutation.isPending}
                        startIcon={<DeleteIcon />}
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
                        borderRadius: 3,
                        bgcolor: 'white'
                    }
                }}
            >
                <DialogTitle sx={{
                    pb: 2,
                    color: userToToggle?.isActive ? RED_DARK : GREEN_DARK,
                    fontWeight: 600,
                }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        {userToToggle?.isActive ? <BlockIcon /> : <CheckCircleIcon />}
                        Confirm Status Change
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box py={1}>
                        <DialogContentText sx={{ color: TEXT_COLOR, opacity: 0.7 }}>
                            Are you sure you want to {userToToggle?.isActive ? 'deactivate' : 'activate'}
                            the user <strong>"{userToToggle?.name}"</strong>?
                        </DialogContentText>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <OutlineButton onClick={() => setOpenStatusDialog(false)}>
                        Cancel
                    </OutlineButton>
                    <GradientButton
                        variant="contained"
                        onClick={handleToggleStatusConfirm}
                        disabled={toggleUserStatusMutation.isPending}
                        startIcon={userToToggle?.isActive ? <BlockIcon /> : <CheckCircleIcon />}
                    >
                        {toggleUserStatusMutation.isPending ? 'Updating...' :
                            userToToggle?.isActive ? 'Deactivate User' : 'Activate User'}
                    </GradientButton>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={!!success}
                autoHideDuration={3000}
                onClose={() => setSuccess('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity="success"
                    sx={{
                        width: '100%',
                        borderRadius: 2,
                        boxShadow: 3,
                    }}
                    elevation={6}
                >
                    <Typography fontWeight={500} sx={{ color: TEXT_COLOR }}>{success}</Typography>
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={3000}
                onClose={() => setError('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity="error"
                    sx={{
                        width: '100%',
                        borderRadius: 2,
                        boxShadow: 3,
                    }}
                    elevation={6}
                >
                    <Typography fontWeight={500} sx={{ color: TEXT_COLOR }}>{error}</Typography>
                </Alert>
            </Snackbar>
        </Box>
    );
};