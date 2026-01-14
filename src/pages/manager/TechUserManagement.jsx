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
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axios';
import StyledTextField from '../../components/ui/StyledTextField';
import { Helmet } from 'react-helmet-async';

// Import Lucide React icons
import {
    Search,
    User,
    UserCog,
    Shield,
    CheckCircle,
    XCircle,
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
            backgroundColor: alpha(GREEN_COLOR, 0.08),
            color: GREEN_DARK,
            border: `1px solid ${alpha(GREEN_COLOR, 0.3)}`,
            fontSize: '0.75rem',
            fontWeight: 500,
        };
    };

    const getStatusStyle = (isActive) => {
        if (isActive) {
            return {
                backgroundColor: alpha(GREEN_COLOR, 0.08),
                color: GREEN_DARK,
                border: `1px solid ${alpha(GREEN_COLOR, 0.3)}`,
                fontSize: '0.75rem',
                fontWeight: 500,
            };
        } else {
            return {
                backgroundColor: alpha(RED_COLOR, 0.08),
                color: RED_DARK,
                border: `1px solid ${alpha(RED_COLOR, 0.3)}`,
                fontSize: '0.75rem',
                fontWeight: 500,
            };
        }
    };

    const getStatusLabel = (isActive) => {
        return isActive ? 'Active' : 'Inactive';
    };

    const getStatusIcon = (isActive) => {
        return isActive ? (
            <CheckCircle size={14} style={{ marginRight: 4 }} />
        ) : (
            <XCircle size={14} style={{ marginRight: 4 }} />
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

    return (
        <Box>
            <Helmet>
                <title>Tech Users | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="View all tech users" />
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
            </Box>

            {/* Search Bar and Table */}
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
                                Tech Users
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
                            placeholder="Search by name or email..."
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
                                    pr: 2.5,
                                }}>
                                    Status
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
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
                                                {searchQuery ? 'No tech users found matching your search.' : 'No tech users found.'}
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
                                                <Shield size={14} color={GREEN_DARK} />
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
                                        <TableCell sx={{ pr: 2.5, py: 1.5 }}>
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
        </Box>
    );
};