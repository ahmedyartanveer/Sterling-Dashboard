import React, { useState, useMemo, useEffect } from 'react';
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
    Stack,
    Checkbox,
    Button,
    Tooltip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TablePagination,
    Modal,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import axiosInstance from '../../../api/axios';
import { useAuth } from '../../../auth/AuthProvider';
import {
    addHours,
    addDays,
    format,
    parseISO,
    isAfter,
} from 'date-fns';

import {
    CheckCircle,
    Clock,
    Mail,
    User,
    X,
    Trash2,
    Search,
    AlertCircle,
    PhoneCall,
    AlertTriangle,
    CheckCheck,
    RotateCcw,
    History,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import DashboardLoader from '../../../components/Loader/DashboardLoader';
import OutlineButton from '../../../components/ui/OutlineButton';
import RecycleBinModal from '../../../components/ui/Modal/RecycleBinModal';

const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const ORANGE_COLOR = '#ed6c02';
const GRAY_COLOR = '#6b7280';
const PURPLE_COLOR = '#8b5cf6';

// Timezone constants - Pacific Time (GMT-8)
const TIMEZONE_OFFSET = -8 * 60 * 60 * 1000; // GMT-8 in milliseconds

// Helper functions for timezone handling
const toPacificTime = (dateString) => {
    if (!dateString) return null;
    try {
        // If date is in UTC, convert to Pacific Time (GMT-8)
        const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
        return new Date(date.getTime() + TIMEZONE_OFFSET);
    } catch (e) {
        console.error('Error converting to Pacific Time:', e);
        return null;
    }
};

const toUTC = (pacificTime) => {
    if (!pacificTime) return null;
    try {
        // Convert Pacific Time to UTC (add 8 hours)
        return new Date(pacificTime.getTime() - TIMEZONE_OFFSET);
    } catch (e) {
        console.error('Error converting to UTC:', e);
        return null;
    }
};

// Get current time in Pacific Time
const getCurrentPacificTime = () => {
    const now = new Date();
    return new Date(now.getTime() + TIMEZONE_OFFSET);
};

const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
        const date = toPacificTime(dateString);
        return format(date, 'MMM dd, yyyy HH:mm');
    } catch (e) {
        return '—';
    }
};

const formatDateShort = (dateString) => {
    if (!dateString) return '—';
    try {
        const date = toPacificTime(dateString);
        return format(date, 'MMM dd, HH:mm');
    } catch (e) {
        return '—';
    }
};

const formatMonthDay = (dateString) => {
    if (!dateString) return '—';
    try {
        const date = toPacificTime(dateString);
        return format(date, 'MMM dd');
    } catch (e) {
        return '—';
    }
};

const formatTimeRemaining = (remainingMs) => {
    if (remainingMs <= 0) return 'EXPIRED';

    // For display purposes, round to the nearest hour when we have more than a day
    if (remainingMs > 24 * 60 * 60 * 1000) {
        // Round to nearest hour
        const hours = Math.round(remainingMs / (60 * 60 * 1000));
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;

        if (days > 0) {
            return `${days}d ${remainingHours}h`;
        } else {
            return `${hours}h`;
        }
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
};

const calculateExpirationDate = (calledAt, callType) => {
    if (!calledAt || !callType) return null;

    try {
        // Convert called_at to Pacific Time
        const calledDate = toPacificTime(calledAt);
        if (!calledDate) return null;

        if (callType === 'EMERGENCY' || callType === 'Emergency') {
            // Emergency: 4 hours from called time IN PACIFIC TIME
            return addHours(calledDate, 4);
        } else if (callType === 'STANDARD' || callType === 'Standard') {
            // Standard: 2 calendar days (48 hours) from called time IN PACIFIC TIME
            return addDays(calledDate, 2);
        }

        return null;
    } catch (e) {
        console.error('Error calculating expiration:', e);
        return null;
    }
};

const isTimerExpired = (calledAt, callType) => {
    if (!calledAt || !callType) return true;

    const expirationDate = calculateExpirationDate(calledAt, callType);
    if (!expirationDate) return true;

    // Compare in Pacific Time
    const nowPacific = getCurrentPacificTime();
    return isAfter(nowPacific, expirationDate);
};

const getTimeRemainingMs = (calledAt, callType) => {
    if (!calledAt || !callType) return 0;

    const expirationDate = calculateExpirationDate(calledAt, callType);
    if (!expirationDate) return 0;

    const nowPacific = getCurrentPacificTime();
    return expirationDate.getTime() - nowPacific.getTime();
};

const parseDashboardAddress = (fullAddress) => {
    if (!fullAddress) return { street: '', city: '', state: '', zip: '', original: '' };
    const parts = fullAddress.split(' - ');
    if (parts.length < 2) return { street: fullAddress, city: '', state: '', zip: '', original: fullAddress };
    const street = parts[0].trim();
    const remaining = parts[1].trim();
    const zipMatch = remaining.match(/\b\d{5}\b/);
    const zip = zipMatch ? zipMatch[0] : '';
    const withoutZip = remaining.replace(zip, '').trim();
    const cityState = withoutZip.split(',').map(s => s.trim());
    return {
        street,
        city: cityState[0] || '',
        state: cityState[1] || '',
        zip,
        original: fullAddress,
    };
};

const formatTargetWorkDate = (scheduledDateRaw) => {
    if (!scheduledDateRaw || scheduledDateRaw === 'ASAP') return 'ASAP';

    try {
        const datePart = scheduledDateRaw.split(' ')[0];
        if (!datePart) return 'ASAP';

        const [month, day, year] = datePart.split('/').map(Number);
        if (!month || !day || !year) return 'ASAP';

        // Create date in Pacific Time
        const date = new Date(year, month - 1, day);
        const pacificDate = toPacificTime(date);
        return format(pacificDate, 'MMM dd, yyyy');
    } catch (e) {
        console.error('Error formatting target work date:', e);
        return 'ASAP';
    }
};

// Search input component
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

const Locates = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const currentUserName = user?.name || 'Admin User';
    const currentUserEmail = user?.email || 'admin@company.com';

    const [currentTime, setCurrentTime] = useState(() => getCurrentPacificTime());

    const [selectedPending, setSelectedPending] = useState(new Set());
    const [selectedInProgress, setSelectedInProgress] = useState(new Set());
    const [selectedCompleted, setSelectedCompleted] = useState(new Set());

    const [pagePending, setPagePending] = useState(0);
    const [rowsPerPagePending, setRowsPerPagePending] = useState(isMobile ? 5 : 10);
    const [pageInProgress, setPageInProgress] = useState(0);
    const [rowsPerPageInProgress, setRowsPerPageInProgress] = useState(isMobile ? 5 : 10);
    const [pageCompleted, setPageCompleted] = useState(0);
    const [rowsPerPageCompleted, setRowsPerPageCompleted] = useState(isMobile ? 5 : 10);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedForDeletion, setSelectedForDeletion] = useState(new Set());
    const [deletionSection, setDeletionSection] = useState('');
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [selectedForCompletion, setSelectedForCompletion] = useState(new Set());

    const [searchPending, setSearchPending] = useState('');
    const [searchInProgress, setSearchInProgress] = useState('');
    const [searchCompleted, setSearchCompleted] = useState('');

    const [recycleBinOpen, setRecycleBinOpen] = useState(false);
    const [recycleBinSearch, setRecycleBinSearch] = useState('');
    const [recycleBinPage, setRecycleBinPage] = useState(0);
    const [recycleBinRowsPerPage, setRecycleBinRowsPerPage] = useState(isMobile ? 5 : 10);
    const [selectedRecycleBinItems, setSelectedRecycleBinItems] = useState(new Set());
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
    const [singleRestoreDialogOpen, setSingleRestoreDialogOpen] = useState(false);
    const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);
    const [selectedSingleItem, setSelectedSingleItem] = useState(null);

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success',
    });

    const [recycleBinCount, setRecycleBinCount] = useState(0);

    // Update current time every second for live countdown (in Pacific Time)
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getCurrentPacificTime());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const { data: rawData = [], isLoading } = useQuery({
        queryKey: ['locates-all'],
        queryFn: async () => {
            const res = await axiosInstance.get('/locates/');
            return Array.isArray(res.data) ? res.data : res.data?.data || [];
        },
        staleTime: 30000,
        refetchInterval: 60000,
    });

    // Auto-expire timers that have elapsed
    useEffect(() => {
        const checkAndExpireTimers = async () => {
            const itemsToExpire = rawData.filter(item =>
                item.locates_called &&
                item.called_at &&
                item.call_type &&
                !item.timer_expired &&
                !item.is_deleted &&
                isTimerExpired(item.called_at, item.call_type)
            );

            if (itemsToExpire.length > 0) {
                try {
                    const promises = itemsToExpire.map(async (item) => {
                        const completeTimeUTC = toUTC(getCurrentPacificTime());
                        await axiosInstance.patch(`/locates/${item.id}/`, {
                            timer_expired: true,
                            time_remaining: 'EXPIRED',
                            completed_at: completeTimeUTC ? completeTimeUTC.toISOString() : new Date().toISOString(),
                        });
                    });

                    await Promise.all(promises);
                    queryClient.invalidateQueries({ queryKey: ['locates-all'] });
                } catch (error) {
                    console.error('Error auto-expiring timers:', error);
                }
            }
        };

        checkAndExpireTimers();
        const interval = setInterval(checkAndExpireTimers, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, [rawData, queryClient]);

    const { data: deletedHistoryData = [], isLoading: isRecycleBinLoading } = useQuery({
        queryKey: ['locates-deleted-history'],
        queryFn: async () => {
            try {
                const res = await axiosInstance.get('/locates/');
                const allData = Array.isArray(res.data) ? res.data : res.data?.data || [];
                const deletedItems = allData.filter(item => item.is_deleted === true);
                return deletedItems;
            } catch (error) {
                console.error('Error fetching deleted history:', error);
                return [];
            }
        },
        staleTime: 30000,
        refetchInterval: 60000,
    });

    useEffect(() => {
        if (deletedHistoryData && Array.isArray(deletedHistoryData)) {
            setRecycleBinCount(deletedHistoryData.length);
        }
    }, [deletedHistoryData]);

    const invalidateAndRefetch = () => {
        queryClient.invalidateQueries({ queryKey: ['locates-all'] });
        queryClient.invalidateQueries({ queryKey: ['locates-deleted-history'] });
    };

    const markCalledMutation = useMutation({
        mutationFn: async ({ id, callType }) => {
            const calledDate = getCurrentPacificTime();
            const calledDateUTC = toUTC(calledDate);

            const response = await axiosInstance.patch(
                `/locates/${id}/`,
                {
                    locates_called: true,
                    call_type: callType === 'STANDARD' ? 'Standard' : 'Emergency',
                    called_at: calledDateUTC ? calledDateUTC.toISOString() : new Date().toISOString(),
                    called_by: currentUserName,
                    called_by_email: currentUserEmail,
                    timer_started: true,
                    timer_expired: false,
                    time_remaining: callType === 'STANDARD' ? '2 days' : '4 hours',
                }
            );
            return response.data;
        },
        onSuccess: () => {
            invalidateAndRefetch();
            showSnackbar('Locate call status updated', 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Update failed', 'error');
        },
    });

    const softDeleteBulkMutation = useMutation({
        mutationFn: async (ids) => {
            const deleteTime = getCurrentPacificTime();
            const deleteTimeUTC = toUTC(deleteTime);

            const promises = Array.from(ids).map(id =>
                axiosInstance.patch(`/locates/${id}/`, {
                    is_deleted: true,
                    deleted_date: deleteTimeUTC ? deleteTimeUTC.toISOString() : new Date().toISOString(),
                    deleted_by: currentUserName,
                    deleted_by_email: currentUserEmail,
                })
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            invalidateAndRefetch();
            setSelectedPending(new Set());
            setSelectedInProgress(new Set());
            setSelectedCompleted(new Set());
            setSelectedForDeletion(new Set());
            setDeleteDialogOpen(false);
            showSnackbar('Selected items moved to recycle bin', 'success');
        },
        onError: (err) => {
            console.error('Soft delete error:', err);
            showSnackbar(err?.response?.data?.message || 'Delete failed', 'error');
        },
    });

    const completeWorkOrderManuallyMutation = useMutation({
        mutationFn: async (id) => {
            const completeTime = getCurrentPacificTime();
            const completeTimeUTC = toUTC(completeTime);

            const response = await axiosInstance.patch(`/locates/${id}/`, {
                timer_expired: true,
                time_remaining: 'COMPLETED',
                completed_at: completeTimeUTC ? completeTimeUTC.toISOString() : new Date().toISOString(),
            });
            return response.data;
        },
        onSuccess: () => {
            invalidateAndRefetch();
            setSelectedForCompletion(new Set());
            setSelectedInProgress(new Set());
            setCompleteDialogOpen(false);
            showSnackbar('Work order marked as complete', 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Manual completion failed', 'error');
        },
    });

    const bulkCompleteWorkOrdersMutation = useMutation({
        mutationFn: async (ids) => {
            const completeTime = getCurrentPacificTime();
            const completeTimeUTC = toUTC(completeTime);

            const promises = Array.from(ids).map(id =>
                axiosInstance.patch(`/locates/${id}/`, {
                    timer_expired: true,
                    time_remaining: 'COMPLETED',
                    completed_at: completeTimeUTC ? completeTimeUTC.toISOString() : new Date().toISOString(),
                })
            );
            await Promise.all(promises);
        },
        onSuccess: (responses) => {
            invalidateAndRefetch();
            setSelectedForCompletion(new Set());
            setSelectedInProgress(new Set());
            setCompleteDialogOpen(false);
            showSnackbar(`${responses.length} work order(s) marked as complete`, 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Bulk completion failed', 'error');
        },
    });

    const restoreFromRecycleBinMutation = useMutation({
        mutationFn: async (id) => {
            const response = await axiosInstance.patch(`/locates/${id}/`, {
                is_deleted: false,
                deleted_date: null,
                deleted_by: '',
                deleted_by_email: '',
            });
            return response.data;
        },
        onSuccess: () => {
            invalidateAndRefetch();
            setSelectedRecycleBinItems(new Set());
            setSingleRestoreDialogOpen(false);
            setSelectedSingleItem(null);
            showSnackbar('Item restored successfully', 'success');
        },
        onError: (err) => {
            console.error('Restore error:', err);
            showSnackbar(err?.response?.data?.message || 'Restore failed', 'error');
        },
    });

    const bulkRestoreMutation = useMutation({
        mutationFn: async (ids) => {
            const promises = ids.map(id =>
                axiosInstance.patch(`/locates/${id}/`, {
                    is_deleted: false,
                    deleted_date: null,
                    deleted_by: '',
                    deleted_by_email: '',
                })
            );

            await Promise.all(promises);
            return ids;
        },
        onSuccess: (response) => {
            invalidateAndRefetch();
            setSelectedRecycleBinItems(new Set());
            setRestoreDialogOpen(false);
            showSnackbar(`${response.length} item(s) restored`, 'success');
        },
        onError: (err) => {
            console.error('Bulk restore error:', err);
            showSnackbar(
                err?.response?.data?.message || 'Bulk restore failed',
                'error'
            );
        },
    });

    const permanentDeleteFromRecycleBinMutation = useMutation({
        mutationFn: async (id) => {
            const response = await axiosInstance.delete(`/locates/${id}/`);
            return response.data;
        },
        onSuccess: () => {
            invalidateAndRefetch();
            setSelectedRecycleBinItems(new Set());
            setSingleDeleteDialogOpen(false);
            setSelectedSingleItem(null);
            showSnackbar('Item permanently deleted', 'success');
        },
        onError: (err) => {
            console.error('Permanent delete error:', err);
            showSnackbar(err?.response?.data?.message || 'Permanent delete failed', 'error');
        },
    });

    const bulkPermanentDeleteMutation = useMutation({
        mutationFn: async (ids) => {
            const promises = ids.map(id =>
                axiosInstance.delete(`/locates/${id}/`)
            );
            return Promise.all(promises);
        },
        onSuccess: (responses) => {
            invalidateAndRefetch();
            setSelectedRecycleBinItems(new Set());
            setPermanentDeleteDialogOpen(false);
            showSnackbar(`${responses.length} item(s) permanently deleted`, 'success');
        },
        onError: (err) => {
            console.error('Bulk permanent delete error:', err);
            showSnackbar(
                err?.response?.data?.message || 'Bulk permanent delete failed',
                'error'
            );
        },
    });

    const processed = useMemo(() => {
        return rawData
            .filter(item => !item.is_deleted)
            .map(item => {
                const addr = parseDashboardAddress(item.customer_address || '');
                const isEmergency = (item.call_type || '').toUpperCase().includes('EMERGENCY');
                const type = isEmergency ? 'EMERGENCY' : 'STANDARD';

                let timeRemainingText = '';
                let timeRemainingDetail = '';
                let timeRemainingColor = TEXT_COLOR;
                let isExpired = false;
                let expirationDate = null;

                const calledByName = item.called_by || '';
                const calledByEmail = item.called_by_email || '';

                // Check if timer is expired (either already marked or time has passed)
                const isAlreadyExpired = item.timer_expired === true;
                const shouldBeExpired = item.locates_called && item.called_at && item.call_type
                    ? isTimerExpired(item.called_at, item.call_type)
                    : false;

                isExpired = isAlreadyExpired || shouldBeExpired;

                if (item.locates_called && item.called_at && item.call_type) {
                    expirationDate = calculateExpirationDate(item.called_at, item.call_type);

                    if (expirationDate) {
                        // Calculate remaining time in Pacific Time
                        const nowPacific = currentTime;
                        const remainingMs = expirationDate.getTime() - nowPacific.getTime();

                        if (isExpired) {
                            timeRemainingText = 'EXPIRED';
                            timeRemainingDetail = `Expired on: ${format(expirationDate, 'MMM dd, yyyy HH:mm')}`;
                            timeRemainingColor = RED_COLOR;
                        } else {
                            timeRemainingText = formatTimeRemaining(remainingMs);
                            timeRemainingDetail = `Expires at: ${format(expirationDate, 'MMM dd, yyyy HH:mm')}`;

                            // Set color based on urgency
                            if (isEmergency) {
                                if (remainingMs <= 60 * 60 * 1000) { // 1 hour or less
                                    timeRemainingColor = RED_COLOR;
                                } else if (remainingMs <= 2 * 60 * 60 * 1000) { // 2 hours or less
                                    timeRemainingColor = ORANGE_COLOR;
                                } else {
                                    timeRemainingColor = BLUE_COLOR;
                                }
                            } else {
                                if (remainingMs <= 24 * 60 * 60 * 1000) { // 1 day or less
                                    timeRemainingColor = ORANGE_COLOR;
                                } else {
                                    timeRemainingColor = BLUE_COLOR;
                                }
                            }
                        }
                    }
                }

                const targetWorkDate = formatTargetWorkDate(item.scheduled_date);

                return {
                    id: item.id?.toString() || Math.random().toString(),
                    workOrderId: item.id,
                    jobId: item.work_order_number || 'N/A',
                    workOrderNumber: item.work_order_number || '',
                    customerName: item.customer_name || 'Unknown',
                    ...addr,
                    type,
                    techName: item.tech_name || 'Unassigned',
                    requestedDate: item.created_date,
                    locatesCalled: !!item.locates_called,
                    callType: item.call_type || null,
                    calledByName,
                    calledByEmail,
                    calledAt: item.called_at,
                    expirationDate: expirationDate,
                    formattedExpirationDate: expirationDate ? formatMonthDay(expirationDate) : '—',
                    isExpired: isExpired,
                    timeRemainingText: isExpired ? 'EXPIRED' : timeRemainingText,
                    timeRemainingDetail,
                    timeRemainingColor,
                    timerStarted: !!item.timer_started,
                    timerExpired: !!item.timer_expired,
                    timeRemainingApi: item.time_remaining || '',
                    locateTriggeredDate: item.scraped_at,
                    locateCalledInDate: item.called_at || '',
                    clearToDigDate: item.completed_at || '',
                    targetWorkDate: targetWorkDate,
                    scheduledDateRaw: item.scheduled_date || 'ASAP',
                    isEmergency: isEmergency,
                };
            });
    }, [rawData, currentTime]);

    const recycleBinItems = useMemo(() => {
        if (!Array.isArray(deletedHistoryData)) return [];

        return deletedHistoryData
            .filter(item => item.is_deleted === true)
            .map(item => {
                const addr = parseDashboardAddress(item.customer_address || '');
                return {
                    id: item.id?.toString() || Math.random().toString(),
                    workOrderId: item.id,
                    workOrderNumber: item.work_order_number || 'N/A',
                    customerName: item.customer_name || 'Unknown',
                    deletedBy: item.deleted_by || 'Unknown',
                    deletedByEmail: item.deleted_by_email || '',
                    deletedAt: item.deleted_date,
                    type: (item.call_type || '').toUpperCase().includes('EMERGENCY') ? 'EMERGENCY' : 'STANDARD',
                    ...addr,
                };
            });
    }, [deletedHistoryData]);

    // Filter functions for each table
    const allPending = useMemo(() => {
        return processed.filter(l => !l.locatesCalled);
    }, [processed]);

    const inProgress = useMemo(() => {
        return processed.filter(l => l.locatesCalled && !l.isExpired);
    }, [processed]);

    const completed = useMemo(() => {
        return processed.filter(l => l.locatesCalled && l.isExpired);
    }, [processed]);

    // Filter with search
    const filteredPending = useMemo(() => {
        if (!searchPending) return allPending;
        const searchLower = searchPending.toLowerCase();
        return allPending.filter(l =>
            l.workOrderNumber?.toLowerCase().includes(searchLower) ||
            l.customerName?.toLowerCase().includes(searchLower) ||
            l.street?.toLowerCase().includes(searchLower) ||
            l.city?.toLowerCase().includes(searchLower) ||
            l.techName?.toLowerCase().includes(searchLower)
        );
    }, [allPending, searchPending]);

    const filteredInProgress = useMemo(() => {
        if (!searchInProgress) return inProgress;
        const searchLower = searchInProgress.toLowerCase();
        return inProgress.filter(l =>
            l.workOrderNumber?.toLowerCase().includes(searchLower) ||
            l.customerName?.toLowerCase().includes(searchLower) ||
            l.street?.toLowerCase().includes(searchLower) ||
            l.city?.toLowerCase().includes(searchLower) ||
            l.techName?.toLowerCase().includes(searchLower) ||
            l.calledByName?.toLowerCase().includes(searchLower)
        );
    }, [inProgress, searchInProgress]);

    const filteredCompleted = useMemo(() => {
        if (!searchCompleted) return completed;
        const searchLower = searchCompleted.toLowerCase();
        return completed.filter(l =>
            l.workOrderNumber?.toLowerCase().includes(searchLower) ||
            l.customerName?.toLowerCase().includes(searchLower) ||
            l.street?.toLowerCase().includes(searchLower) ||
            l.city?.toLowerCase().includes(searchLower) ||
            l.techName?.toLowerCase().includes(searchLower) ||
            l.calledByName?.toLowerCase().includes(searchLower)
        );
    }, [completed, searchCompleted]);

    const handleChangePagePending = (event, newPage) => {
        setPagePending(newPage);
    };

    const handleChangeRowsPerPagePending = (event) => {
        setRowsPerPagePending(parseInt(event.target.value, 10));
        setPagePending(0);
    };

    const handleChangePageInProgress = (event, newPage) => {
        setPageInProgress(newPage);
    };

    const handleChangeRowsPerPageInProgress = (event) => {
        setRowsPerPageInProgress(parseInt(event.target.value, 10));
        setPageInProgress(0);
    };

    const handleChangePageCompleted = (event, newPage) => {
        setPageCompleted(newPage);
    };

    const handleChangeRowsPerPageCompleted = (event) => {
        setRowsPerPageCompleted(parseInt(event.target.value, 10));
        setPageCompleted(0);
    };

    const handleChangeRecycleBinPage = (event, newPage) => {
        setRecycleBinPage(newPage);
    };

    const handleChangeRecycleBinRowsPerPage = (event) => {
        setRecycleBinRowsPerPage(parseInt(event.target.value, 10));
        setRecycleBinPage(0);
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleMarkCalled = (id, callType) => {
        markCalledMutation.mutate({
            id,
            callType
        });
    };

    const handleManualCompletion = (id) => {
        completeWorkOrderManuallyMutation.mutate(id);
    };

    const confirmBulkComplete = () => {
        if (selectedInProgress.size === 0) return;
        setSelectedForCompletion(selectedInProgress);
        setCompleteDialogOpen(true);
    };

    const executeBulkComplete = () => {
        bulkCompleteWorkOrdersMutation.mutate(selectedForCompletion);
    };

    const confirmSoftDelete = (selectionSet, section) => {
        if (selectionSet.size === 0) return;
        setSelectedForDeletion(selectionSet);
        setDeletionSection(section);
        setDeleteDialogOpen(true);
    };

    const executeSoftDelete = () => {
        softDeleteBulkMutation.mutate(selectedForDeletion);
    };

    const toggleRecycleBinSelection = (itemKey) => {
        setSelectedRecycleBinItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemKey)) newSet.delete(itemKey);
            else newSet.add(itemKey);
            return newSet;
        });
    };

    const toggleAllRecycleBinSelection = () => {
        const currentPageItems = recycleBinItems.slice(
            recycleBinPage * recycleBinRowsPerPage,
            recycleBinPage * recycleBinRowsPerPage + recycleBinRowsPerPage
        );

        const allPageIds = new Set(currentPageItems.map(item => item.id));
        const currentSelected = new Set(selectedRecycleBinItems);
        const allSelectedOnPage = Array.from(allPageIds).every(id => currentSelected.has(id));

        if (allSelectedOnPage) {
            const newSet = new Set(currentSelected);
            allPageIds.forEach(id => newSet.delete(id));
            setSelectedRecycleBinItems(newSet);
        } else {
            const newSet = new Set([...currentSelected, ...allPageIds]);
            setSelectedRecycleBinItems(newSet);
        }
    };

    const confirmBulkRestore = () => {
        if (selectedRecycleBinItems.size === 0) return;
        setRestoreDialogOpen(true);
    };

    const executeBulkRestore = () => {
        bulkRestoreMutation.mutate(Array.from(selectedRecycleBinItems));
    };

    const confirmBulkPermanentDelete = () => {
        if (selectedRecycleBinItems.size === 0) return;
        setPermanentDeleteDialogOpen(true);
    };

    const executeBulkPermanentDelete = () => {
        bulkPermanentDeleteMutation.mutate(Array.from(selectedRecycleBinItems));
    };

    const handleSingleRestore = (item) => {
        setSelectedSingleItem(item);
        setSingleRestoreDialogOpen(true);
    };

    const handleSinglePermanentDelete = (item) => {
        setSelectedSingleItem(item);
        setSingleDeleteDialogOpen(true);
    };

    const executeSingleRestore = () => {
        if (selectedSingleItem) {
            restoreFromRecycleBinMutation.mutate(selectedSingleItem.id);
        }
    };

    const executeSinglePermanentDelete = () => {
        if (selectedSingleItem) {
            permanentDeleteFromRecycleBinMutation.mutate(selectedSingleItem.id);
        }
    };

    const toggleSelection = (setState, id) => {
        setState(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const toggleAllSelection = (items, pageItems, selectedSet) => {
        const allPageIds = new Set(pageItems.map(item => item.id));
        const currentSelected = new Set(selectedSet);
        const allSelectedOnPage = Array.from(allPageIds).every(id => currentSelected.has(id));

        if (allSelectedOnPage) {
            const newSet = new Set(currentSelected);
            allPageIds.forEach(id => newSet.delete(id));
            return newSet;
        } else {
            const newSet = new Set([...currentSelected, ...allPageIds]);
            return newSet;
        }
    };

    if (isLoading) {
        return <DashboardLoader />;
    }

    const pendingPageItems = filteredPending.slice(
        pagePending * rowsPerPagePending,
        pagePending * rowsPerPagePending + rowsPerPagePending
    );

    const inProgressPageItems = filteredInProgress.slice(
        pageInProgress * rowsPerPageInProgress,
        pageInProgress * rowsPerPageInProgress + rowsPerPageInProgress
    );

    const completedPageItems = filteredCompleted.slice(
        pageCompleted * rowsPerPageCompleted,
        pageCompleted * rowsPerPageCompleted + rowsPerPageCompleted
    );

    const getCalledAtDate = (item) => {
        if (!item.calledAt) return '—';
        return formatDate(item.calledAt);
    };

    return (
        <Box>
            <Helmet>
                <title>Locates | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Super Admin Locates page" />
            </Helmet>

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
                        Locate Management
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: GRAY_COLOR,
                            fontSize: '0.8rem',
                            fontWeight: 400,
                        }}
                    >
                        Dispatch and monitor locate
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<History size={16} />}
                    onClick={() => setRecycleBinOpen(true)}
                    sx={{
                        textTransform: 'none',
                        fontSize: isMobile ? '0.75rem' : '0.85rem',
                        fontWeight: 500,
                        color: PURPLE_COLOR,
                        borderColor: alpha(PURPLE_COLOR, 0.3),
                        '&:hover': {
                            borderColor: PURPLE_COLOR,
                            backgroundColor: alpha(PURPLE_COLOR, 0.05),
                        },
                    }}
                >
                    {isMobile ? `Bin (${recycleBinCount})` : `Recycle Bin (${recycleBinCount})`}
                </Button>
            </Box>

            {/* Pending Locates */}
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
                        p: isMobile ? 1 : 1.5,
                        bgcolor: 'white',
                        borderBottom: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
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
                            Pending Locates
                            <Chip
                                size="small"
                                label={allPending.length}
                                sx={{
                                    ml: 1,
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
                        </Typography>
                        {selectedPending.size > 0 && (
                            <OutlineButton
                                size="small"
                                onClick={() => confirmSoftDelete(selectedPending, 'Pending Locates')}
                                startIcon={<Trash2 size={14} />}
                            >
                                Delete ({selectedPending.size})
                            </OutlineButton>
                        )}
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
                                value={searchPending}
                                onChange={setSearchPending}
                                placeholder="Search pending locates..."
                                color={BLUE_COLOR}
                                fullWidth={isMobile}
                            />
                        </Box>
                    </Box>
                </Box>
                <LocateTable
                    items={pendingPageItems}
                    selected={selectedPending}
                    onToggleSelect={(id) => toggleSelection(setSelectedPending, id)}
                    onToggleAll={() => setSelectedPending(toggleAllSelection(filteredPending, pendingPageItems, selectedPending))}
                    onMarkCalled={handleMarkCalled}
                    color={BLUE_COLOR}
                    showCallAction
                    totalCount={filteredPending.length}
                    page={pagePending}
                    rowsPerPage={rowsPerPagePending}
                    onPageChange={handleChangePagePending}
                    onRowsPerPageChange={handleChangeRowsPerPagePending}
                    markCalledMutation={markCalledMutation}
                    tableType="pending"
                    getCalledAtDate={getCalledAtDate}
                    isMobile={isMobile}
                />
            </Paper>

            {/* In Progress */}
            <Paper
                elevation={0}
                sx={{
                    mb: 4,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: `1px solid ${alpha(ORANGE_COLOR, 0.15)}`,
                    bgcolor: 'white'
                }}
            >
                <Box
                    sx={{
                        p: isMobile ? 1 : 1.5,
                        bgcolor: 'white',
                        borderBottom: `1px solid ${alpha(ORANGE_COLOR, 0.1)}`,
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
                            In Progress
                            <Chip
                                size="small"
                                label={inProgress.length}
                                sx={{
                                    ml: 1,
                                    bgcolor: alpha(ORANGE_COLOR, 0.08),
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
                        {selectedInProgress.size > 0 && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    onClick={confirmBulkComplete}
                                    startIcon={<CheckCheck size={14} />}
                                    disabled={bulkCompleteWorkOrdersMutation.isPending}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: '0.75rem',
                                        px: 1.5,
                                        borderRadius: '2px',
                                        bgcolor: GREEN_COLOR,
                                        '&:hover': {
                                            bgcolor: alpha(GREEN_COLOR, 0.9),
                                        },
                                    }}
                                >
                                    Complete ({selectedInProgress.size})
                                </Button>
                                <OutlineButton
                                    size="small"
                                    onClick={() => confirmSoftDelete(selectedInProgress, 'In Progress')}
                                    startIcon={<Trash2 size={14} />}
                                >
                                    Delete ({selectedInProgress.size})
                                </OutlineButton>
                            </Box>
                        )}
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
                                value={searchInProgress}
                                onChange={setSearchInProgress}
                                placeholder="Search in progress..."
                                color={ORANGE_COLOR}
                                fullWidth={isMobile}
                            />
                        </Box>
                    </Box>
                </Box>
                <LocateTable
                    items={inProgressPageItems}
                    selected={selectedInProgress}
                    onToggleSelect={(id) => toggleSelection(setSelectedInProgress, id)}
                    onToggleAll={() => setSelectedInProgress(toggleAllSelection(filteredInProgress, inProgressPageItems, selectedInProgress))}
                    onManualComplete={handleManualCompletion}
                    color={ORANGE_COLOR}
                    showTimerColumn
                    showCalledBy
                    showManualCompleteAction={true}
                    totalCount={filteredInProgress.length}
                    page={pageInProgress}
                    rowsPerPage={rowsPerPageInProgress}
                    onPageChange={handleChangePageInProgress}
                    onRowsPerPageChange={handleChangeRowsPerPageInProgress}
                    completeWorkOrderManuallyMutation={completeWorkOrderManuallyMutation}
                    tableType="inProgress"
                    getCalledAtDate={getCalledAtDate}
                    isMobile={isMobile}
                />
            </Paper>

            {/* Completed */}
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
                            Completed
                            <Chip
                                size="small"
                                label={completed.length}
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
                        {selectedCompleted.size > 0 && (
                            <OutlineButton
                                size="small"
                                onClick={() => confirmSoftDelete(selectedCompleted, 'Completed')}
                                startIcon={<Trash2 size={14} />}
                            >
                                Delete ({selectedCompleted.size})
                            </OutlineButton>
                        )}
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
                                value={searchCompleted}
                                onChange={setSearchCompleted}
                                placeholder="Search completed..."
                                color={GREEN_COLOR}
                                fullWidth={isMobile}
                            />
                        </Box>
                    </Box>
                </Box>
                <LocateTable
                    items={completedPageItems}
                    selected={selectedCompleted}
                    onToggleSelect={(id) => toggleSelection(setSelectedCompleted, id)}
                    onToggleAll={() => setSelectedCompleted(toggleAllSelection(filteredCompleted, completedPageItems, selectedCompleted))}
                    color={GREEN_COLOR}
                    showCalledBy
                    showTimerColumn={false}
                    totalCount={filteredCompleted.length}
                    page={pageCompleted}
                    rowsPerPage={rowsPerPageCompleted}
                    onPageChange={handleChangePageCompleted}
                    onRowsPerPageChange={handleChangeRowsPerPageCompleted}
                    tableType="completed"
                    getCalledAtDate={getCalledAtDate}
                    isMobile={isMobile}
                />
            </Paper>

            {/* Recycle Bin Modal - Using separate component */}
            <RecycleBinModal
                open={recycleBinOpen}
                onClose={() => setRecycleBinOpen(false)}
                recycleBinItems={recycleBinItems}
                isRecycleBinLoading={isRecycleBinLoading}
                recycleBinSearch={recycleBinSearch}
                setRecycleBinSearch={setRecycleBinSearch}
                recycleBinPage={recycleBinPage}
                recycleBinRowsPerPage={recycleBinRowsPerPage}
                handleChangeRecycleBinPage={handleChangeRecycleBinPage}
                handleChangeRecycleBinRowsPerPage={handleChangeRecycleBinRowsPerPage}
                selectedRecycleBinItems={selectedRecycleBinItems}
                toggleRecycleBinSelection={toggleRecycleBinSelection}
                toggleAllRecycleBinSelection={toggleAllRecycleBinSelection}
                confirmBulkRestore={confirmBulkRestore}
                confirmBulkPermanentDelete={confirmBulkPermanentDelete}
                handleSingleRestore={handleSingleRestore}
                handleSinglePermanentDelete={handleSinglePermanentDelete}
                restoreFromRecycleBinMutation={restoreFromRecycleBinMutation}
                permanentDeleteFromRecycleBinMutation={permanentDeleteFromRecycleBinMutation}
                bulkRestoreMutation={bulkRestoreMutation}
                bulkPermanentDeleteMutation={bulkPermanentDeleteMutation}
                isMobile={isMobile}
                isSmallMobile={isSmallMobile}
            />

            {/* Single Restore Dialog */}
            <Dialog
                open={singleRestoreDialogOpen}
                onClose={() => setSingleRestoreDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'white',
                        borderRadius: '6px',
                    }
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <RotateCcw size={20} color={GREEN_COLOR} />
                        <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Restore Item
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Are you sure you want to restore work order <strong>{selectedSingleItem?.workOrderNumber}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setSingleRestoreDialogOpen(false);
                            setSelectedSingleItem(null);
                        }}
                        sx={{
                            textTransform: 'none',
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 400,
                            px: 2,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={executeSingleRestore}
                        disabled={restoreFromRecycleBinMutation.isPending}
                        startIcon={<RotateCcw size={14} />}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            px: 2,
                            bgcolor: GREEN_COLOR,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: alpha(GREEN_COLOR, 0.9),
                                boxShadow: 'none',
                            },
                        }}
                    >
                        {restoreFromRecycleBinMutation.isPending ? 'Restoring...' : 'Restore'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Single Delete Dialog */}
            <Dialog
                open={singleDeleteDialogOpen}
                onClose={() => setSingleDeleteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'white',
                        borderRadius: '6px',
                    }
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Trash2 size={20} color={RED_COLOR} />
                        <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Permanent Delete
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Are you sure you want to permanently delete work order <strong>{selectedSingleItem?.workOrderNumber}</strong>?
                        This action cannot be undone.
                    </Typography>
                    <Alert severity="warning" icon={<AlertTriangle size={20} />}>
                        Item will be permanently removed and cannot be recovered.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setSingleDeleteDialogOpen(false);
                        setSelectedSingleItem(null);
                    }}
                        sx={{
                            textTransform: 'none',
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 400,
                            px: 2,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={executeSinglePermanentDelete}
                        disabled={permanentDeleteFromRecycleBinMutation.isPending}
                        startIcon={<Trash2 size={14} />}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            px: 2,
                            bgcolor: RED_COLOR,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: alpha(RED_COLOR, 0.9),
                                boxShadow: 'none',
                            },
                        }}
                    >
                        {permanentDeleteFromRecycleBinMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Restore Dialog */}
            <Dialog
                open={restoreDialogOpen}
                onClose={() => setRestoreDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'white',
                        borderRadius: '6px',
                        border: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                    }
                }}
            >
                <DialogTitle sx={{
                    borderBottom: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                    pb: 1.5,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(GREEN_COLOR, 0.1),
                            color: GREEN_COLOR,
                        }}>
                            <RotateCcw size={18} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                lineHeight: 1.2,
                            }}>
                                Restore Items
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 400,
                            }}>
                                Restore items from recycle bin
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5, pb: 1.5 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 400,
                            mb: 2,
                        }}
                    >
                        Are you sure you want to restore <strong>{selectedRecycleBinItems.size} item(s)</strong> from recycle bin?
                    </Typography>
                    <Box sx={{
                        p: 1.5,
                        borderRadius: '6px',
                        backgroundColor: alpha(GREEN_COLOR, 0.05),
                        border: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                    }}>
                        <AlertCircle size={18} color={GREEN_COLOR} />
                        <Box>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: GREEN_COLOR,
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    mb: 0.5,
                                }}
                            >
                                Note
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                }}
                            >
                                Restored items will be moved back to the Report Needed stage.
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1.5 }}>
                    <Button
                        onClick={() => setRestoreDialogOpen(false)}
                        sx={{
                            textTransform: 'none',
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 400,
                            px: 2,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={executeBulkRestore}
                        disabled={bulkRestoreMutation.isPending}
                        variant="contained"
                        color="success"
                        startIcon={<RotateCcw size={16} />}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            px: 2,
                            bgcolor: GREEN_COLOR,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: alpha(GREEN_COLOR, 0.9),
                                boxShadow: 'none',
                            },
                        }}
                    >
                        {bulkRestoreMutation.isPending ? 'Restoring...' : 'Restore Items'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Permanent Delete Dialog */}
            <Dialog
                open={permanentDeleteDialogOpen}
                onClose={() => setPermanentDeleteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'white',
                        borderRadius: '6px',
                    }
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Trash2 size={20} color={RED_COLOR} />
                        <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Permanent Delete
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Are you sure you want to permanently delete {selectedRecycleBinItems.size} item(s) from the recycle bin?
                        This action cannot be undone.
                    </Typography>
                    <Alert severity="warning" icon={<AlertTriangle size={20} />}>
                        Items will be permanently removed and cannot be recovered.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPermanentDeleteDialogOpen(false)}
                        sx={{
                            textTransform: 'none',
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 400,
                            px: 2,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={executeBulkPermanentDelete}
                        disabled={bulkPermanentDeleteMutation.isPending}
                        startIcon={<Trash2 size={16} />}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            px: 2,
                            bgcolor: RED_COLOR,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: alpha(RED_COLOR, 0.9),
                                boxShadow: 'none',
                            },
                        }}
                    >
                        {bulkPermanentDeleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Move to Recycle Bin Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'white',
                        borderRadius: '6px',
                        border: `1px solid ${alpha(ORANGE_COLOR, 0.1)}`,
                    }
                }}
            >
                <DialogTitle sx={{
                    borderBottom: `1px solid ${alpha(ORANGE_COLOR, 0.1)}`,
                    pb: 1.5,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(ORANGE_COLOR, 0.1),
                            color: ORANGE_COLOR,
                        }}>
                            <Trash2 size={18} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                lineHeight: 1.2,
                            }}>
                                Move to Recycle Bin
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 400,
                            }}>
                                Items can be restored from the recycle bin
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5, pb: 1.5 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 400,
                            mb: 2,
                        }}
                    >
                        Are you sure you want to move <strong>{selectedForDeletion.size} item(s)</strong> from the <strong>{deletionSection}</strong> section to the recycle bin?
                    </Typography>
                    <Box sx={{
                        p: 1.5,
                        borderRadius: '6px',
                        backgroundColor: alpha(ORANGE_COLOR, 0.05),
                        border: `1px solid ${alpha(ORANGE_COLOR, 0.1)}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                    }}>
                        <AlertCircle size={18} color={ORANGE_COLOR} />
                        <Box>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: ORANGE_COLOR,
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    mb: 0.5,
                                }}
                            >
                                Note
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                }}
                            >
                                Items moved to the recycle bin can be restored later. Permanent deletion is only available in the recycle bin.
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1.5 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        sx={{
                            textTransform: 'none',
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 400,
                            px: 2,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={executeSoftDelete}
                        variant="contained"
                        color="warning"
                        startIcon={<Trash2 size={12} />}
                        disabled={softDeleteBulkMutation.isPending}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            borderRadius: '2px',
                            px: 2,
                            bgcolor: GREEN_COLOR,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: alpha(GREEN_COLOR, 0.9),
                                boxShadow: 'none',
                            },
                        }}
                    >
                        {softDeleteBulkMutation.isPending ? 'Moving...' : 'Move to Recycle Bin'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Complete Dialog */}
            <Dialog
                open={completeDialogOpen}
                onClose={() => setCompleteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'white',
                        borderRadius: '6px',
                        border: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                    }
                }}
            >
                <DialogTitle sx={{
                    borderBottom: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                    pb: 1.5,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(GREEN_COLOR, 0.1),
                            color: GREEN_COLOR,
                        }}>
                            <CheckCheck size={18} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                lineHeight: 1.2,
                            }}>
                                Mark as Complete
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 400,
                            }}>
                                Complete selected work orders before timer expires
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5, pb: 1.5 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 400,
                            mb: 2,
                        }}
                    >
                        Are you sure you want to mark <strong>{selectedForCompletion.size} work order(s)</strong> as complete?
                        This will move them to the Completed section.
                    </Typography>
                    <Box sx={{
                        p: 1.5,
                        borderRadius: '6px',
                        backgroundColor: alpha(GREEN_COLOR, 0.05),
                        border: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                    }}>
                        <AlertCircle size={18} color={GREEN_COLOR} />
                        <Box>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: GREEN_COLOR,
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    mb: 0.5,
                                }}
                            >
                                Note
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                }}
                            >
                                This action will override the timer and mark work orders as completed immediately.
                                Completed work orders will be moved to the Completed section.
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1.5 }}>
                    <Button
                        onClick={() => setCompleteDialogOpen(false)}
                        sx={{
                            textTransform: 'none',
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 400,
                            px: 2,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={executeBulkComplete}
                        variant="contained"
                        color="success"
                        startIcon={<CheckCheck size={16} />}
                        disabled={bulkCompleteWorkOrdersMutation.isPending}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            px: 2,
                            bgcolor: GREEN_COLOR,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: alpha(GREEN_COLOR, 0.9),
                                boxShadow: 'none',
                            },
                        }}
                    >
                        {bulkCompleteWorkOrdersMutation.isPending ? 'Completing...' : 'Mark as Complete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    iconMapping={{
                        success: <CheckCircle size={20} />,
                        error: <AlertCircle size={20} />,
                        warning: <AlertTriangle size={20} />,
                        info: <AlertCircle size={20} />,
                    }}
                    sx={{
                        width: '100%',
                        borderRadius: '6px',
                        backgroundColor: snackbar.severity === 'success'
                            ? alpha(GREEN_COLOR, 0.05)
                            : snackbar.severity === 'error'
                                ? alpha(RED_COLOR, 0.05)
                                : alpha(ORANGE_COLOR, 0.05),
                        borderLeft: `4px solid ${snackbar.severity === 'success' ? GREEN_COLOR : snackbar.severity === 'error' ? RED_COLOR : ORANGE_COLOR}`,
                        '& .MuiAlert-icon': {
                            color: snackbar.severity === 'success' ? GREEN_COLOR : snackbar.severity === 'error' ? RED_COLOR : ORANGE_COLOR,
                        },
                        '& .MuiAlert-message': {
                            py: 0.5,
                        }
                    }}
                    elevation={6}
                >
                    <Typography
                        sx={{
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: TEXT_COLOR,
                        }}
                    >
                        {snackbar.message}
                    </Typography>
                </Alert>
            </Snackbar>
        </Box>
    );
};

const LocateTable = ({
    items,
    selected,
    onToggleSelect,
    onToggleAll,
    onMarkCalled,
    onManualComplete,
    color,
    showCallAction = false,
    showCalledBy = false,
    showTimerColumn = false,
    showManualCompleteAction = false,
    totalCount,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    markCalledMutation,
    completeWorkOrderManuallyMutation,
    tableType = 'pending',
    getCalledAtDate,
    isMobile,
}) => {
    const isSmallMobile = useMediaQuery('(max-width: 600px)');
    const [currentTime, setCurrentTime] = useState(() => getCurrentPacificTime());

    // Update time every second for real-time countdown (in Pacific Time)
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getCurrentPacificTime());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const allSelectedOnPage = items.length > 0 && items.every(item => selected.has(item.id));
    const someSelectedOnPage = items.length > 0 && items.some(item => selected.has(item.id));

    const renderManualCompleteButton = (item) => {
        if (showManualCompleteAction && tableType === 'inProgress') {
            return (
                <Tooltip title="Mark as Complete">
                    <IconButton
                        size="small"
                        onClick={() => onManualComplete(item.workOrderId)}
                        disabled={completeWorkOrderManuallyMutation?.isPending}
                        sx={{
                            color: GREEN_COLOR,
                            '&:hover': {
                                backgroundColor: alpha(GREEN_COLOR, 0.1),
                            },
                        }}
                    >
                        <CheckCircle size={16} />
                    </IconButton>
                </Tooltip>
            );
        }
        return null;
    };

    // Calculate real-time remaining for each item
    const getRealTimeRemaining = (item) => {
        if (!item.locatesCalled || !item.calledAt || !item.callType || item.isExpired) {
            return { text: item.timeRemainingText, color: item.timeRemainingColor, detail: item.timeRemainingDetail };
        }

        const expirationDate = calculateExpirationDate(item.calledAt, item.callType);
        if (!expirationDate) {
            return { text: '—', color: GRAY_COLOR, detail: '' };
        }

        // Calculate remaining time in Pacific Time
        const nowPacific = currentTime;
        const remainingMs = expirationDate.getTime() - nowPacific.getTime();

        // Add a small buffer to prevent showing "1d 23h" when it should be "2d 0h"
        const buffer = 1000; // 1 second buffer

        if (remainingMs <= 0) {
            return { text: 'EXPIRED', color: RED_COLOR, detail: `Expired on: ${format(expirationDate, 'MMM dd, yyyy HH:mm')}` };
        }

        const text = formatTimeRemaining(remainingMs + buffer); // Add buffer to prevent off-by-one errors
        const detail = `Expires at: ${format(expirationDate, 'MMM dd, yyyy HH:mm')}`;

        let timeRemainingColor = TEXT_COLOR;
        if (item.isEmergency) {
            if (remainingMs <= 60 * 60 * 1000) { // 1 hour or less
                timeRemainingColor = RED_COLOR;
            } else if (remainingMs <= 2 * 60 * 60 * 1000) { // 2 hours or less
                timeRemainingColor = ORANGE_COLOR;
            } else {
                timeRemainingColor = BLUE_COLOR;
            }
        } else {
            if (remainingMs <= 24 * 60 * 60 * 1000) { // 1 day or less
                timeRemainingColor = ORANGE_COLOR;
            } else {
                timeRemainingColor = BLUE_COLOR;
            }
        }

        return { text, color: timeRemainingColor, detail };
    };

    return (
        <TableContainer sx={{
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
                height: '8px',
            },
            '&::-webkit-scrollbar-track': {
                backgroundColor: alpha(color, 0.05),
            },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: alpha(color, 0.2),
                borderRadius: '4px',
            },
        }}>
            <Table size="small" sx={{
                minWidth: isMobile ? 1000 : 'auto',
                tableLayout: 'auto',
            }}>
                <TableHead>
                    <TableRow sx={{
                        bgcolor: alpha(color, 0.04),
                        '& th': {
                            borderBottom: `2px solid ${alpha(color, 0.1)}`,
                            py: 1.5,
                            px: 1.5,
                            fontSize: isMobile ? '0.75rem' : '0.8rem',
                            fontWeight: 600,
                            color: TEXT_COLOR,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }
                    }}>
                        <TableCell
                            padding="checkbox"
                            sx={{
                                pl: isMobile ? 1.5 : 2.5,
                                width: '50px',
                                minWidth: '50px',
                                maxWidth: '50px',
                            }}
                        >
                            <Checkbox
                                size="small"
                                checked={allSelectedOnPage}
                                indeterminate={someSelectedOnPage && !allSelectedOnPage}
                                onChange={onToggleAll}
                                sx={{
                                    color: color,
                                    '&.Mui-checked': {
                                        color: color,
                                    },
                                    padding: '4px',
                                }}
                            />
                        </TableCell>
                        {showCallAction && (
                            <TableCell sx={{
                                minWidth: 150,
                                maxWidth: 200,
                            }}>
                                {isMobile ? 'Action' : 'Call Action'}
                            </TableCell>
                        )}
                        {showTimerColumn && (
                            <TableCell sx={{
                                minWidth: 120,
                                maxWidth: 160,
                            }}>
                                {isMobile ? 'Time' : 'Time Remaining'}
                            </TableCell>
                        )}
                        <TableCell sx={{
                            minWidth: 150,
                        }}>
                            Customer
                        </TableCell>
                        <TableCell sx={{
                            minWidth: 180,
                        }}>
                            Address
                        </TableCell>
                        <TableCell sx={{
                            minWidth: 180,
                        }}>
                            Date
                        </TableCell>
                        <TableCell sx={{
                            minWidth: 120,
                        }}>
                            Technician
                        </TableCell>
                        {showCalledBy && (
                            <TableCell sx={{
                                minWidth: 150,
                                maxWidth: 200,
                            }}>
                                Called By
                            </TableCell>
                        )}
                        {showManualCompleteAction && tableType === 'inProgress' && (
                            <TableCell sx={{
                                minWidth: 80,
                                width: '80px',
                                maxWidth: '80px',
                            }}>
                                {isMobile ? 'Act' : 'Actions'}
                            </TableCell>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={
                                1 +
                                (showCallAction ? 1 : 0) +
                                (showTimerColumn ? 1 : 0) +
                                4 +
                                (showCalledBy ? 1 : 0) +
                                (showManualCompleteAction && tableType === 'inProgress' ? 1 : 0)
                            } align="center" sx={{ py: 6 }}>
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                }}>
                                    <AlertCircle size={32} color={alpha(TEXT_COLOR, 0.2)} />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: TEXT_COLOR,
                                            opacity: 0.6,
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                        }}
                                    >
                                        No records found
                                    </Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map(item => {
                            const isSelected = selected.has(item.id);
                            const addressLine = item.street || item.original || '—';
                            const location = [item.city, item.state, item.zip].filter(Boolean).join(', ');
                            const hasCheckmark = item.locatesCalled && item.calledByName;
                            const timeRemaining = getRealTimeRemaining(item);

                            return (
                                <TableRow
                                    key={item.id}
                                    hover
                                    sx={{
                                        bgcolor: isSelected ? alpha(color, 0.1) : 'white',
                                        '&:hover': {
                                            backgroundColor: alpha(color, 0.05),
                                        },
                                        '&:last-child td': {
                                            borderBottom: 'none',
                                        },
                                    }}
                                >
                                    <TableCell padding="checkbox" sx={{
                                        pl: isMobile ? 1.5 : 2.5,
                                        py: 1.5,
                                        width: '50px',
                                        minWidth: '50px',
                                        maxWidth: '50px',
                                    }}>
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => onToggleSelect(item.id)}
                                            size="small"
                                            sx={{
                                                color: color,
                                                '&.Mui-checked': {
                                                    color: color,
                                                },
                                                padding: '4px',
                                            }}
                                        />
                                    </TableCell>

                                    {showCallAction && (
                                        <TableCell sx={{
                                            py: 1.5,
                                            minWidth: 150,
                                            maxWidth: 200,
                                        }}>
                                            {item.locatesCalled ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <CheckCircle size={isMobile ? 16 : 18} color={RED_COLOR} />
                                                    <Chip
                                                        label={item.callType || 'Called'}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: item.callType === 'Emergency' || item.callType === 'EMERGENCY'
                                                                ? alpha(RED_COLOR, 0.1)
                                                                : alpha(BLUE_COLOR, 0.1),
                                                            color: item.callType === 'Emergency' || item.callType === 'EMERGENCY' ? RED_COLOR : BLUE_COLOR,
                                                            border: `1px solid ${item.callType === 'Emergency' || item.callType === 'EMERGENCY'
                                                                ? alpha(RED_COLOR, 0.2)
                                                                : alpha(BLUE_COLOR, 0.2)}`,
                                                            fontSize: isMobile ? '0.7rem' : '0.75rem',
                                                            fontWeight: 500,
                                                            height: isMobile ? '22px' : '22px',
                                                            '& .MuiChip-label': {
                                                                px: 1,
                                                            },
                                                        }}
                                                    />
                                                </Box>
                                            ) : (
                                                <Stack direction={isMobile ? "column" : "row"} spacing={isMobile ? 0.5 : 1}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => onMarkCalled(item.workOrderId, 'STANDARD')}
                                                        startIcon={isMobile ? null : <PhoneCall size={14} />}
                                                        disabled={markCalledMutation?.isPending}
                                                        sx={{
                                                            textTransform: 'none',
                                                            fontSize: isMobile ? '0.7rem' : '0.75rem',
                                                            height: isMobile ? '28px' : '30px',
                                                            px: isMobile ? 1 : 1.5,
                                                            minWidth: isMobile ? '80px' : 'auto',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {markCalledMutation?.isPending && markCalledMutation.variables?.id === item.workOrderId ?
                                                            (isMobile ? '...' : 'Calling...') :
                                                            (isMobile ? 'Standard' : 'Standard')}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        onClick={() => onMarkCalled(item.workOrderId, 'EMERGENCY')}
                                                        startIcon={isMobile ? null : <AlertTriangle size={14} />}
                                                        disabled={markCalledMutation?.isPending}
                                                        sx={{
                                                            textTransform: 'none',
                                                            fontSize: isMobile ? '0.7rem' : '0.75rem',
                                                            height: isMobile ? '28px' : '30px',
                                                            px: isMobile ? 1 : 1.5,
                                                            minWidth: isMobile ? '80px' : 'auto',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {markCalledMutation?.isPending && markCalledMutation.variables?.id === item.workOrderId ?
                                                            (isMobile ? '...' : 'Calling...') :
                                                            (isMobile ? 'Emergency' : 'Emergency')}
                                                    </Button>
                                                </Stack>
                                            )}
                                        </TableCell>
                                    )}

                                    {showTimerColumn && (
                                        <TableCell sx={{
                                            py: 1.5,
                                            minWidth: 120,
                                            maxWidth: 160,
                                        }}>
                                            {item.locatesCalled && item.calledAt && item.callType ? (
                                                <Tooltip title={timeRemaining.detail}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Clock size={isMobile ? 14 : 16} color={timeRemaining.color} />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                color: timeRemaining.color,
                                                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                                fontWeight: timeRemaining.text === 'EXPIRED' ? 600 : 400,
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {timeRemaining.text}
                                                        </Typography>
                                                    </Box>
                                                </Tooltip>
                                            ) : (
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: GRAY_COLOR,
                                                        fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                        fontWeight: 400,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    —
                                                </Typography>
                                            )}
                                        </TableCell>
                                    )}

                                    <TableCell sx={{
                                        py: 1.5,
                                        minWidth: 150,
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                                            {hasCheckmark && (
                                                <Tooltip title={`Called by ${item.calledByName}`}>
                                                    <CheckCircle size={isMobile ? 14 : 16} color={RED_COLOR} />
                                                </Tooltip>
                                            )}
                                            <Box sx={{ flex: 1 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: TEXT_COLOR,
                                                        fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                        fontWeight: 500,
                                                        mb: 0.25,
                                                        wordBreak: 'break-word',
                                                        overflowWrap: 'break-word',
                                                    }}
                                                >
                                                    {item.customerName}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: GRAY_COLOR,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 400,
                                                        display: 'block',
                                                        wordBreak: 'break-word',
                                                        overflowWrap: 'break-word',
                                                    }}
                                                >
                                                    WO: {item.workOrderNumber}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>

                                    <TableCell sx={{
                                        py: 1.5,
                                        minWidth: 180,
                                    }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: TEXT_COLOR,
                                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                fontWeight: 400,
                                                mb: 0.25,
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word',
                                            }}
                                        >
                                            {addressLine}
                                        </Typography>
                                        {location && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: GRAY_COLOR,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 400,
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'break-word',
                                                }}
                                            >
                                                {location}
                                            </Typography>
                                        )}
                                    </TableCell>

                                    <TableCell sx={{
                                        py: 1.5,
                                        minWidth: 180,
                                    }}>
                                        <Stack spacing={0.5}>
                                            {tableType === 'completed' ? (
                                                <>
                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: GRAY_COLOR,
                                                                fontSize: '0.7rem',
                                                                fontWeight: 400,
                                                                display: 'block',
                                                                mb: 0,
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'break-word',
                                                            }}
                                                        >
                                                            {isMobile ? 'Triggered:' : 'Locate Triggered:'}
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: BLUE_COLOR,
                                                                    fontSize: isMobile ? '0.75rem' : '0.75rem',
                                                                    fontWeight: 500,
                                                                    ml: 0.5,
                                                                    wordBreak: 'break-word',
                                                                    overflowWrap: 'break-word',
                                                                }}
                                                            >
                                                                {isMobile ?
                                                                    formatDateShort(item.locateTriggeredDate) :
                                                                    formatDate(item.locateTriggeredDate)}
                                                            </Typography>
                                                        </Typography>
                                                    </Box>

                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: GRAY_COLOR,
                                                                fontSize: '0.7rem',
                                                                fontWeight: 400,
                                                                display: 'block',
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'break-word',
                                                            }}
                                                        >
                                                            {isMobile ? 'Called:' : 'Locate Called In:'}
                                                            {item.locateCalledInDate ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: ORANGE_COLOR,
                                                                        fontSize: isMobile ? '0.75rem' : '0.75rem',
                                                                        fontWeight: 500,
                                                                        ml: 0.5,
                                                                        wordBreak: 'break-word',
                                                                        overflowWrap: 'break-word',
                                                                    }}
                                                                >
                                                                    {isMobile ?
                                                                        formatDateShort(item.locateCalledInDate) :
                                                                        formatDate(item.locateCalledInDate)}
                                                                </Typography>
                                                            ) : (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: GRAY_COLOR,
                                                                        fontSize: isMobile ? '0.75rem' : '0.75rem',
                                                                        fontWeight: 400,
                                                                        fontStyle: 'italic',
                                                                        ml: 0.5,
                                                                        wordBreak: 'break-word',
                                                                        overflowWrap: 'break-word',
                                                                    }}
                                                                >
                                                                    {isMobile ? 'Not called' : 'Not called yet'}
                                                                </Typography>
                                                            )}
                                                        </Typography>
                                                    </Box>

                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: GRAY_COLOR,
                                                                fontSize: '0.7rem',
                                                                fontWeight: 400,
                                                                display: 'block',
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'break-word',
                                                            }}
                                                        >
                                                            {isMobile ? 'Clear:' : 'Clear-to-Dig:'}
                                                            {item.clearToDigDate ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: GREEN_COLOR,
                                                                        fontSize: isMobile ? '0.75rem' : '0.75rem',
                                                                        fontWeight: 500,
                                                                        ml: 0.5,
                                                                        wordBreak: 'break-word',
                                                                        overflowWrap: 'break-word',
                                                                    }}
                                                                >
                                                                    {isMobile ?
                                                                        formatDateShort(item.clearToDigDate) :
                                                                        formatDate(item.clearToDigDate)}
                                                                </Typography>
                                                            ) : (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: GRAY_COLOR,
                                                                        fontSize: isMobile ? '0.75rem' : '0.75rem',
                                                                        fontWeight: 400,
                                                                        fontStyle: 'italic',
                                                                        ml: 0.5,
                                                                        wordBreak: 'break-word',
                                                                        overflowWrap: 'break-word',
                                                                    }}
                                                                >
                                                                    Pending
                                                                </Typography>
                                                            )}
                                                        </Typography>
                                                    </Box>
                                                </>
                                            ) : tableType === 'inProgress' ? (
                                                <Box>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: GRAY_COLOR,
                                                            fontSize: '0.7rem',
                                                            fontWeight: 400,
                                                            display: 'block',
                                                            mb: 0.25,
                                                            wordBreak: 'break-word',
                                                            overflowWrap: 'break-word',
                                                        }}
                                                    >
                                                        {isMobile ? 'Called:' : 'Locate Called:'}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: ORANGE_COLOR,
                                                            fontSize: isMobile ? '0.75rem' : '0.75rem',
                                                            fontWeight: 500,
                                                            wordBreak: 'break-word',
                                                            overflowWrap: 'break-word',
                                                        }}
                                                    >
                                                        {isMobile ?
                                                            formatDateShort(item.calledAt) :
                                                            getCalledAtDate(item)}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <>
                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: GRAY_COLOR,
                                                                fontSize: '0.7rem',
                                                                fontWeight: 400,
                                                                display: 'block',
                                                                mb: 0.25,
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'break-word',
                                                            }}
                                                        >
                                                            {isMobile ? 'Triggered:' : 'Triggered Locate:'}
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: BLUE_COLOR,
                                                                    fontSize: isMobile ? '0.75rem' : '0.75rem',
                                                                    fontWeight: 500,
                                                                    ml: 0.5,
                                                                    wordBreak: 'break-word',
                                                                    overflowWrap: 'break-word',
                                                                }}
                                                            >
                                                                {isMobile ?
                                                                    formatDateShort(item.locateTriggeredDate) :
                                                                    formatDate(item.locateTriggeredDate)}
                                                            </Typography>
                                                        </Typography>
                                                    </Box>
                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: GRAY_COLOR,
                                                                fontSize: '0.7rem',
                                                                fontWeight: 400,
                                                                display: 'block',
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'break-word',
                                                            }}
                                                        >
                                                            {isMobile ? 'Target:' : 'Target Work Date:'}
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: GREEN_COLOR,
                                                                    fontSize: isMobile ? '0.75rem' : '0.75rem',
                                                                    fontWeight: 500,
                                                                    ml: 0.5,
                                                                    wordBreak: 'break-word',
                                                                    overflowWrap: 'break-word',
                                                                }}
                                                            >
                                                                {item.targetWorkDate}
                                                            </Typography>
                                                        </Typography>
                                                    </Box>
                                                </>
                                            )}
                                        </Stack>
                                    </TableCell>

                                    <TableCell sx={{
                                        py: 1.5,
                                        minWidth: 120,
                                    }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: TEXT_COLOR,
                                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                fontWeight: 400,
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word',
                                            }}
                                        >
                                            {item.techName}
                                        </Typography>
                                    </TableCell>

                                    {showCalledBy && (
                                        <TableCell sx={{
                                            py: 1.5,
                                            minWidth: 150,
                                            maxWidth: 200,
                                        }}>
                                            {item.calledByName ? (
                                                <Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <User size={isMobile ? 12 : 14} color={TEXT_COLOR} />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                color: TEXT_COLOR,
                                                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                                fontWeight: 500,
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'break-word',
                                                            }}
                                                        >
                                                            {item.calledByName}
                                                        </Typography>
                                                    </Box>
                                                    {item.calledByEmail && !isMobile && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                                                            <Mail size={10} color={GRAY_COLOR} />
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: GRAY_COLOR,
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 400,
                                                                    wordBreak: 'break-word',
                                                                    overflowWrap: 'break-word',
                                                                }}
                                                            >
                                                                {item.calledByEmail}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            ) : (
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: GRAY_COLOR,
                                                        fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                        fontWeight: 400,
                                                        wordBreak: 'break-word',
                                                        overflowWrap: 'break-word',
                                                    }}
                                                >
                                                    —
                                                </Typography>
                                            )}
                                        </TableCell>
                                    )}

                                    {showManualCompleteAction && tableType === 'inProgress' && (
                                        <TableCell sx={{
                                            py: 1.5,
                                            width: '80px',
                                            minWidth: '80px',
                                            maxWidth: '80px',
                                        }}>
                                            {renderManualCompleteButton(item)}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            {totalCount > 0 && (
                <TablePagination
                    rowsPerPageOptions={isMobile ? [5, 10, 25] : [5, 10, 25, 50]}
                    component="div"
                    count={totalCount}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={onPageChange}
                    onRowsPerPageChange={onRowsPerPageChange}
                    sx={{
                        borderTop: `1px solid ${alpha(color, 0.1)}`,
                        '& .MuiTablePagination-toolbar': {
                            minHeight: '52px',
                            padding: '0 16px',
                        },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontSize: isMobile ? '0.75rem' : '0.8rem',
                            color: TEXT_COLOR,
                            fontWeight: 400,
                        },
                        '& .MuiTablePagination-actions': {
                            marginLeft: '8px',
                        },
                        '& .MuiIconButton-root': {
                            padding: '6px',
                        },
                    }}
                />
            )}
        </TableContainer>
    );
};

export default Locates;