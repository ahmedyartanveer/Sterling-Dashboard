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
    TablePagination,
    useMediaQuery,
    useTheme,
    alpha,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../api/axios';
import { Helmet } from 'react-helmet-async';


// Import Lucide React icons
import {
    Search,
    User,
    UserCog,
    ShieldCheck,
    UserCheck,
    UserX,
    CheckCircle,
    XCircle,
    Mail,
    X,
} from 'lucide-react';
import DashboardLoader from '../../../components/Loader/DashboardLoader';

// Define color constants
const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const ORANGE_COLOR = '#ed6c02';
const GRAY_COLOR = '#6b7280';

export const TechUserManagement = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [searchQuery, setSearchQuery] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 5 : 10);

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['tech-users'],
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
        return <ShieldCheck size={14} />;
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
                        View and manage tech users
                    </Typography>
                </Box>
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
                    <Table size="small" sx={{ minWidth: isMobile ? 700 : 'auto' }}>
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
                                <TableCell sx={{ pr: isMobile ? 1.5 : 2.5, minWidth: 100 }}>
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
                                        <TableCell sx={{ pr: isMobile ? 1.5 : 2.5, py: 1.5 }}>
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

export default TechUserManagement;