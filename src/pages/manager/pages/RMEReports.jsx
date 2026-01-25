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
    Avatar,
    Stack,
    Checkbox,
    Button,
    Tooltip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
    TablePagination,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import axiosInstance from '../../../api/axios';
import { useAuth } from '../../../auth/AuthProvider';
import { format } from 'date-fns';
import pen from '../../../assets/icons/Edit.gif';
import report from '../../../assets/icons/report.gif';
import locked from '../../../assets/icons/locked.gif';
import discard from '../../../assets/icons/btnDel.gif';

import {
    Search,
    X,
    Trash2,
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Timer,
    Clock,
    History,
    FileText,
    FileSpreadsheet,
    AlertOctagon,
    Save,
    RotateCcw,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import DashboardLoader from '../../../components/Loader/DashboardLoader';
import StyledTextField from '../../../components/ui/StyledTextField';
import OutlineButton from '../../../components/ui/OutlineButton';
import RmeRecycleBinModal from '../../../components/ui/Modal/RmeRecycleBinModal'; // Import the RecycleBinModal

const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const ORANGE_COLOR = '#ed6c02';
const GRAY_COLOR = '#6b7280';
const PURPLE_COLOR = '#8b5cf6';
const CYAN_COLOR = '#06b6d4';

const PACIFIC_TIMEZONE_OFFSET = -8; // PST offset in hours (UTC-8)
const PACIFIC_DAYLIGHT_OFFSET = -7; // PDT offset in hours (UTC-7)

// Helper function to check if we're in Daylight Saving Time
const isDaylightSavingTime = (date) => {
    const year = date.getFullYear();
    // DST in US: Second Sunday in March to First Sunday in November
    const march = new Date(year, 2, 1);
    const november = new Date(year, 10, 1);

    // Find second Sunday in March
    let dstStart = new Date(march);
    while (dstStart.getDay() !== 0) {
        dstStart.setDate(dstStart.getDate() + 1);
    }
    dstStart.setDate(dstStart.getDate() + 7); // Second Sunday

    // Find first Sunday in November
    let dstEnd = new Date(november);
    while (dstEnd.getDay() !== 0) {
        dstEnd.setDate(dstEnd.getDate() + 1);
    }

    return date >= dstStart && date < dstEnd;
};

// Convert UTC date to Pacific Time
const toPacificTime = (dateString) => {
    if (!dateString) return null;
    try {
        // If dateString is already a Date object
        const date = dateString instanceof Date ? dateString : new Date(dateString);

        // Handle invalid dates
        if (isNaN(date.getTime())) {
            console.warn('Invalid date string:', dateString);
            return null;
        }

        // Create a new date in UTC
        const utcDate = new Date(date.toISOString());

        // Apply Pacific Time offset
        const offset = isDaylightSavingTime(utcDate) ? PACIFIC_DAYLIGHT_OFFSET : PACIFIC_TIMEZONE_OFFSET;
        const pacificTime = new Date(utcDate.getTime() + (offset * 60 * 60 * 1000));

        return pacificTime;
    } catch (e) {
        console.error('Error converting to Pacific Time:', e, 'Date string:', dateString);
        return null;
    }
};

// Format date for display (Pacific Time)
const formatDate = (dateString) => {
    const date = toPacificTime(dateString);
    if (!date) return '—';
    return format(date, 'MMM dd, yyyy');
};

// Format time for display (Pacific Time)
const formatTime = (dateString) => {
    const date = toPacificTime(dateString);
    if (!date) return '—';
    return format(date, 'h:mm a');
};

// Format short date with time (Pacific Time)
const formatDateShort = (dateString) => {
    const date = toPacificTime(dateString);
    if (!date) return '—';
    return format(date, 'MMM dd, h:mm a');
};

// Format date and time with timezone (Pacific Time)
const formatDateTimeWithTZ = (dateString) => {
    const date = toPacificTime(dateString);
    if (!date) return '—';
    return format(date, 'MMM dd, yyyy h:mm a');
};

// Calculate elapsed time in Pacific Time
const calculateElapsedTime = (createdDate) => {
    if (!createdDate) return '—';
    try {
        const now = new Date();
        const created = toPacificTime(createdDate);
        if (!created) return '—';

        const diffMs = now - created;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return `${diffMinutes} MIN${diffMinutes !== 1 ? 'S' : ''}`;
        } else if (diffHours < 24) {
            return `${diffHours} HR${diffHours !== 1 ? 'S' : ''}`;
        } else {
            return `${diffHours} HR${diffHours !== 1 ? 'S' : ''}`;
        }
    } catch (e) {
        console.error('Error calculating elapsed time:', e);
        return '—';
    }
};

const getElapsedColor = (createdDate) => {
    if (!createdDate) return GRAY_COLOR;
    try {
        const now = new Date();
        const created = toPacificTime(createdDate);
        if (!created) return GRAY_COLOR;

        const diffMs = now - created;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 24) return GREEN_COLOR;
        if (diffHours < 48) return ORANGE_COLOR;
        return RED_COLOR;
    } catch (e) {
        return GRAY_COLOR;
    }
};

const getTechnicianInitial = (technicianName) => {
    if (!technicianName) return '?';
    return technicianName.charAt(0).toUpperCase();
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

// Get current Pacific Time as ISO string for database
const getCurrentPacificTimeISO = () => {
    const now = new Date();
    const offset = isDaylightSavingTime(now) ? PACIFIC_DAYLIGHT_OFFSET : PACIFIC_TIMEZONE_OFFSET;
    const pacificTime = new Date(now.getTime() + (offset * 60 * 60 * 1000));
    // Convert back to UTC for database storage
    return new Date(pacificTime.getTime() - (offset * 60 * 60 * 1000)).toISOString();
};

const PDFViewerModal = ({ open, onClose, pdfUrl }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    bgcolor: 'white',
                    borderRadius: isMobile ? 0 : '8px',
                    height: isMobile ? '100%' : '90vh',
                    maxHeight: '90vh',
                }
            }}
        >
            <DialogTitle sx={{
                borderBottom: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
                bgcolor: alpha(BLUE_COLOR, 0.03),
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: alpha(BLUE_COLOR, 0.1),
                        color: BLUE_COLOR,
                    }}>
                        <FileText size={20} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: TEXT_COLOR,
                            mb: 0.5,
                        }}>
                            PDF Viewer
                        </Typography>
                        <Typography variant="body2" sx={{
                            fontSize: '0.85rem',
                            color: GRAY_COLOR,
                        }}>
                            Last Locked Report
                        </Typography>
                    </Box>
                </Box>
                <IconButton
                    size="small"
                    onClick={onClose}
                    sx={{
                        color: GRAY_COLOR,
                        '&:hover': {
                            backgroundColor: alpha(GRAY_COLOR, 0.1),
                        },
                    }}
                >
                    <X size={20} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {pdfUrl ? (
                    <iframe
                        src={pdfUrl}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            flex: 1,
                        }}
                        title="PDF Viewer"
                    />
                ) : (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: 2,
                        p: 4,
                    }}>
                        <FileText size={48} color={alpha(GRAY_COLOR, 0.3)} />
                        <Typography variant="body2" sx={{
                            color: GRAY_COLOR,
                            fontSize: '0.9rem',
                        }}>
                            No PDF available
                        </Typography>
                        <Typography variant="caption" sx={{
                            color: GRAY_COLOR,
                            fontSize: '0.8rem',
                        }}>
                            PDF will appear here when available
                        </Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

const RMEReports = () => {
    const queryClient = useQueryClient();
    const { user: authUser } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // State for each table's selection
    const [selectedReportNeeded, setSelectedReportNeeded] = useState(new Set());
    const [selectedReportSubmitted, setSelectedReportSubmitted] = useState(new Set());
    const [selectedHolding, setSelectedHolding] = useState(new Set());
    const [selectedFinalized, setSelectedFinalized] = useState(new Set());

    // State for actions checkboxes in report submitted table
    const [waitToLockAction, setWaitToLockAction] = useState(new Set());

    // State for action details (for wait to lock)
    const [waitToLockDetails, setWaitToLockDetails] = useState({});

    // Pagination for each table
    const [pageReportNeeded, setPageReportNeeded] = useState(0);
    const [rowsPerPageReportNeeded, setRowsPerPageReportNeeded] = useState(isMobile ? 5 : 10);
    const [pageReportSubmitted, setPageReportSubmitted] = useState(0);
    const [rowsPerPageReportSubmitted, setRowsPerPageReportSubmitted] = useState(isMobile ? 5 : 10);
    const [pageHolding, setPageHolding] = useState(0);
    const [rowsPerPageHolding, setRowsPerPageHolding] = useState(isMobile ? 5 : 10);
    const [pageFinalized, setPageFinalized] = useState(0);
    const [rowsPerPageFinalized, setRowsPerPageFinalized] = useState(isMobile ? 5 : 10);

    // Search states
    const [searchReportNeeded, setSearchReportNeeded] = useState('');
    const [searchReportSubmitted, setSearchReportSubmitted] = useState('');
    const [searchHolding, setSearchHolding] = useState('');
    const [searchFinalized, setSearchFinalized] = useState('');

    // Recycle Bin modal states
    const [recycleBinModalOpen, setRecycleBinModalOpen] = useState(false);
    const [recycleBinSearch, setRecycleBinSearch] = useState('');
    const [recycleBinPage, setRecycleBinPage] = useState(0);
    const [recycleBinRowsPerPage, setRecycleBinRowsPerPage] = useState(isMobile ? 5 : 10);
    const [selectedRecycleBinItems, setSelectedRecycleBinItems] = useState(new Set());

    // Dialog states
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedForDeletion, setSelectedForDeletion] = useState(new Set());
    const [deletionSection, setDeletionSection] = useState('');

    const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
    const [selectedForPermanentDeletion, setSelectedForPermanentDeletion] = useState(new Set());

    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [selectedForRestore, setSelectedForRestore] = useState(new Set());

    // PDF Viewer state
    const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
    const [currentPdfUrl, setCurrentPdfUrl] = useState('');

    // Confirmation modals for actions
    const [lockedConfirmModal, setLockedConfirmModal] = useState({
        open: false,
        itemId: null,
        itemData: null,
        section: null,
    });

    const [discardConfirmModal, setDiscardConfirmModal] = useState({
        open: false,
        itemId: null,
        itemData: null,
        section: null,
    });

    // Single action modals for recycle bin
    const [singleRestoreDialogOpen, setSingleRestoreDialogOpen] = useState(false);
    const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);
    const [selectedSingleItem, setSelectedSingleItem] = useState(null);

    // Snackbar
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success',
    });

    // Fetch all work orders
    const { data: workOrders = [], isLoading } = useQuery({
        queryKey: ['rme-work-orders'],
        queryFn: async () => {
            const res = await axiosInstance.get('/work-orders-today/');
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 30000,
        refetchInterval: 60000,
    });

    // Fetch only deleted work orders for recycle bin
    const { data: deletedWorkOrders = [] } = useQuery({
        queryKey: ['rme-deleted-work-orders'],
        queryFn: async () => {
            const res = await axiosInstance.get('/work-orders-today/');
            const allOrders = Array.isArray(res.data) ? res.data : [];
            return allOrders.filter(order => order.is_deleted);
        },
        staleTime: 30000,
        refetchInterval: 60000,
    });

    // Initialize checkbox states from API data
    useEffect(() => {
        if (workOrders.length > 0) {
            const newWaitToLockDetails = {};

            workOrders.forEach(item => {
                if (!item.is_deleted && !item.finalized_by && !item.wait_to_lock && !item.moved_to_holding_date) {
                    if (item.wait_to_lock) {
                        newWaitToLockDetails[item.id.toString()] = {
                            reason: item.reason || '',
                            notes: item.notes || ''
                        };
                    }
                }
            });

            setWaitToLockDetails(newWaitToLockDetails);
        }
    }, [workOrders]);

    // Get current user from auth
    const currentUser = useMemo(() => {
        return authUser ? {
            name: authUser.name || authUser.full_name || authUser.username || 'Unknown User',
            email: authUser.email || authUser.email_address || 'unknown@example.com',
            id: authUser.id || authUser.user_id || 'unknown'
        } : {
            name: 'Unknown User',
            email: 'unknown@example.com',
            id: 'unknown'
        };
    }, [authUser]);

    // Process data for different stages with Pacific Time formatting
    const processedData = useMemo(() => {
        const reportNeeded = [];
        const reportSubmitted = [];
        const holding = [];
        const finalized = [];

        workOrders.forEach(item => {
            // Format all dates to Pacific Time for display
            const report = {
                id: item.id.toString(),
                woNumber: item.wo_number || 'N/A',
                date: formatDate(item.scheduled_date),
                scheduledDate: item.scheduled_date,
                elapsedTime: calculateElapsedTime(item.scheduled_date),
                elapsedColor: getElapsedColor(item.scheduled_date),
                technician: item.technician || 'Unassigned',
                technicianInitial: getTechnicianInitial(item.technician),
                address: item.full_address || 'No address',
                street: item.full_address ? item.full_address.split(',')[0]?.trim() || 'Unknown' : 'Unknown',
                city: item.full_address ? item.full_address.split(',')[1]?.trim().split(' ')[0] || 'Unknown' : 'Unknown',
                state: item.full_address ? item.full_address.split(',')[1]?.trim().split(' ')[1] || 'Unknown' : 'Unknown',
                zip: item.full_address ? item.full_address.split(',')[1]?.trim().split(' ')[2] || 'Unknown' : 'Unknown',
                lastReport: !!item.last_report_link,
                lastReportLink: item.last_report_link,
                unlockedReport: !!item.unlocked_report_link,
                unlockedReportLink: item.unlocked_report_link,
                techReportSubmitted: item.tech_report_submitted || false,
                waitToLock: item.wait_to_lock || false,
                reason: item.reason || '',
                notes: item.notes || '',
                movedToHoldingDate: item.moved_to_holding_date,
                isDeleted: item.is_deleted || false,
                deletedBy: item.deleted_by,
                deletedDate: item.deleted_date,
                deletedDateFormatted: formatDateTimeWithTZ(item.deleted_date),
                finalizedBy: item.finalized_by,
                finalizedByEmail: item.finalized_by_email,
                finalizedDate: item.finalized_date,
                finalizedDateFormatted: formatDateTimeWithTZ(item.finalized_date),
                reportId: item.report_id,
                createdAt: item.scheduled_date,
                timeCompleted: formatTime(item.scheduled_date),
                scheduledDateFormatted: formatDateTimeWithTZ(item.scheduled_date),
                movedToHoldingDateFormatted: formatDateTimeWithTZ(item.moved_to_holding_date),
                rawData: item,
            };

            if (item.is_deleted) {
                // Deleted items go to recycle bin
            } else if (item.status === 'DELETED' && item.rme_completed) {
                finalized.push({
                    ...report,
                    action: 'deleted',
                    actionTime: item.finalized_date || item.updated_at || item.created_at,
                    actionTimeFormatted: formatDateTimeWithTZ(item.finalized_date || item.updated_at || item.created_at),
                    by: item.finalized_by || 'System',
                    byEmail: item.finalized_by_email || '',
                    status: 'DELETED',
                    statusColor: RED_COLOR,
                    isStatusDeleted: true,
                });
            } else if (item.finalized_by && item.rme_completed) {
                finalized.push({
                    ...report,
                    action: 'locked',
                    actionTime: item.finalized_date,
                    actionTimeFormatted: formatDateTimeWithTZ(item.finalized_date),
                    by: item.finalized_by,
                    byEmail: item.finalized_by_email || '',
                    status: 'LOCKED',
                    statusColor: GREEN_COLOR,
                });
            } else if (item.wait_to_lock || item.moved_to_holding_date) {
                holding.push({
                    ...report,
                    priorLockedReport: !!item.last_report_link,
                    reason: item.reason || 'Pending Review',
                });
            } else if (item.tech_report_submitted) {
                reportSubmitted.push(report);
            } else {
                reportNeeded.push(report);
            }
        });

        return { reportNeeded, reportSubmitted, holding, finalized };
    }, [workOrders]);

    // Filter functions for each table with search
    const filteredReportNeeded = useMemo(() => {
        let filtered = processedData.reportNeeded;
        if (searchReportNeeded) {
            const searchLower = searchReportNeeded.toLowerCase();
            filtered = filtered.filter(report =>
                report.technician?.toLowerCase().includes(searchLower) ||
                report.address?.toLowerCase().includes(searchLower) ||
                report.street?.toLowerCase().includes(searchLower) ||
                report.city?.toLowerCase().includes(searchLower) ||
                report.woNumber?.toLowerCase().includes(searchLower)
            );
        }
        return filtered;
    }, [processedData.reportNeeded, searchReportNeeded]);

    const filteredReportSubmitted = useMemo(() => {
        let filtered = processedData.reportSubmitted;
        if (searchReportSubmitted) {
            const searchLower = searchReportSubmitted.toLowerCase();
            filtered = filtered.filter(report =>
                report.technician?.toLowerCase().includes(searchLower) ||
                report.address?.toLowerCase().includes(searchLower) ||
                report.street?.toLowerCase().includes(searchLower) ||
                report.city?.toLowerCase().includes(searchLower) ||
                report.woNumber?.toLowerCase().includes(searchLower)
            );
        }
        return filtered;
    }, [processedData.reportSubmitted, searchReportSubmitted]);

    const filteredHoldingReports = useMemo(() => {
        let filtered = processedData.holding;
        if (searchHolding) {
            const searchLower = searchHolding.toLowerCase();
            filtered = filtered.filter(report =>
                report.technician?.toLowerCase().includes(searchLower) ||
                report.address?.toLowerCase().includes(searchLower) ||
                report.reason?.toLowerCase().includes(searchLower) ||
                report.notes?.toLowerCase().includes(searchLower)
            );
        }
        return filtered;
    }, [processedData.holding, searchHolding]);

    const filteredFinalizedReports = useMemo(() => {
        let filtered = processedData.finalized;
        if (searchFinalized) {
            const searchLower = searchFinalized.toLowerCase();
            filtered = filtered.filter(report =>
                report.by?.toLowerCase().includes(searchLower) ||
                report.address?.toLowerCase().includes(searchLower) ||
                report.technician?.toLowerCase().includes(searchLower) ||
                report.status?.toLowerCase().includes(searchLower) ||
                report.reportId?.toLowerCase().includes(searchLower)
            );
        }
        return filtered;
    }, [processedData.finalized, searchFinalized]);

    // Handle PDF view
    const handleViewPDF = (pdfUrl) => {
        setCurrentPdfUrl(pdfUrl);
        setPdfViewerOpen(true);
    };

    // Handle unlocked report link click
    const handleUnlockedReportClick = (url) => {
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    // Mutations
    const invalidateAndRefetch = () => {
        queryClient.invalidateQueries(['rme-work-orders']);
        queryClient.invalidateQueries(['rme-deleted-work-orders']);
    };

    const bulkSoftDeleteMutation = useMutation({
        mutationFn: async (ids) => {
            const promises = Array.from(ids).map(id =>
                axiosInstance.patch(`/work-orders-today/${id}/`, {
                    is_deleted: true,
                    deleted_by: currentUser.name,
                    deleted_by_email: currentUser.email,
                    deleted_date: getCurrentPacificTimeISO(),
                })
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            invalidateAndRefetch();
            showSnackbar('Items moved to recycle bin', 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Delete failed', 'error');
        },
    });

    const permanentDeleteFromRecycleBinMutation = useMutation({
        mutationFn: async (id) => {
            const response = await axiosInstance.delete(`/work-orders-today/${id}/`);
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
                axiosInstance.delete(`/work-orders-today/${id}/`)
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            invalidateAndRefetch();
            setSelectedRecycleBinItems(new Set());
            setPermanentDeleteDialogOpen(false);
            showSnackbar('Items permanently deleted', 'success');
        },
        onError: (err) => {
            console.error('Bulk permanent delete error:', err);
            showSnackbar(err?.response?.data?.message || 'Bulk permanent delete failed', 'error');
        },
    });

    const restoreFromRecycleBinMutation = useMutation({
        mutationFn: async (id) => {
            const response = await axiosInstance.patch(`/work-orders-today/${id}/`, {
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
                axiosInstance.patch(`/work-orders-today/${id}/`, {
                    is_deleted: false,
                    deleted_date: null,
                    deleted_by: '',
                    deleted_by_email: '',
                })
            );
            return Promise.all(promises);
        },
        onSuccess: (responses) => {
            invalidateAndRefetch();
            setSelectedRecycleBinItems(new Set());
            setRestoreDialogOpen(false);
            showSnackbar(`${responses.length} item(s) restored`, 'success');
        },
        onError: (err) => {
            console.error('Bulk restore error:', err);
            showSnackbar(
                err?.response?.data?.message || 'Bulk restore failed',
                'error'
            );
        },
    });

    const lockReportMutation = useMutation({
        mutationFn: async ({ id }) => {
            const response = await axiosInstance.patch(`/work-orders-today/${id}/`, {
                finalized_by: currentUser.name,
                finalized_by_email: currentUser.email,
                finalized_date: getCurrentPacificTimeISO(),
                rme_completed: true,
                report_id: `RME-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                tech_report_submitted: true,
                status: 'LOCKED',
            });
            return response.data;
        },
        onSuccess: () => {
            invalidateAndRefetch();
        },
    });

    const waitToLockMutation = useMutation({
        mutationFn: async ({ id, reason, notes }) => {
            const response = await axiosInstance.patch(`/work-orders-today/${id}/`, {
                wait_to_lock: true,
                reason: reason,
                notes: notes,
                moved_created_by: currentUser.name,
                moved_to_holding_date: getCurrentPacificTimeISO(),
                tech_report_submitted: true,
                status: 'HOLDING',
            });
            return response.data;
        },
        onSuccess: () => {
            invalidateAndRefetch();
        },
    });

    const deleteReportMutation = useMutation({
        mutationFn: async ({ id }) => {
            const response = await axiosInstance.patch(`/work-orders-today/${id}/`, {
                finalized_by: currentUser.name,
                finalized_by_email: currentUser.email,
                finalized_date: getCurrentPacificTimeISO(),
                rme_completed: true,
                status: 'DELETED',
            });
            return response.data;
        },
        onSuccess: () => {
            invalidateAndRefetch();
        },
    });

    // Handle locked action with confirmation
    const handleLockedClick = (id, section, itemData) => {
        setLockedConfirmModal({
            open: true,
            itemId: id,
            itemData: itemData,
            section: section,
        });
    };

    const confirmLockedAction = async () => {
        const { itemId } = lockedConfirmModal;

        try {
            await lockReportMutation.mutateAsync({
                id: itemId,
            });

            showSnackbar('Report locked successfully', 'success');
        } catch (error) {
            console.error('Error locking report:', error);
            showSnackbar('Failed to lock report', 'error');
        } finally {
            setLockedConfirmModal({ open: false, itemId: null, itemData: null, section: null });
        }
    };

    // Handle discard action with confirmation
    const handleDiscardClick = (id, section, itemData) => {
        setDiscardConfirmModal({
            open: true,
            itemId: id,
            itemData: itemData,
            section: section,
        });
    };

    const confirmDiscardAction = async () => {
        const { itemId } = discardConfirmModal;

        try {
            await deleteReportMutation.mutateAsync({ id: itemId });
            showSnackbar('Report discarded successfully', 'success');
        } catch (error) {
            console.error('Error discarding report:', error);
            showSnackbar('Failed to discard report', 'error');
        } finally {
            setDiscardConfirmModal({ open: false, itemId: null, itemData: null, section: null });
        }
    };

    const handleWaitToLockToggle = (id) => {
        const newSet = new Set(waitToLockAction);
        if (newSet.has(id)) {
            newSet.delete(id);
            const newDetails = { ...waitToLockDetails };
            delete newDetails[id];
            setWaitToLockDetails(newDetails);
        } else {
            newSet.add(id);
            setWaitToLockDetails(prev => ({
                ...prev,
                [id]: { reason: '', notes: '' }
            }));
        }
        setWaitToLockAction(newSet);
    };

    // Handle wait to lock details changes
    const handleWaitToLockReasonChange = (id, reason) => {
        setWaitToLockDetails(prev => ({
            ...prev,
            [id]: { ...prev[id], reason }
        }));
    };

    const handleWaitToLockNotesChange = (id, notes) => {
        setWaitToLockDetails(prev => ({
            ...prev,
            [id]: { ...prev[id], notes }
        }));
    };

    // Pagination handlers
    const handleChangePageReportNeeded = (event, newPage) => setPageReportNeeded(newPage);
    const handleChangeRowsPerPageReportNeeded = (event) => {
        setRowsPerPageReportNeeded(parseInt(event.target.value, 10));
        setPageReportNeeded(0);
    };

    const handleChangePageReportSubmitted = (event, newPage) => setPageReportSubmitted(newPage);
    const handleChangeRowsPerPageReportSubmitted = (event) => {
        setRowsPerPageReportSubmitted(parseInt(event.target.value, 10));
        setPageReportSubmitted(0);
    };

    const handleChangePageHolding = (event, newPage) => setPageHolding(newPage);
    const handleChangeRowsPerPageHolding = (event) => {
        setRowsPerPageHolding(parseInt(event.target.value, 10));
        setPageHolding(0);
    };

    const handleChangePageFinalized = (event, newPage) => setPageFinalized(newPage);
    const handleChangeRowsPerPageFinalized = (event) => {
        setRowsPerPageFinalized(parseInt(event.target.value, 10));
        setPageFinalized(0);
    };

    const handleChangeRecycleBinPage = (event, newPage) => setRecycleBinPage(newPage);
    const handleChangeRecycleBinRowsPerPage = (event) => {
        setRecycleBinRowsPerPage(parseInt(event.target.value, 10));
        setRecycleBinPage(0);
    };

    // Show snackbar
    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // Selection toggle functions
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

    // Recycle Bin selection functions
    const toggleRecycleBinSelection = (itemKey) => {
        setSelectedRecycleBinItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemKey)) newSet.delete(itemKey);
            else newSet.add(itemKey);
            return newSet;
        });
    };

    const toggleAllRecycleBinSelection = () => {
        const currentPageItems = recycleBinPageItems;
        const allPageIds = new Set(currentPageItems.map(item => item.id.toString()));
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

    // Action handlers
    const handleSoftDelete = async (selectionSet, section) => {
        if (selectionSet.size === 0) return;
        setSelectedForDeletion(selectionSet);
        setDeletionSection(section);
        setDeleteDialogOpen(true);
    };

    const executeSoftDelete = async () => {
        try {
            await bulkSoftDeleteMutation.mutateAsync(selectedForDeletion);
            setSelectedReportNeeded(new Set());
            setSelectedReportSubmitted(new Set());
            setSelectedHolding(new Set());
            setSelectedFinalized(new Set());
            setSelectedForDeletion(new Set());
            setDeleteDialogOpen(false);
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handlePermanentDelete = async (selectionSet) => {
        if (selectionSet.size === 0) return;
        setSelectedForPermanentDeletion(selectionSet);
        setPermanentDeleteDialogOpen(true);
    };

    const executePermanentDelete = async () => {
        try {
            await bulkPermanentDeleteMutation.mutateAsync(Array.from(selectedForPermanentDeletion));
            setSelectedRecycleBinItems(new Set());
            setPermanentDeleteDialogOpen(false);
            setSelectedForPermanentDeletion(new Set());
        } catch (error) {
            console.error('Permanent delete error:', error);
        }
    };

    const handleRestore = async (selectionSet) => {
        if (selectionSet.size === 0) return;
        setSelectedForRestore(selectionSet);
        setRestoreDialogOpen(true);
    };

    const executeRestore = async () => {
        try {
            await bulkRestoreMutation.mutateAsync(Array.from(selectedForRestore));
            setSelectedRecycleBinItems(new Set());
            setRestoreDialogOpen(false);
            setSelectedForRestore(new Set());
        } catch (error) {
            console.error('Restore error:', error);
        }
    };

    // Handle save changes for Report Submitted table (only for Wait to Lock)
    const handleSaveReportSubmittedChanges = async () => {
        const selectedItems = reportSubmittedPageItems.filter(item =>
            waitToLockAction.has(item.id)
        );

        const actions = {
            waitToLock: [],
            invalidCombinations: []
        };

        selectedItems.forEach(item => {
            const hasWaitToLock = waitToLockAction.has(item.id);
            if (hasWaitToLock) {
                const details = waitToLockDetails[item.id] || { reason: '', notes: '' };
                if (details.reason) {
                    actions.waitToLock.push({
                        id: item.id,
                        reason: details.reason,
                        notes: details.notes,
                        rawData: item.rawData,
                    });
                } else {
                    actions.invalidCombinations.push({
                        id: item.id,
                        address: item.address,
                        error: 'Missing reason for Wait to Lock'
                    });
                }
            }
        });

        // Execute API calls for Wait to Lock
        try {
            let message = '';

            // Process wait to lock
            if (actions.waitToLock.length > 0) {
                for (const action of actions.waitToLock) {
                    await waitToLockMutation.mutateAsync({
                        id: action.id,
                        reason: action.reason,
                        notes: action.notes,
                    });
                }
                message += `${actions.waitToLock.length} report(s) moved to Holding. `;
            }

            // Show errors for invalid combinations
            if (actions.invalidCombinations.length > 0) {
                const invalidAddresses = actions.invalidCombinations.map(ic => ic.address).join(', ');
                message += `${actions.invalidCombinations.length} report(s) have errors: ${invalidAddresses}.`;
                showSnackbar(message, 'warning');
            } else if (message) {
                showSnackbar(message, 'success');
            } else {
                showSnackbar('No Wait to Lock changes to save', 'info');
            }

            // Clear checkboxes after processing
            setWaitToLockAction(new Set());
            setWaitToLockDetails({});

        } catch (error) {
            console.error('Save changes error:', error);
            showSnackbar('Failed to save changes', 'error');
        }
    };

    // Handle single item actions in recycle bin
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

    // Paginated items
    const reportNeededPageItems = filteredReportNeeded.slice(
        pageReportNeeded * rowsPerPageReportNeeded,
        pageReportNeeded * rowsPerPageReportNeeded + rowsPerPageReportNeeded
    );

    const reportSubmittedPageItems = filteredReportSubmitted.slice(
        pageReportSubmitted * rowsPerPageReportSubmitted,
        pageReportSubmitted * rowsPerPageReportSubmitted + rowsPerPageReportSubmitted
    );

    const holdingPageItems = filteredHoldingReports.slice(
        pageHolding * rowsPerPageHolding,
        pageHolding * rowsPerPageHolding + rowsPerPageHolding
    );

    const finalizedPageItems = filteredFinalizedReports.slice(
        pageFinalized * rowsPerPageFinalized,
        pageFinalized * rowsPerPageFinalized + rowsPerPageFinalized
    );

    const recycleBinPageItems = deletedWorkOrders.slice(
        recycleBinPage * recycleBinRowsPerPage,
        recycleBinPage * recycleBinRowsPerPage + recycleBinRowsPerPage
    );

    // Get current timezone offset for Pacific Time
    const getCurrentPacificTimezoneOffset = () => {
        return isDaylightSavingTime(new Date()) ? PACIFIC_DAYLIGHT_OFFSET : PACIFIC_TIMEZONE_OFFSET;
    };

    // Loading state
    if (isLoading) {
        return <DashboardLoader />;
    }

    return (
        <Box>
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
                        RME Report Tracking
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: GRAY_COLOR,
                            fontSize: '0.8rem',
                            fontWeight: 400,
                        }}
                    >
                        Track RME reports through 4 stages
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<History size={16} />}
                    onClick={() => setRecycleBinModalOpen(true)}
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
                    {isMobile ? `Bin (${deletedWorkOrders.length})` : `Recycle Bin (${deletedWorkOrders.length})`}
                </Button>
            </Box>

            {/* Stage 1: Report Needed Reports */}
            <Section
                title="Stage 1: Report Needed"
                color={BLUE_COLOR}
                count={filteredReportNeeded.length}
                selectedCount={selectedReportNeeded.size}
                additionalActions={
                    <Box sx={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: 1,
                        width: isMobile ? '100%' : 'auto',
                        mt: isMobile ? 1 : 0
                    }}>
                        <SearchInput
                            value={searchReportNeeded}
                            onChange={setSearchReportNeeded}
                            placeholder="Search report needed..."
                            fullWidth={isMobile}
                        />
                        {isMobile && selectedReportNeeded.size > 0 && (
                            <OutlineButton
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => handleSoftDelete(selectedReportNeeded, 'Report Needed')}
                                startIcon={<Trash2 size={10} />}
                            >
                                Move to Bin ({selectedReportNeeded.size})
                            </OutlineButton>
                        )}
                    </Box>
                }
                showDeleteButton={!isMobile && selectedReportNeeded.size > 0}
                onDeleteAction={() => handleSoftDelete(selectedReportNeeded, 'Report Needed')}
                isMobile={isMobile}
            >
                <ReportNeededTable
                    items={reportNeededPageItems}
                    selected={selectedReportNeeded}
                    onToggleSelect={(id) => toggleSelection(setSelectedReportNeeded, id)}
                    onToggleAll={() => setSelectedReportNeeded(toggleAllSelection(filteredReportNeeded, reportNeededPageItems, selectedReportNeeded))}
                    color={BLUE_COLOR}
                    totalCount={filteredReportNeeded.length}
                    page={pageReportNeeded}
                    rowsPerPage={rowsPerPageReportNeeded}
                    onPageChange={handleChangePageReportNeeded}
                    onRowsPerPageChange={handleChangeRowsPerPageReportNeeded}
                    onViewPDF={handleViewPDF}
                    onUnlockedReportClick={handleUnlockedReportClick}
                    isMobile={isMobile}
                />
            </Section>

            {/* Stage 2: Report Submitted */}
            <Section
                title="Stage 2: Report Submitted"
                color={CYAN_COLOR}
                count={filteredReportSubmitted.length}
                selectedCount={selectedReportSubmitted.size}
                additionalActions={
                    <Box sx={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: 1,
                        width: isMobile ? '100%' : 'auto',
                        mt: isMobile ? 1 : 0
                    }}>
                        <SearchInput
                            value={searchReportSubmitted}
                            onChange={setSearchReportSubmitted}
                            placeholder="Search report submitted..."
                            fullWidth={isMobile}
                        />
                        {isMobile && (
                            <Box sx={{
                                gap: 1,
                                width: '100%'
                            }}>
                                {selectedReportSubmitted.size > 0 && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={() => handleSoftDelete(selectedReportSubmitted, 'Report Submitted')}
                                        startIcon={<Trash2 size={14} />}
                                        sx={{
                                            textTransform: 'none',
                                            fontSize: '0.75rem',
                                            height: '30px',
                                            flex: 1,
                                        }}
                                    >
                                        Bin ({selectedReportSubmitted.size})
                                    </Button>
                                )}
                            </Box>
                        )}
                    </Box>
                }
                showDeleteButton={!isMobile && selectedReportSubmitted.size > 0}
                onDeleteAction={() => handleSoftDelete(selectedReportSubmitted, 'Report Submitted')}
                isMobile={isMobile}
            >
                <ReportSubmittedTable
                    items={reportSubmittedPageItems}
                    selected={selectedReportSubmitted}
                    onToggleSelect={(id) => toggleSelection(setSelectedReportSubmitted, id)}
                    onToggleAll={() => setSelectedReportSubmitted(toggleAllSelection(filteredReportSubmitted, reportSubmittedPageItems, selectedReportSubmitted))}
                    onLockedClick={(id, itemData) => handleLockedClick(id, 'reportSubmitted', itemData)}
                    waitToLockAction={waitToLockAction}
                    onWaitToLockToggle={handleWaitToLockToggle}
                    onDiscardClick={(id, itemData) => handleDiscardClick(id, 'reportSubmitted', itemData)}
                    waitToLockDetails={waitToLockDetails}
                    onWaitToLockReasonChange={handleWaitToLockReasonChange}
                    onWaitToLockNotesChange={handleWaitToLockNotesChange}
                    onSaveChanges={handleSaveReportSubmittedChanges}
                    waitToLockActionSize={waitToLockAction.size}
                    color={CYAN_COLOR}
                    totalCount={filteredReportSubmitted.length}
                    page={pageReportSubmitted}
                    rowsPerPage={rowsPerPageReportSubmitted}
                    onPageChange={handleChangePageReportSubmitted}
                    onRowsPerPageChange={handleChangeRowsPerPageReportSubmitted}
                    onViewPDF={handleViewPDF}
                    onUnlockedReportClick={handleUnlockedReportClick}
                    isMobile={isMobile}
                />
            </Section>

            {/* Stage 3: Holding Reports */}
            <Section
                title="Stage 3: Holding"
                color={ORANGE_COLOR}
                count={filteredHoldingReports.length}
                selectedCount={selectedHolding.size}
                additionalActions={
                    <Box sx={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: 1,
                        width: isMobile ? '100%' : 'auto',
                        mt: isMobile ? 1 : 0
                    }}>
                        <SearchInput
                            value={searchHolding}
                            onChange={setSearchHolding}
                            placeholder="Search holding..."
                            fullWidth={isMobile}
                        />
                        {isMobile && selectedHolding.size > 0 && (
                            <OutlineButton
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => handleSoftDelete(selectedHolding, 'Holding')}
                                startIcon={<Trash2 size={14} />}
                            >
                                Move to Bin ({selectedHolding.size})
                            </OutlineButton>
                        )}
                    </Box>
                }
                showDeleteButton={!isMobile && selectedHolding.size > 0}
                onDeleteAction={() => handleSoftDelete(selectedHolding, 'Holding')}
                isMobile={isMobile}
            >
                <HoldingTable
                    items={holdingPageItems}
                    selected={selectedHolding}
                    onToggleSelect={(id) => toggleSelection(setSelectedHolding, id)}
                    onToggleAll={() => setSelectedHolding(toggleAllSelection(filteredHoldingReports, holdingPageItems, selectedHolding))}
                    onLockedClick={(id, itemData) => handleLockedClick(id, 'holding', itemData)}
                    onDiscardClick={(id, itemData) => handleDiscardClick(id, 'holding', itemData)}
                    color={ORANGE_COLOR}
                    totalCount={filteredHoldingReports.length}
                    page={pageHolding}
                    rowsPerPage={rowsPerPageHolding}
                    onPageChange={handleChangePageHolding}
                    onRowsPerPageChange={handleChangeRowsPerPageHolding}
                    onViewPDF={handleViewPDF}
                    onUnlockedReportClick={handleUnlockedReportClick}
                    isMobile={isMobile}
                />
            </Section>

            {/* Stage 4: Finalized Reports */}
            <Section
                title="Stage 4: Finalized"
                color={GREEN_COLOR}
                count={filteredFinalizedReports.length}
                selectedCount={selectedFinalized.size}
                additionalActions={
                    <Box sx={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: 1,
                        width: isMobile ? '100%' : 'auto',
                        mt: isMobile ? 1 : 0
                    }}>
                        <SearchInput
                            value={searchFinalized}
                            onChange={setSearchFinalized}
                            placeholder="Search finalized..."
                            fullWidth={isMobile}
                        />
                        {isMobile && selectedFinalized.size > 0 && (
                            <OutlineButton
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => handleSoftDelete(selectedFinalized, 'Finalized')}
                                startIcon={<Trash2 size={14} />}
                            >
                                Move to Bin ({selectedFinalized.size})
                            </OutlineButton>
                        )}
                    </Box>
                }
                showDeleteButton={!isMobile && selectedFinalized.size > 0}
                onDeleteAction={() => handleSoftDelete(selectedFinalized, 'Finalized')}
                isMobile={isMobile}
            >
                <FinalizedTable
                    items={finalizedPageItems}
                    selected={selectedFinalized}
                    onToggleSelect={(id) => toggleSelection(setSelectedFinalized, id)}
                    onToggleAll={() => setSelectedFinalized(toggleAllSelection(filteredFinalizedReports, finalizedPageItems, selectedFinalized))}
                    color={GREEN_COLOR}
                    totalCount={filteredFinalizedReports.length}
                    page={pageFinalized}
                    rowsPerPage={rowsPerPageFinalized}
                    onPageChange={handleChangePageFinalized}
                    onRowsPerPageChange={handleChangeRowsPerPageFinalized}
                    isMobile={isMobile}
                />
            </Section>

            {/* PDF Viewer Modal */}
            <PDFViewerModal
                open={pdfViewerOpen}
                onClose={() => setPdfViewerOpen(false)}
                pdfUrl={currentPdfUrl}
            />

            {/* Recycle Bin Modal - Using the reusable component */}
            <RmeRecycleBinModal
                open={recycleBinModalOpen}
                onClose={() => setRecycleBinModalOpen(false)}
                // Data props
                recycleBinItems={deletedWorkOrders}
                isRecycleBinLoading={false}
                recycleBinSearch={recycleBinSearch}
                setRecycleBinSearch={setRecycleBinSearch}
                recycleBinPage={recycleBinPage}
                recycleBinRowsPerPage={recycleBinRowsPerPage}
                handleChangeRecycleBinPage={handleChangeRecycleBinPage}
                handleChangeRecycleBinRowsPerPage={handleChangeRecycleBinRowsPerPage}
                selectedRecycleBinItems={selectedRecycleBinItems}
                // Action props
                toggleRecycleBinSelection={toggleRecycleBinSelection}
                toggleAllRecycleBinSelection={toggleAllRecycleBinSelection}
                confirmBulkRestore={() => handleRestore(selectedRecycleBinItems)}
                confirmBulkPermanentDelete={() => handlePermanentDelete(selectedRecycleBinItems)}
                handleSingleRestore={handleSingleRestore}
                handleSinglePermanentDelete={handleSinglePermanentDelete}
                // State props
                restoreFromRecycleBinMutation={restoreFromRecycleBinMutation}
                permanentDeleteFromRecycleBinMutation={permanentDeleteFromRecycleBinMutation}
                bulkRestoreMutation={bulkRestoreMutation}
                bulkPermanentDeleteMutation={bulkPermanentDeleteMutation}
                // Display props
                itemType="work-order"
                timezoneOffset={getCurrentPacificTimezoneOffset()}
                isMobile={isMobile}
                isSmallMobile={isSmallMobile}
            />

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
                                Items can be restored from recycle bin
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
                        Are you sure you want to move <strong>{selectedForDeletion.size} item(s)</strong> from the <strong>{deletionSection}</strong> section to recycle bin?
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
                                Items moved to recycle bin can be restored later. Permanent deletion is only available in the recycle bin.
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
                        startIcon={<Trash2 size={16} />}
                        disabled={bulkSoftDeleteMutation.isPending}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            px: 2,
                            bgcolor: ORANGE_COLOR,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: alpha(ORANGE_COLOR, 0.9),
                                boxShadow: 'none',
                            },
                        }}
                    >
                        {bulkSoftDeleteMutation.isPending ? 'Moving...' : 'Move to Recycle Bin'}
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
                        Are you sure you want to restore <strong>{selectedForRestore.size} item(s)</strong> from recycle bin?
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
                        onClick={executeRestore}
                        variant="contained"
                        color="success"
                        startIcon={<RotateCcw size={16} />}
                        disabled={bulkRestoreMutation.isPending}
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
                        border: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                    }
                }}
            >
                <DialogTitle sx={{
                    borderBottom: `1px solid ${alpha(RED_COLOR, 0.1)}`,
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
                            backgroundColor: alpha(RED_COLOR, 0.1),
                            color: RED_COLOR,
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
                                Permanent Delete
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 400,
                            }}>
                                Permanently delete items from recycle bin
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
                        Are you sure you want to permanently delete <strong>{selectedForPermanentDeletion.size} item(s)</strong> from recycle bin?
                    </Typography>
                    <Box sx={{
                        p: 1.5,
                        borderRadius: '6px',
                        backgroundColor: alpha(RED_COLOR, 0.05),
                        border: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                    }}>
                        <AlertTriangle size={18} color={RED_COLOR} />
                        <Box>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: RED_COLOR,
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    mb: 0.5,
                                }}
                            >
                                Warning: This action cannot be undone
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                }}
                            >
                                Items will be permanently deleted and cannot be recovered.
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1.5 }}>
                    <Button
                        onClick={() => setPermanentDeleteDialogOpen(false)}
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
                        onClick={executePermanentDelete}
                        variant="contained"
                        color="error"
                        startIcon={<Trash2 size={16} />}
                        disabled={bulkPermanentDeleteMutation.isPending}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.85rem',
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
                        Are you sure you want to restore work order <strong>{selectedSingleItem?.wo_number}</strong>?
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
                        Are you sure you want to permanently delete work order <strong>{selectedSingleItem?.wo_number}</strong>?
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
                        variant='outlined'
                        color='error'
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 400,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={executeSinglePermanentDelete}
                        disabled={permanentDeleteFromRecycleBinMutation.isPending}
                        startIcon={<Trash2 size={16} />}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 400,
                        }}
                    >
                        {permanentDeleteFromRecycleBinMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Locked Confirmation Modal */}
            <Dialog
                open={lockedConfirmModal.open}
                onClose={() => setLockedConfirmModal({ ...lockedConfirmModal, open: false })}
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
                            <img
                                src={locked}
                                alt="locked"
                                style={{
                                    width: '18px',
                                    height: '18px',
                                }}
                            />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                lineHeight: 1.2,
                            }}>
                                Confirm Lock Action
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 400,
                            }}>
                                Lock report and move to Finalized
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
                        Are you sure you want to lock this report and move it to Finalized?
                    </Typography>
                    {lockedConfirmModal.itemData && (
                        <Box sx={{
                            p: 1.5,
                            borderRadius: '6px',
                            backgroundColor: alpha(GREEN_COLOR, 0.05),
                            border: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                            mb: 2,
                        }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    mb: 0.5,
                                }}
                            >
                                {lockedConfirmModal.itemData.street}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: GRAY_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                }}
                            >
                                {lockedConfirmModal.itemData.city}, {lockedConfirmModal.itemData.state} {lockedConfirmModal.itemData.zip}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1.5 }}>
                    <Button
                        onClick={() => setLockedConfirmModal({ ...lockedConfirmModal, open: false })}
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
                        onClick={confirmLockedAction}
                        variant="contained"
                        color="success"
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
                        Lock Report
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Discard Confirmation Modal */}
            <Dialog
                open={discardConfirmModal.open}
                onClose={() => setDiscardConfirmModal({ ...discardConfirmModal, open: false })}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'white',
                        borderRadius: '6px',
                        border: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                    }
                }}
            >
                <DialogTitle sx={{
                    borderBottom: `1px solid ${alpha(RED_COLOR, 0.1)}`,
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
                            backgroundColor: alpha(RED_COLOR, 0.1),
                            color: RED_COLOR,
                        }}>
                            <img
                                src={discard}
                                alt="discard"
                                style={{
                                    width: '18px',
                                    height: '18px',
                                }}
                            />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                lineHeight: 1.2,
                            }}>
                                Confirm Discard Action
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 400,
                            }}>
                                Discard report and move to Finalized as "DELETED"
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
                        Are you sure you want to discard this report and mark it as "DELETED"?
                    </Typography>
                    {discardConfirmModal.itemData && (
                        <Box sx={{
                            p: 1.5,
                            borderRadius: '6px',
                            backgroundColor: alpha(RED_COLOR, 0.05),
                            border: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                            mb: 2,
                        }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    mb: 0.5,
                                }}
                            >
                                {discardConfirmModal.itemData.street}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: GRAY_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                }}
                            >
                                {discardConfirmModal.itemData.city}, {discardConfirmModal.itemData.state} {discardConfirmModal.itemData.zip}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1.5 }}>
                    <Button
                        onClick={() => setDiscardConfirmModal({ ...discardConfirmModal, open: false })}
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
                        onClick={confirmDiscardAction}
                        variant="contained"
                        color="error"
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.85rem',
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
                        Discard Report
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
                                : snackbar.severity === 'warning'
                                    ? alpha(ORANGE_COLOR, 0.05)
                                    : alpha(BLUE_COLOR, 0.05),
                        borderLeft: `4px solid ${snackbar.severity === 'success' ? GREEN_COLOR :
                            snackbar.severity === 'error' ? RED_COLOR :
                                snackbar.severity === 'warning' ? ORANGE_COLOR : BLUE_COLOR}`,
                        '& .MuiAlert-icon': {
                            color: snackbar.severity === 'success' ? GREEN_COLOR :
                                snackbar.severity === 'error' ? RED_COLOR :
                                    snackbar.severity === 'warning' ? ORANGE_COLOR : BLUE_COLOR,
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

// Helper Components
const Section = ({
    title,
    color,
    count,
    selectedCount,
    children,
    additionalActions = null,
    showDeleteButton = false,
    onDeleteAction = null,
    isMobile,
}) => {
    return (
        <Paper
            elevation={0}
            sx={{
                mb: 4,
                borderRadius: '6px',
                overflow: 'hidden',
                border: `1px solid ${alpha(color, 0.15)}`,
                bgcolor: 'white'
            }}
        >
            <Box
                sx={{
                    p: isMobile ? 1.5 : 2,
                    bgcolor: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    borderBottom: `1px solid ${alpha(color, 0.1)}`,
                }}
            >
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: isMobile ? 1 : 0,
                    width: isMobile ? '100%' : 'auto',
                }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            sx={{
                                fontSize: isMobile ? '0.85rem' : '0.9rem',
                                color: TEXT_COLOR,
                                fontWeight: 600,
                            }}
                        >
                            {title}
                            <Chip
                                size="small"
                                label={count}
                                sx={{
                                    ml: 1,
                                    bgcolor: alpha(color, 0.08),
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
                    {!isMobile && showDeleteButton && onDeleteAction && (
                        <OutlineButton
                            size="small"
                            onClick={onDeleteAction}
                            startIcon={<Trash2 size={12} />}
                        >
                            Move to Bin ({selectedCount})
                        </OutlineButton>
                    )}
                </Box>
                {additionalActions}
            </Box>
            {children}
        </Paper>
    );
};

const SearchInput = ({ value, onChange, placeholder, fullWidth = false, sx = {} }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Box sx={{ position: 'relative', width: fullWidth || isMobile ? '100%' : 300, ...sx }}>
            <StyledTextField
                size="small"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                        fontSize: '0.8rem',
                        height: '36px',
                    },
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search size={16} color={GRAY_COLOR} />
                        </InputAdornment>
                    ),
                    endAdornment: value && (
                        <InputAdornment position="end">
                            <IconButton
                                size="small"
                                onClick={() => onChange('')}
                                edge="end"
                                sx={{ p: 0.5 }}
                            >
                                <X size={16} />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />
        </Box>
    );
};

const ReportNeededTable = ({
    items,
    selected,
    onToggleSelect,
    onToggleAll,
    color,
    totalCount,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    onViewPDF,
    onUnlockedReportClick,
    isMobile,
}) => {
    const allSelectedOnPage = items.length > 0 && items.every(item => selected.has(item.id));
    const someSelectedOnPage = items.length > 0 && items.some(item => selected.has(item.id));

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
            <Helmet>
                <title>RME Reports | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Super Admin RME Reports page" />
            </Helmet>
            <Table size="small" sx={{ minWidth: isMobile ? 1000 : 'auto' }}>
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
                        <TableCell sx={{ minWidth: 150 }}>
                            {isMobile ? 'Date/Time' : 'W.O Date & Elapsed Time'}
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                            Technician
                        </TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                            Address
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 120 }}>
                            {isMobile ? 'Report' : 'Last Report'}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                }}>
                                    <FileSpreadsheet size={32} color={alpha(TEXT_COLOR, 0.2)} />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: TEXT_COLOR,
                                            opacity: 0.6,
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                        }}
                                    >
                                        No reports needed
                                    </Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => {
                            const isSelected = selected.has(item.id);

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
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box>
                                            <Typography variant="body2" sx={{
                                                fontWeight: 500,
                                                color: TEXT_COLOR,
                                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                            }}>
                                                {item.date}
                                            </Typography>
                                            <Typography variant="caption" sx={{
                                                color: item.elapsedColor,
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                fontSize: isMobile ? '0.75rem' : '0.8rem',
                                            }}>
                                                <Timer size={12} />
                                                {item.elapsedTime}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: TEXT_COLOR,
                                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                fontWeight: 400,
                                            }}
                                        >
                                            {item.technician}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography variant="body2" sx={{
                                            fontWeight: 500,
                                            fontSize: isMobile ? '0.8rem' : '0.85rem',
                                            wordBreak: 'break-word',
                                            overflowWrap: 'break-word',
                                        }}>
                                            {item.street}
                                        </Typography>
                                        <Typography variant="caption" sx={{
                                            color: GRAY_COLOR,
                                            fontSize: isMobile ? '0.75rem' : '0.8rem',
                                            wordBreak: 'break-word',
                                            overflowWrap: 'break-word',
                                        }}>
                                            {item.city}, {item.state} {item.zip}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                        {item.lastReport ? (
                                            <Tooltip title="View Last Locked Report">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onViewPDF(item.lastReportLink)}
                                                    sx={{
                                                        color: BLUE_COLOR,
                                                        '&:hover': {
                                                            backgroundColor: alpha(BLUE_COLOR, 0.1),
                                                        },
                                                    }}
                                                >
                                                    <img
                                                        src={report}
                                                        alt="view-report"
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                        }}
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Typography variant="caption" sx={{
                                                color: GRAY_COLOR,
                                                fontSize: isMobile ? '0.75rem' : '0.8rem',
                                            }}>
                                                —
                                            </Typography>
                                        )}
                                    </TableCell>
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

const ReportSubmittedTable = ({
    items,
    selected,
    onToggleSelect,
    onToggleAll,
    onLockedClick,
    waitToLockAction,
    onWaitToLockToggle,
    onDiscardClick,
    waitToLockDetails,
    onWaitToLockReasonChange,
    onWaitToLockNotesChange,
    onSaveChanges,
    waitToLockActionSize,
    color,
    totalCount,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    onViewPDF,
    onUnlockedReportClick,
    isMobile,
}) => {
    const allSelectedOnPage = items.length > 0 && items.every(item => selected.has(item.id));
    const someSelectedOnPage = items.length > 0 && items.some(item => selected.has(item.id));

    return (
        <>
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
                <Table size="small" sx={{ minWidth: isMobile ? 1200 : 'auto' }}>
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
                            <TableCell sx={{ minWidth: 150 }}>
                                {isMobile ? 'Date/Time' : 'W.O Date & Elapsed Time'}
                            </TableCell>
                            <TableCell sx={{ minWidth: 120 }}>
                                Technician
                            </TableCell>
                            <TableCell sx={{ minWidth: 180 }}>
                                Address
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 120 }}>
                                {isMobile ? 'Report' : 'Last Report'}
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 120 }}>
                                {isMobile ? 'Unlocked' : 'Unlocked Report'}
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                {isMobile ? 'Lock' : 'LOCKED'}
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 100 }}>
                                {isMobile ? 'Wait' : 'Wait To Lock'}
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                {isMobile ? 'Discard' : 'DISCARD'}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}>
                                        <FileSpreadsheet size={32} color={alpha(TEXT_COLOR, 0.2)} />
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: TEXT_COLOR,
                                                opacity: 0.6,
                                                fontSize: '0.85rem',
                                                fontWeight: 500,
                                            }}
                                        >
                                            No reports submitted
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => {
                                const isSelected = selected.has(item.id);
                                const isWaitToLock = waitToLockAction.has(item.id);
                                const details = waitToLockDetails[item.id] || { reason: '', notes: '' };

                                return (
                                    <React.Fragment key={item.id}>
                                        <TableRow
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
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Box>
                                                    <Typography variant="body2" sx={{
                                                        fontWeight: 500,
                                                        color: TEXT_COLOR,
                                                        fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                    }}>
                                                        {item.date}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{
                                                        color: item.elapsedColor,
                                                        fontWeight: 600,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        fontSize: isMobile ? '0.75rem' : '0.8rem',
                                                    }}>
                                                        <Timer size={12} />
                                                        {item.elapsedTime}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: TEXT_COLOR,
                                                        fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                        fontWeight: 400,
                                                    }}
                                                >
                                                    {item.technician}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Typography variant="body2" sx={{
                                                    fontWeight: 500,
                                                    fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'break-word',
                                                }}>
                                                    {item.street}
                                                </Typography>
                                                <Typography variant="caption" sx={{
                                                    color: GRAY_COLOR,
                                                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'break-word',
                                                }}>
                                                    {item.city}, {item.state} {item.zip}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                {item.lastReport ? (
                                                    <Tooltip title="View Last Locked Report">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => onViewPDF(item.lastReportLink)}
                                                            sx={{
                                                                color: BLUE_COLOR,
                                                                '&:hover': {
                                                                    backgroundColor: alpha(BLUE_COLOR, 0.1),
                                                                },
                                                            }}
                                                        >
                                                            <img
                                                                src={report}
                                                                alt="view-report"
                                                                style={{
                                                                    width: '20px',
                                                                    height: '20px',
                                                                }}
                                                            />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <Typography variant="caption" sx={{
                                                        color: GRAY_COLOR,
                                                        fontSize: isMobile ? '0.75rem' : '0.8rem',
                                                    }}>
                                                        —
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                {item.unlockedReport ? (
                                                    <Tooltip title="Open Unlocked Report in New Tab">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => onUnlockedReportClick(item.unlockedReportLink)}
                                                            sx={{
                                                                color: ORANGE_COLOR,
                                                                '&:hover': {
                                                                    backgroundColor: alpha(ORANGE_COLOR, 0.1),
                                                                },
                                                            }}
                                                        >
                                                            <img
                                                                src={pen}
                                                                alt="view-report"
                                                                style={{
                                                                    width: '20px',
                                                                    height: '20px',
                                                                }}
                                                            />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <Typography variant="caption" sx={{
                                                        color: GRAY_COLOR,
                                                        fontSize: isMobile ? '0.75rem' : '0.8rem',
                                                    }}>
                                                        —
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Tooltip title="Click to lock this report">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => onLockedClick(item.id, item)}
                                                        disabled={isWaitToLock}
                                                        sx={{
                                                            padding: '6px',
                                                            '&:hover': {
                                                                backgroundColor: alpha(GREEN_COLOR, 0.1),
                                                            },
                                                        }}
                                                    >
                                                        <img
                                                            src={locked}
                                                            alt="locked"
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                            }}
                                                        />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Tooltip title="Wait to Lock - Requires Save Changes">
                                                    <Checkbox
                                                        size="small"
                                                        checked={isWaitToLock}
                                                        onChange={() => onWaitToLockToggle(item.id)}
                                                        sx={{
                                                            padding: '6px',
                                                            color: color,
                                                            '&.Mui-checked': {
                                                                color: color,
                                                            },
                                                        }}
                                                    />
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Tooltip title="Click to discard this report">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => onDiscardClick(item.id, item)}
                                                        disabled={isWaitToLock}
                                                        sx={{
                                                            padding: '6px',
                                                            '&:hover': {
                                                                backgroundColor: alpha(RED_COLOR, 0.1),
                                                            },
                                                        }}
                                                    >
                                                        <img
                                                            src={discard}
                                                            alt="discard"
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                            }}
                                                        />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>

                                        {/* Wait to Lock Details Row */}
                                        {isWaitToLock && (
                                            <TableRow sx={{ bgcolor: alpha(CYAN_COLOR, 0.05) }}>
                                                <TableCell colSpan={9} sx={{ p: 2 }}>
                                                    <Box sx={{ pl: 6 }}>
                                                        <Typography variant="caption" sx={{
                                                            fontWeight: 600,
                                                            display: 'block',
                                                            mb: 1,
                                                            color: CYAN_COLOR,
                                                            fontSize: isMobile ? '0.75rem' : '0.6rem',
                                                        }}>
                                                            Additional Information Required:
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 2,
                                                            alignItems: 'flex-start',
                                                            flexDirection: isMobile ? 'column' : 'row',
                                                        }}>
                                                            <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 200, fontSize: { xs: '0.7rem', md: '0.8rem' } }}>
                                                                <InputLabel sx={{ fontSize: { xs: '0.7rem', md: '0.9rem' } }}>Reason in Holding</InputLabel>
                                                                <Select
                                                                    value={details.reason}
                                                                    onChange={(e) => onWaitToLockReasonChange(item.id, e.target.value)}
                                                                    label="Reason in Holding"
                                                                >
                                                                    <MenuItem sx={{ fontSize: { xs: '0.7rem', md: '0.8rem' } }} value="Additional Reports Needed">Additional Reports Needed</MenuItem>
                                                                    <MenuItem sx={{ fontSize: { xs: '0.7rem', md: '0.8rem' } }} value="Verifying Information">Verifying Information</MenuItem>
                                                                    <MenuItem sx={{ fontSize: { xs: '0.7rem', md: '0.8rem' } }} value="Pending Supervisor Review">Pending Supervisor Review</MenuItem>
                                                                    <MenuItem sx={{ fontSize: { xs: '0.7rem', md: '0.8rem' } }} value="Customer Follow-up Required">Customer Follow-up Required</MenuItem>
                                                                    <MenuItem sx={{ fontSize: { xs: '0.7rem', md: '0.8rem' } }} value="Technical Issue">Technical Issue</MenuItem>
                                                                    <MenuItem sx={{ fontSize: { xs: '0.7rem', md: '0.8rem' } }} value="Other">Other</MenuItem>
                                                                </Select>
                                                            </FormControl>
                                                            <StyledTextField
                                                                size="small"
                                                                multiline
                                                                rows={2}
                                                                label="Notes"
                                                                value={details.notes}
                                                                onChange={(e) => onWaitToLockNotesChange(item.id, e.target.value)}
                                                                placeholder="Enter specific details about why the RME will not be locked today..."
                                                                sx={{ flex: 1, width: isMobile ? '100%' : 'auto' }}
                                                            />
                                                            <Button
                                                                variant="contained"
                                                                color="warning"
                                                                size="small"
                                                                onClick={onSaveChanges}
                                                                disabled={waitToLockActionSize === 0}
                                                                startIcon={<Save size={14} />}
                                                                sx={{
                                                                    textTransform: 'none',
                                                                    fontSize: '0.75rem',
                                                                    height: '36px',
                                                                    bgcolor: ORANGE_COLOR,
                                                                    '&:hover': {
                                                                        bgcolor: alpha(ORANGE_COLOR, 0.9),
                                                                    },
                                                                }}
                                                            >
                                                                Save Wait to Lock
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        )
                                        }
                                    </React.Fragment>
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
            </TableContainer >
        </>
    );
};

const HoldingTable = ({
    items,
    selected,
    onToggleSelect,
    onToggleAll,
    onLockedClick,
    onDiscardClick,
    color,
    totalCount,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    onViewPDF,
    onUnlockedReportClick,
    isMobile,
}) => {
    const allSelectedOnPage = items.length > 0 && items.every(item => selected.has(item.id));
    const someSelectedOnPage = items.length > 0 && items.some(item => selected.has(item.id));

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
            <Table size="small" sx={{ minWidth: isMobile ? 1200 : 'auto' }}>
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
                        <TableCell sx={{ minWidth: 150 }}>
                            {isMobile ? 'Date/Time' : 'W.O Date & Elapsed Time'}
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                            Technician
                        </TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                            Address
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 120 }}>
                            {isMobile ? 'Prior Report' : 'Prior Locked Report'}
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 120 }}>
                            {isMobile ? 'Unlocked' : 'Unlocked Report'}
                        </TableCell>
                        <TableCell sx={{ minWidth: 200 }}>
                            {isMobile ? 'Reason & Notes' : 'Reason in Holding & Notes'}
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 80 }}>
                            {isMobile ? 'Lock' : 'LOCKED'}
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 80 }}>
                            {isMobile ? 'Discard' : 'DISCARD'}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                }}>
                                    <AlertOctagon size={32} color={alpha(TEXT_COLOR, 0.2)} />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: TEXT_COLOR,
                                            opacity: 0.6,
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                        }}
                                    >
                                        No holding reports
                                    </Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => {
                            const isSelected = selected.has(item.id);

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
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box>
                                            <Typography variant="body2" sx={{
                                                fontWeight: 500,
                                                color: TEXT_COLOR,
                                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                            }}>
                                                {item.date}
                                            </Typography>
                                            <Typography variant="caption" sx={{
                                                color: item.elapsedColor,
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                fontSize: isMobile ? '0.75rem' : '0.8rem',
                                            }}>
                                                <Clock size={12} />
                                                {item.elapsedTime}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: TEXT_COLOR,
                                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                fontWeight: 400,
                                            }}
                                        >
                                            {item.technician}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography variant="body2" sx={{
                                            fontWeight: 500,
                                            fontSize: isMobile ? '0.8rem' : '0.85rem',
                                            wordBreak: 'break-word',
                                            overflowWrap: 'break-word',
                                        }}>
                                            {item.street}
                                        </Typography>
                                        <Typography variant="caption" sx={{
                                            color: GRAY_COLOR,
                                            fontSize: isMobile ? '0.75rem' : '0.8rem',
                                            wordBreak: 'break-word',
                                            overflowWrap: 'break-word',
                                        }}>
                                            {item.city}, {item.state} {item.zip}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                        {item.priorLockedReport ? (
                                            <Tooltip title="View Prior Locked Report">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onViewPDF(item.lastReportLink)}
                                                    sx={{
                                                        color: BLUE_COLOR,
                                                        '&:hover': {
                                                            backgroundColor: alpha(BLUE_COLOR, 0.1),
                                                        },
                                                    }}
                                                >
                                                    <img
                                                        src={report}
                                                        alt="view-report"
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                        }}
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Typography variant="caption" sx={{
                                                color: GRAY_COLOR,
                                                fontSize: isMobile ? '0.75rem' : '0.8rem',
                                            }}>
                                                —
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                        {item.unlockedReportLink ? (
                                            <Tooltip title="Open Unlocked Report in New Tab">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onUnlockedReportClick(item.unlockedReportLink)}
                                                    sx={{
                                                        color: ORANGE_COLOR,
                                                        '&:hover': {
                                                            backgroundColor: alpha(ORANGE_COLOR, 0.1),
                                                        },
                                                    }}
                                                >
                                                    <img
                                                        src={pen}
                                                        alt="view-report"
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                        }}
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Typography variant="caption" sx={{
                                                color: GRAY_COLOR,
                                                fontSize: isMobile ? '0.75rem' : '0.8rem',
                                            }}>
                                                —
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            <Chip
                                                label={item.reason}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha(color, 0.1),
                                                    color: color,
                                                    fontWeight: 500,
                                                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                                                    alignSelf: 'flex-start',
                                                }}
                                            />
                                            {item.notes && (
                                                <Typography variant="caption" sx={{
                                                    color: TEXT_COLOR,
                                                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                                                    lineHeight: 1.2,
                                                    whiteSpace: 'normal',
                                                    wordBreak: 'break-word',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {item.notes}
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                        <Tooltip title="Click to lock this report">
                                            <IconButton
                                                size="small"
                                                onClick={() => onLockedClick(item.id, item)}
                                                sx={{
                                                    padding: '6px',
                                                    '&:hover': {
                                                        backgroundColor: alpha(GREEN_COLOR, 0.1),
                                                    },
                                                }}
                                            >
                                                <img
                                                    src={locked}
                                                    alt="locked"
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                    }}
                                                />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                        <Tooltip title="Click to discard this report">
                                            <IconButton
                                                size="small"
                                                onClick={() => onDiscardClick(item.id, item)}
                                                sx={{
                                                    padding: '6px',
                                                    '&:hover': {
                                                        backgroundColor: alpha(RED_COLOR, 0.1),
                                                    },
                                                }}
                                            >
                                                <img
                                                    src={discard}
                                                    alt="discard"
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                    }}
                                                />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
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

const FinalizedTable = ({
    items,
    selected,
    onToggleSelect,
    onToggleAll,
    color,
    totalCount,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    isMobile,
}) => {
    const allSelectedOnPage = items.length > 0 && items.every(item => selected.has(item.id));
    const someSelectedOnPage = items.length > 0 && items.some(item => selected.has(item.id));

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
            <Table size="small" sx={{ minWidth: isMobile ? 1000 : 'auto' }}>
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
                        <TableCell sx={{ minWidth: 120 }}>
                            Status
                        </TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                            Address
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                            Date
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                            {isMobile ? 'Manager' : 'By Manager'}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                }}>
                                    <CheckCircle size={32} color={alpha(TEXT_COLOR, 0.2)} />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: TEXT_COLOR,
                                            opacity: 0.6,
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                        }}
                                    >
                                        No finalized reports
                                    </Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => {
                            const isSelected = selected.has(item.id);

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
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Chip
                                            label={item.status}
                                            size="small"
                                            sx={{
                                                bgcolor: alpha(item.statusColor, 0.1),
                                                color: item.statusColor,
                                                fontWeight: 600,
                                                fontSize: isMobile ? '0.7rem' : '0.75rem',
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box>
                                            <Typography variant="body2" sx={{
                                                fontWeight: 500,
                                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word',
                                            }}>
                                                {item.street}
                                            </Typography>
                                            <Typography variant="caption" sx={{
                                                color: GRAY_COLOR,
                                                fontSize: isMobile ? '0.75rem' : '0.8rem',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word',
                                            }}>
                                                {item.city}, {item.state} {item.zip}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography variant="body2" sx={{
                                            fontWeight: 500,
                                            fontSize: isMobile ? '0.8rem' : '0.85rem',
                                        }}>
                                            {formatDate(item.actionTime)}
                                        </Typography>
                                        <Typography variant="caption" sx={{
                                            color: GRAY_COLOR,
                                            fontSize: isMobile ? '0.75rem' : '0.8rem',
                                        }}>
                                            {formatTime(item.actionTime)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box>
                                            <Typography variant="body2" sx={{
                                                fontWeight: 500,
                                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                            }}>
                                                {item.by}
                                            </Typography>
                                            <Typography variant="caption" sx={{
                                                color: GRAY_COLOR,
                                                fontSize: isMobile ? '0.75rem' : '0.8rem',
                                            }}>
                                                {item.byEmail}
                                            </Typography>
                                        </Box>
                                    </TableCell>
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

export default RMEReports;