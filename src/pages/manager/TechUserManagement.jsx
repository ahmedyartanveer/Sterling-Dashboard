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
    CircularProgress,
    Tooltip,
    alpha,
    TablePagination,
} from '@mui/material';
import {
    Person as PersonIcon,
    Search as SearchIcon,
    Block as BlockIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axios';
import StyledTextField from '../../components/ui/StyledTextField';
import { Helmet } from 'react-helmet-async';

// Define color constants
const TEXT_COLOR = '#0F1115';
const BLUE_LIGHT = '#A8C9E9';
const BLUE_COLOR = '#1976d2';
const BLUE_DARK = '#1565c0';
const RED_COLOR = '#ef4444';
const RED_DARK = '#dc2626';
const GREEN_COLOR = '#10b981';
const GREEN_DARK = '#059669';

export const TechUserManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['tech-users'],
        queryFn: async () => {
            const response = await axiosInstance.get('/users/tech');
            return response.data.data || response.data.users || response.data;
        },
    });

    // Filter users based on search query
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;

        const query = searchQuery.toLowerCase();
        return users.filter(user =>
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query)
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

    const getRoleStyle = (role) => {
        return {
            backgroundColor: alpha(GREEN_COLOR, 0.1),
            color: TEXT_COLOR,
            borderColor: GREEN_COLOR,
        };
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
                <title>Tech Users | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="View all tech users" />
            </Helmet>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography
                        sx={{
                            fontWeight: 500,
                            mb: 0.5,
                            fontSize: 20,
                            color: TEXT_COLOR,
                        }}
                    >
                        Tech User Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage tech users and their roles
                    </Typography>
                </Box>
            </Box>

            {/* Search Bar */}
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
                            Tech Users
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
                            placeholder="Search by name or email..."
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
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                                        <PersonIcon sx={{ fontSize: 48, color: alpha(TEXT_COLOR, 0.1), mb: 2 }} />
                                        <Typography variant="body2" sx={{ color: TEXT_COLOR, opacity: 0.7 }}>
                                            {searchQuery ? 'No tech users found matching your search.' : 'No tech users found.'}
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
                                                label="TECH"
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
        </Box>
    );
};