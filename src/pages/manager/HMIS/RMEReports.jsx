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
    Modal,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import axiosInstance from '../../../api/axios';
import { useAuth } from '../../../auth/AuthProvider';
import { format as formatTZ, toZonedTime } from 'date-fns-tz';
import pen from '../../../public/icons/Edit.gif';
import report from '../../../public/icons/report.gif';
import locked from '../../../public/icons/locked.gif';
import discard from '../../../public/icons/btnDel.gif';

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

const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const ORANGE_COLOR = '#ed6c02';
const GRAY_COLOR = '#6b7280';
const PURPLE_COLOR = '#8b5cf6';
const CYAN_COLOR  = '#06b6d4';

// Define the timezone for Pierce County, WA, USA (GMT-8)
const TIMEZONE = 'America/Los_Angeles'; // Pacific Time (GMT-8)

// Helper function to convert date to Pacific Time
const toPacificTime = (dateString) => {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        return toZonedTime(date, TIMEZONE);
    } catch (e) {
        console.error('Error converting to Pacific Time:', e);
        return null;
    }
};

const formatDate = (dateString) => {
    const date = toPacificTime(dateString);
    if (!date) return '—';
    return formatTZ(date, 'MMM dd, yyyy', { timeZone: TIMEZONE });
};

const formatTime = (dateString) => {
    const date = toPacificTime(dateString);
    if (!date) return '—';
    return formatTZ(date, 'h:mm a', { timeZone: TIMEZONE });
};

const formatDateTime = (dateString) => {
    const date = toPacificTime(dateString);
    if (!date) return '—';
    return formatTZ(date, 'MMM dd, yyyy h:mm a', { timeZone: TIMEZONE });
};

const calculateElapsedTime = (createdDate) => {
    if (!createdDate) return '—';
    try {
        const now = toZonedTime(new Date(), TIMEZONE);
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
        return '—';
    }
};

const getElapsedColor = (createdDate) => {
    if (!createdDate) return GRAY_COLOR;
    try {
        const now = toZonedTime(new Date(), TIMEZONE);
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

// PDF Viewer Modal Component
const PDFViewerModal = ({ open, onClose, pdfUrl }) => {
    return (
        <Modal
            open={open}
            onClose={onClose}
            aria-labelledby="pdf-viewer-modal"
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Box sx={{
                width: '90%',
                height: '90%',
                maxWidth: 1200,
                bgcolor: 'white',
                borderRadius: '8px',
                boxShadow: 24,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <Box sx={{
                    p: 2,
                    borderBottom: `1px solid ${alpha(BLUE_COLOR, 0.1)}`,
                    bgcolor: alpha(BLUE_COLOR, 0.03),
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
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
                </Box>

                <Box sx={{ flex: 1, p: 2 }}>
                    {pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                borderRadius: '4px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
                        }}>
                            <FileText size={48} color={alpha(GRAY_COLOR, 0.3)} />
                            <Typography variant="body2" sx={{
                                mt: 2,
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
                </Box>
            </Box>
        </Modal>
    );
};

const RMEReports = () => {
    const queryClient = useQueryClient();
    const { user: authUser } = useAuth();

    // State for each table's selection
    const [selectedReportNeeded, setSelectedReportNeeded] = useState(new Set());
    const [selectedReportSubmitted, setSelectedReportSubmitted] = useState(new Set());
    const [selectedHolding, setSelectedHolding] = useState(new Set());
    const [selectedFinalized, setSelectedFinalized] = useState(new Set());

    // State for actions checkboxes in report submitted table
    const [lockedAction, setLockedAction] = useState(new Set());
    const [waitToLockAction, setWaitToLockAction] = useState(new Set());
    const [deleteAction, setDeleteAction] = useState(new Set());

    // State for action details (for wait to lock)
    const [waitToLockDetails, setWaitToLockDetails] = useState({});

    // State for actions checkboxes in stage 2
    const [holdingLockedAction, setHoldingLockedAction] = useState(new Set());
    const [holdingDeleteAction, setHoldingDeleteAction] = useState(new Set());

    // Pagination for each table
    const [pageReportNeeded, setPageReportNeeded] = useState(0);
    const [rowsPerPageReportNeeded, setRowsPerPageReportNeeded] = useState(10);
    const [pageReportSubmitted, setPageReportSubmitted] = useState(0);
    const [rowsPerPageReportSubmitted, setRowsPerPageReportSubmitted] = useState(10);
    const [pageHolding, setPageHolding] = useState(0);
    const [rowsPerPageHolding, setRowsPerPageHolding] = useState(10);
    const [pageFinalized, setPageFinalized] = useState(0);
    const [rowsPerPageFinalized, setRowsPerPageFinalized] = useState(10);

    // Search states
    const [searchReportNeeded, setSearchReportNeeded] = useState('');
    const [searchReportSubmitted, setSearchReportSubmitted] = useState('');
    const [searchHolding, setSearchHolding] = useState('');
    const [searchFinalized, setSearchFinalized] = useState('');

    // History modal states
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [historyPage, setHistoryPage] = useState(0);
    const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
    const [selectedHistoryItems, setSelectedHistoryItems] = useState(new Set());

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
        section: null, // 'reportSubmitted' or 'holding'
    });

    const [discardConfirmModal, setDiscardConfirmModal] = useState({
        open: false,
        itemId: null,
        itemData: null,
        section: null, // 'reportSubmitted' or 'holding'
    });

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

    // Fetch only deleted work orders for history
    const { data: deletedWorkOrders = [] } = useQuery({
        queryKey: ['rme-deleted-work-orders'],
        queryFn: async () => {
            const res = await axiosInstance.get('/work-orders-today/');
            const allOrders = Array.isArray(res.data) ? res.data : [];
            return allOrders.filter(order => order.is_deleted);
        },
        staleTime: 30000,
    });

    // Initialize checkbox states from API data when workOrders change
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

    // Process data for different stages
    const processedData = useMemo(() => {
        const reportNeeded = [];
        const reportSubmitted = [];
        const holding = [];
        const finalized = [];

        workOrders.forEach(item => {
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
                street: item.full_address ? item.full_address.split(',')[0] || 'Unknown' : 'Unknown',
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
                finalizedBy: item.finalized_by,
                finalizedByEmail: item.finalized_by_email,
                finalizedDate: item.finalized_date,
                reportId: item.report_id,
                createdAt: item.scheduled_date,
                timeCompleted: formatTime(item.scheduled_date),
                rawData: item,
            };

            // Categorize based on status and conditions
            if (item.is_deleted) {
                // Deleted items go to history
            } else if (item.status === 'DELETED' && item.rme_completed) {
                finalized.push({
                    ...report,
                    action: 'deleted',
                    actionTime: item.finalized_date || item.updated_at || item.created_at,
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
                // Items with tech_report_submitted=true go to Report Submitted table
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

    // Handle unlocked report link click (opens in new tab)
    const handleUnlockedReportClick = (url) => {
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    // Mutations
    const bulkSoftDeleteMutation = useMutation({
        mutationFn: async (items) => {
            const promises = items.map(item =>
                axiosInstance.patch(`/work-orders-today/${item.id}/`, {
                    is_deleted: true,
                    deleted_by: currentUser.name,
                    deleted_by_email: currentUser.email,
                    deleted_date: new Date().toISOString(),
                })
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['rme-work-orders']);
            showSnackbar('Items moved to history', 'success');
        },
    });

    const permanentDeleteMutation = useMutation({
        mutationFn: async (id) => {
            const response = await axiosInstance.delete(`/work-orders-today/${id}/`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['rme-work-orders']);
            showSnackbar('Item permanently deleted', 'success');
        },
    });

    const bulkPermanentDeleteMutation = useMutation({
        mutationFn: async (items) => {
            const promises = items.map(item =>
                axiosInstance.delete(`/work-orders-today/${item.id}/`)
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['rme-work-orders']);
            showSnackbar('Items permanently deleted', 'success');
        },
    });

    const restoreMutation = useMutation({
        mutationFn: async (id) => {
            const response = await axiosInstance.patch(`/work-orders-today/${id}/`, {
                is_deleted: false,
                deleted_by: null,
                deleted_by_email: null,
                deleted_date: null,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['rme-work-orders']);
            showSnackbar('Item restored successfully', 'success');
        },
    });

    const bulkRestoreMutation = useMutation({
        mutationFn: async (items) => {
            const promises = items.map(item =>
                axiosInstance.patch(`/work-orders-today/${item.id}/`, {
                    is_deleted: false,
                    deleted_by: null,
                    deleted_by_email: null,
                    deleted_date: null,
                })
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['rme-work-orders']);
            showSnackbar('Items restored successfully', 'success');
        },
    });

    const lockReportMutation = useMutation({
        mutationFn: async ({ id, reportId }) => {
            const response = await axiosInstance.patch(`/work-orders-today/${id}/`, {
                finalized_by: currentUser.name,
                finalized_by_email: currentUser.email,
                finalized_date: new Date().toISOString(),
                rme_completed: true,
                report_id: reportId,
                tech_report_submitted: true,
                status: 'LOCKED',
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['rme-work-orders']);
        },
    });

    const waitToLockMutation = useMutation({
        mutationFn: async ({ id, reason, notes }) => {
            const response = await axiosInstance.patch(`/work-orders-today/${id}/`, {
                wait_to_lock: true,
                reason: reason,
                notes: notes,
                moved_created_by: currentUser.name,
                moved_to_holding_date: new Date().toISOString(),
                tech_report_submitted: true,
                status: 'HOLDING',
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['rme-work-orders']);
        },
    });

    const bulkLockMutation = useMutation({
        mutationFn: async (items) => {
            const promises = items.map(item =>
                axiosInstance.patch(`/work-orders-today/${item.id}/`, {
                    finalized_by: currentUser.name,
                    finalized_by_email: currentUser.email,
                    finalized_date: new Date().toISOString(),
                    rme_completed: true,
                    report_id: `RME-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    tech_report_submitted: true,
                    status: 'LOCKED',
                })
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['rme-work-orders']);
        },
    });

    const deleteReportMutation = useMutation({
        mutationFn: async ({ id }) => {
            const response = await axiosInstance.patch(`/work-orders-today/${id}/`, {
                finalized_by: currentUser.name,
                finalized_by_email: currentUser.email,
                finalized_date: new Date().toISOString(),
                rme_completed: true,
                status: 'DELETED',
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['rme-work-orders']);
        },
    });

    // Handle tech report checkbox toggle in Report Submitted table
    const handleTechReportToggle = async (id, isChecked) => {
        try {
            await axiosInstance.patch(`/work-orders-today/${id}/`, {
                tech_report_submitted: isChecked,
            });
            queryClient.invalidateQueries(['rme-work-orders']);
            showSnackbar(`Tech Report Submitted ${isChecked ? 'checked' : 'unchecked'}`, 'success');
        } catch (error) {
            console.error('Error updating tech report:', error);
            showSnackbar('Failed to update Tech Report Submitted', 'error');
        }
    };

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
        const { itemId, section, itemData } = lockedConfirmModal;
        
        try {
            if (section === 'reportSubmitted') {
                // Execute lock immediately for Report Submitted table
                await lockReportMutation.mutateAsync({
                    id: itemId,
                    reportId: `RME-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                });
                
                // Clear any related checkboxes
                const waitToLockSet = new Set(waitToLockAction);
                waitToLockSet.delete(itemId);
                setWaitToLockAction(waitToLockSet);

                const deleteSet = new Set(deleteAction);
                deleteSet.delete(itemId);
                setDeleteAction(deleteSet);

                // Clear wait to lock details
                if (waitToLockDetails[itemId]) {
                    const newDetails = { ...waitToLockDetails };
                    delete newDetails[itemId];
                    setWaitToLockDetails(newDetails);
                }

                showSnackbar('Report locked successfully', 'success');
            } else if (section === 'holding') {
                // Execute lock immediately for Holding table
                await lockReportMutation.mutateAsync({
                    id: itemId,
                    reportId: `RME-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                });
                
                // Clear any related checkboxes
                const deleteSet = new Set(holdingDeleteAction);
                deleteSet.delete(itemId);
                setHoldingDeleteAction(deleteSet);

                showSnackbar('Report locked successfully', 'success');
            }
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
        const { itemId, section, itemData } = discardConfirmModal;
        
        try {
            if (section === 'reportSubmitted') {
                // Execute delete immediately for Report Submitted table
                await deleteReportMutation.mutateAsync({ id: itemId });
                
                // Clear any related checkboxes
                const lockedSet = new Set(lockedAction);
                lockedSet.delete(itemId);
                setLockedAction(lockedSet);

                const waitToLockSet = new Set(waitToLockAction);
                waitToLockSet.delete(itemId);
                setWaitToLockAction(waitToLockSet);

                // Clear wait to lock details
                if (waitToLockDetails[itemId]) {
                    const newDetails = { ...waitToLockDetails };
                    delete newDetails[itemId];
                    setWaitToLockDetails(newDetails);
                }

                showSnackbar('Report discarded successfully', 'success');
            } else if (section === 'holding') {
                // Execute delete immediately for Holding table
                await deleteReportMutation.mutateAsync({ id: itemId });
                
                // Clear any related checkboxes
                const lockedSet = new Set(holdingLockedAction);
                lockedSet.delete(itemId);
                setHoldingLockedAction(lockedSet);

                showSnackbar('Report discarded successfully', 'success');
            }
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
            const lockedSet = new Set(lockedAction);
            lockedSet.delete(id);
            setLockedAction(lockedSet);

            const deleteSet = new Set(deleteAction);
            deleteSet.delete(id);
            setDeleteAction(deleteSet);

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

    const toggleAllSelection = (setState, items, pageItems) => {
        const allPageIds = new Set(pageItems.map(item => item.id));
        const currentSelected = new Set(setState);
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

    // Action handlers
    const handleSoftDelete = async (selectionSet, section) => {
        if (selectionSet.size === 0) return;

        const itemsToDelete = Array.from(selectionSet).map(id => {
            const item = processedData.reportNeeded.find(r => r.id === id) ||
                processedData.reportSubmitted.find(r => r.id === id) ||
                processedData.holding.find(r => r.id === id) ||
                processedData.finalized.find(r => r.id === id);
            return { id, ...item?.rawData };
        }).filter(item => item && !item.is_deleted);

        if (itemsToDelete.length === 0) {
            showSnackbar('No valid items to delete', 'warning');
            return;
        }

        try {
            await bulkSoftDeleteMutation.mutateAsync(itemsToDelete);

            setSelectedReportNeeded(new Set());
            setSelectedReportSubmitted(new Set());
            setSelectedHolding(new Set());
            setSelectedFinalized(new Set());
            setDeleteDialogOpen(false);
            setSelectedForDeletion(new Set());

        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handlePermanentDelete = async (selectionSet) => {
        if (selectionSet.size === 0) return;

        const itemsToDelete = Array.from(selectionSet).map(id => {
            const item = deletedWorkOrders.find(order => order.id.toString() === id);
            return item;
        }).filter(item => item && item.is_deleted);

        if (itemsToDelete.length === 0) {
            showSnackbar('No valid items to permanently delete', 'warning');
            return;
        }

        try {
            await bulkPermanentDeleteMutation.mutateAsync(itemsToDelete);
            setSelectedHistoryItems(new Set());
            setPermanentDeleteDialogOpen(false);
            setSelectedForPermanentDeletion(new Set());
        } catch (error) {
            console.error('Permanent delete error:', error);
        }
    };

    const handleRestore = async (selectionSet) => {
        if (selectionSet.size === 0) return;

        const itemsToRestore = Array.from(selectionSet).map(id => {
            const item = deletedWorkOrders.find(order => order.id.toString() === id);
            return item;
        }).filter(item => item && item.is_deleted);

        if (itemsToRestore.length === 0) {
            showSnackbar('No valid items to restore', 'warning');
            return;
        }

        try {
            await bulkRestoreMutation.mutateAsync(itemsToRestore);
            setSelectedHistoryItems(new Set());
            setRestoreDialogOpen(false);
            setSelectedForRestore(newSet);
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
            const hasLocked = lockedAction.has(item.id);
            const hasWaitToLock = waitToLockAction.has(item.id);
            const hasDelete = deleteAction.has(item.id);

            // Only process Wait to Lock actions (Locked and Delete are handled immediately)
            if (hasWaitToLock && !hasLocked && !hasDelete) {
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

    const historyModalPageItems = deletedWorkOrders.slice(
        historyPage * historyRowsPerPage,
        historyPage * historyRowsPerPage + historyRowsPerPage
    );

    // Loading state
    if (isLoading) {
        return (
            <DashboardLoader />
        );
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
                        Track RME reports through 4 stages: Report Needed → Report Submitted → Holding → Finalized
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Button
                        variant="outlined"
                        startIcon={<History size={16} />}
                        onClick={() => setHistoryModalOpen(true)}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: PURPLE_COLOR,
                            borderColor: alpha(PURPLE_COLOR, 0.3),
                            '&:hover': {
                                borderColor: PURPLE_COLOR,
                                backgroundColor: alpha(PURPLE_COLOR, 0.05),
                            },
                        }}
                    >
                        History ({deletedWorkOrders.length})
                    </Button>
                </Box>
            </Box>

            {/* Stage 1: Report Needed Reports */}
            <Section
                title="Stage 1: Report Needed"
                color={BLUE_COLOR}
                count={filteredReportNeeded.length}
                selectedCount={selectedReportNeeded.size}
                onDelete={() => {
                    setSelectedForDeletion(selectedReportNeeded);
                    setDeletionSection('Report Needed');
                    setDeleteDialogOpen(true);
                }}
                icon={<FileSpreadsheet size={20} />}
                subtitle="New reports awaiting verification"
                additionalActions={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <SearchInput
                            value={searchReportNeeded}
                            onChange={setSearchReportNeeded}
                            placeholder="Search report needed..."
                        />
                    </Stack>
                }
            >
                <ReportNeededTable
                    items={reportNeededPageItems}
                    selected={selectedReportNeeded}
                    onToggleSelect={(id) => toggleSelection(setSelectedReportNeeded, id)}
                    onToggleAll={() => setSelectedReportNeeded(toggleAllSelection(selectedReportNeeded, filteredReportNeeded, reportNeededPageItems))}
                    color={BLUE_COLOR}
                    totalCount={filteredReportNeeded.length}
                    page={pageReportNeeded}
                    rowsPerPage={rowsPerPageReportNeeded}
                    onPageChange={handleChangePageReportNeeded}
                    onRowsPerPageChange={handleChangeRowsPerPageReportNeeded}
                    onViewPDF={handleViewPDF}
                    onUnlockedReportClick={handleUnlockedReportClick}
                />
            </Section>

            {/* Report Submitted Table */}
            <Section
                title="Stage 2: Report Submitted"
                color={CYAN_COLOR}
                count={filteredReportSubmitted.length}
                selectedCount={selectedReportSubmitted.size}
                onDelete={() => {
                    setSelectedForDeletion(selectedReportSubmitted);
                    setDeletionSection('Report Submitted');
                    setDeleteDialogOpen(true);
                }}
                icon={<AlertOctagon size={20} />}
                subtitle="Reports ready for processing"
                additionalActions={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <SearchInput
                            value={searchReportSubmitted}
                            onChange={setSearchReportSubmitted}
                            placeholder="Search report submitted..."
                        />
                        <Button
                            variant="contained"
                            color="warning"
                            size="small"
                            onClick={handleSaveReportSubmittedChanges}
                            startIcon={<Save size={14} />}
                            disabled={waitToLockAction.size === 0}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                height: '30px',
                                px: 1.5,
                                bgcolor: ORANGE_COLOR,
                                '&:hover': {
                                    bgcolor: alpha(ORANGE_COLOR, 0.9),
                                },
                            }}
                        >
                            Save Changes
                        </Button>
                    </Stack>
                }
            >
                <ReportSubmittedTable
                    items={reportSubmittedPageItems}
                    selected={selectedReportSubmitted}
                    onToggleSelect={(id) => toggleSelection(setSelectedReportSubmitted, id)}
                    onToggleAll={() => setSelectedReportSubmitted(toggleAllSelection(selectedReportSubmitted, filteredReportSubmitted, reportSubmittedPageItems))}
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
                />
            </Section>

            {/* Stage 3: Holding Reports */}
            <Section
                title="Stage 3: Holding"
                color={ORANGE_COLOR}
                count={filteredHoldingReports.length}
                selectedCount={selectedHolding.size}
                onDelete={() => {
                    setSelectedForDeletion(selectedHolding);
                    setDeletionSection('Holding');
                    setDeleteDialogOpen(true);
                }}
                icon={<AlertOctagon size={20} />}
                subtitle="Reports on hold pending additional information"
                additionalActions={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <SearchInput
                            value={searchHolding}
                            onChange={setSearchHolding}
                            placeholder="Search holding..."
                        />
                    </Stack>
                }
            >
                <HoldingTable
                    items={holdingPageItems}
                    selected={selectedHolding}
                    onToggleSelect={(id) => toggleSelection(setSelectedHolding, id)}
                    onToggleAll={() => setSelectedHolding(toggleAllSelection(selectedHolding, filteredHoldingReports, holdingPageItems))}
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
                />
            </Section>

            {/* Stage 4: Finalized Reports */}
            <Section
                title="Stage 4: Finalized"
                color={GREEN_COLOR}
                count={filteredFinalizedReports.length}
                selectedCount={selectedFinalized.size}
                onDelete={() => {
                    setSelectedForDeletion(selectedFinalized);
                    setDeletionSection('Finalized');
                    setDeleteDialogOpen(true);
                }}
                icon={<CheckCircle size={20} />}
                subtitle="Completed reports"
                additionalActions={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <SearchInput
                            value={searchFinalized}
                            onChange={setSearchFinalized}
                            placeholder="Search finalized..."
                        />
                    </Stack>
                }
            >
                <FinalizedTable
                    items={finalizedPageItems}
                    selected={selectedFinalized}
                    onToggleSelect={(id) => toggleSelection(setSelectedFinalized, id)}
                    onToggleAll={() => setSelectedFinalized(toggleAllSelection(selectedFinalized, filteredFinalizedReports, finalizedPageItems))}
                    color={GREEN_COLOR}
                    totalCount={filteredFinalizedReports.length}
                    page={pageFinalized}
                    rowsPerPage={rowsPerPageFinalized}
                    onPageChange={handleChangePageFinalized}
                    onRowsPerPageChange={handleChangeRowsPerPageFinalized}
                />
            </Section>

            {/* PDF Viewer Modal */}
            <PDFViewerModal
                open={pdfViewerOpen}
                onClose={() => setPdfViewerOpen(false)}
                pdfUrl={currentPdfUrl}
            />

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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{
                                    color: GRAY_COLOR,
                                    fontSize: '0.75rem',
                                }}>
                                    Technician:
                                </Typography>
                                <Typography variant="caption" sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                }}>
                                    {lockedConfirmModal.itemData.technician}
                                </Typography>
                            </Box>
                        </Box>
                    )}
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
                                Action will be executed immediately
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                }}
                            >
                                This report will be moved to the Finalized section with status "LOCKED".
                            </Typography>
                        </Box>
                    </Box>
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{
                                    color: GRAY_COLOR,
                                    fontSize: '0.75rem',
                                }}>
                                    Technician:
                                </Typography>
                                <Typography variant="caption" sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                }}>
                                    {discardConfirmModal.itemData.technician}
                                </Typography>
                            </Box>
                        </Box>
                    )}
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
                                Action will be executed immediately
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                }}
                            >
                                This report will be moved to the Finalized section with status "DELETED".
                            </Typography>
                        </Box>
                    </Box>
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

            {/* History Modal */}
            <Modal
                open={historyModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                aria-labelledby="history-modal"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Box sx={{
                    width: '95%',
                    maxWidth: 1400,
                    maxHeight: '90vh',
                    bgcolor: 'white',
                    borderRadius: '8px',
                    boxShadow: 24,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <Box sx={{
                        p: 2,
                        borderBottom: `1px solid ${alpha(PURPLE_COLOR, 0.1)}`,
                        bgcolor: alpha(PURPLE_COLOR, 0.03),
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: alpha(PURPLE_COLOR, 0.1),
                                color: PURPLE_COLOR,
                            }}>
                                <History size={20} />
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    mb: 0.5,
                                }}>
                                    History - Deleted Work Orders
                                </Typography>
                                <Typography variant="body2" sx={{
                                    fontSize: '0.85rem',
                                    color: GRAY_COLOR,
                                }}>
                                    {deletedWorkOrders.length} deleted item(s) • Restore or permanently delete
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                                size="small"
                                onClick={() => setHistoryModalOpen(false)}
                                sx={{
                                    color: GRAY_COLOR,
                                    '&:hover': {
                                        backgroundColor: alpha(GRAY_COLOR, 0.1),
                                    },
                                }}
                            >
                                <X size={20} />
                            </IconButton>
                        </Box>
                    </Box>

                    <Box sx={{
                        p: 1.5,
                        borderBottom: `1px solid ${alpha(PURPLE_COLOR, 0.1)}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Checkbox
                                size="small"
                                checked={historyModalPageItems.length > 0 && historyModalPageItems.every(item =>
                                    selectedHistoryItems.has(item.id.toString())
                                )}
                                indeterminate={
                                    historyModalPageItems.length > 0 &&
                                    historyModalPageItems.some(item =>
                                        selectedHistoryItems.has(item.id.toString())
                                    ) &&
                                    !historyModalPageItems.every(item =>
                                        selectedHistoryItems.has(item.id.toString())
                                    )
                                }
                                onChange={() => {
                                    const allPageIds = new Set(historyModalPageItems.map(item => item.id.toString()));
                                    const currentSelected = new Set(selectedHistoryItems);
                                    const allSelectedOnPage = Array.from(allPageIds).every(id => currentSelected.has(id));

                                    if (allSelectedOnPage) {
                                        const newSet = new Set(currentSelected);
                                        allPageIds.forEach(id => newSet.delete(id));
                                        setSelectedHistoryItems(newSet);
                                    } else {
                                        const newSet = new Set([...currentSelected, ...allPageIds]);
                                        setSelectedHistoryItems(newSet);
                                    }
                                }}
                                sx={{ padding: '4px' }}
                            />
                            <SearchInput
                                value={historySearch}
                                onChange={setHistorySearch}
                                placeholder="Search deleted items..."
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<RotateCcw size={14} />}
                                onClick={() => {
                                    setSelectedForRestore(selectedHistoryItems);
                                    setRestoreDialogOpen(true);
                                }}
                                disabled={selectedHistoryItems.size === 0}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    color: GREEN_COLOR,
                                    borderColor: alpha(GREEN_COLOR, 0.3),
                                    '&:hover': {
                                        borderColor: GREEN_COLOR,
                                        backgroundColor: alpha(GREEN_COLOR, 0.05),
                                    },
                                }}
                            >
                                Restore ({selectedHistoryItems.size})
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Trash2 size={14} />}
                                onClick={() => {
                                    setSelectedForPermanentDeletion(selectedHistoryItems);
                                    setPermanentDeleteDialogOpen(true);
                                }}
                                disabled={selectedHistoryItems.size === 0}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    color: RED_COLOR,
                                    borderColor: alpha(RED_COLOR, 0.3),
                                    '&:hover': {
                                        borderColor: RED_COLOR,
                                        backgroundColor: alpha(RED_COLOR, 0.05),
                                    },
                                }}
                            >
                                Delete ({selectedHistoryItems.size})
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {deletedWorkOrders.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <History size={48} color={alpha(GRAY_COLOR, 0.3)} />
                                <Typography variant="body2" sx={{
                                    mt: 2,
                                    color: GRAY_COLOR,
                                    fontSize: '0.9rem',
                                }}>
                                    No deleted work orders in history
                                </Typography>
                                <Typography variant="caption" sx={{
                                    color: GRAY_COLOR,
                                    fontSize: '0.8rem',
                                }}>
                                    Deleted work orders will appear here
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{
                                            bgcolor: alpha(PURPLE_COLOR, 0.04),
                                            '& th': {
                                                borderBottom: `2px solid ${alpha(PURPLE_COLOR, 0.1)}`,
                                                fontWeight: 600,
                                                fontSize: '0.8rem',
                                                color: TEXT_COLOR,
                                                py: 1.5,
                                            }
                                        }}>
                                            <TableCell padding="checkbox" width={50} />
                                            <TableCell>Work Order</TableCell>
                                            <TableCell>Customer Address</TableCell>
                                            <TableCell>Technician</TableCell>
                                            <TableCell>Deleted By</TableCell>
                                            <TableCell>Deleted At</TableCell>
                                            <TableCell>Scheduled Date</TableCell>
                                            <TableCell width={150}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {historyModalPageItems.map((item) => {
                                            const itemKey = item.id.toString();
                                            const isSelected = selectedHistoryItems.has(itemKey);
                                            const technician = item.technician || 'Unassigned';
                                            const technicianInitial = getTechnicianInitial(technician);

                                            return (
                                                <TableRow
                                                    key={itemKey}
                                                    hover
                                                    sx={{
                                                        bgcolor: isSelected ? alpha(PURPLE_COLOR, 0.1) : 'white',
                                                        '&:hover': {
                                                            backgroundColor: alpha(PURPLE_COLOR, 0.05),
                                                        },
                                                    }}
                                                >
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            size="small"
                                                            checked={isSelected}
                                                            onChange={() => {
                                                                const newSet = new Set(selectedHistoryItems);
                                                                if (newSet.has(itemKey)) newSet.delete(itemKey);
                                                                else newSet.add(itemKey);
                                                                setSelectedHistoryItems(newSet);
                                                            }}
                                                            sx={{ padding: '4px' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: '0.85rem',
                                                            fontWeight: 500,
                                                            color: TEXT_COLOR,
                                                        }}>
                                                            {item.wo_number || 'N/A'}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{
                                                            fontSize: '0.75rem',
                                                            color: GRAY_COLOR,
                                                        }}>
                                                            ID: {item.id}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: '0.85rem',
                                                            color: TEXT_COLOR,
                                                            mb: 0.5,
                                                        }}>
                                                            {item.full_address?.split(',')[0] || '—'}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{
                                                            fontSize: '0.75rem',
                                                            color: GRAY_COLOR,
                                                        }}>
                                                            {item.full_address?.split(',')[1] || ''}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Avatar sx={{
                                                                width: 28,
                                                                height: 28,
                                                                bgcolor: BLUE_COLOR,
                                                                fontSize: '0.85rem',
                                                                fontWeight: 600,
                                                            }}>
                                                                {technicianInitial}
                                                            </Avatar>
                                                            <Typography variant="body2" sx={{
                                                                fontSize: '0.85rem',
                                                                color: TEXT_COLOR,
                                                            }}>
                                                                {technician}
                                                            </Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box>
                                                            <Typography variant="body2" sx={{
                                                                fontSize: '0.85rem',
                                                                color: TEXT_COLOR,
                                                            }}>
                                                                {item.deleted_by || '—'}
                                                            </Typography>
                                                            {item.deleted_by_email && (
                                                                <Typography variant="caption" sx={{
                                                                    fontSize: '0.75rem',
                                                                    color: GRAY_COLOR,
                                                                }}>
                                                                    {item.deleted_by_email}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: '0.85rem',
                                                            color: TEXT_COLOR,
                                                        }}>
                                                            {formatDate(item.deleted_date)}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{
                                                            fontSize: '0.75rem',
                                                            color: GRAY_COLOR,
                                                        }}>
                                                            {formatTime(item.deleted_date)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: '0.85rem',
                                                            color: TEXT_COLOR,
                                                        }}>
                                                            {formatDate(item.scheduled_date)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={0.5}>
                                                            <Tooltip title="Restore">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => {
                                                                        setSelectedForRestore(new Set([itemKey]));
                                                                        setRestoreDialogOpen(true);
                                                                    }}
                                                                    sx={{
                                                                        color: GREEN_COLOR,
                                                                        '&:hover': {
                                                                            backgroundColor: alpha(GREEN_COLOR, 0.1),
                                                                        },
                                                                    }}
                                                                >
                                                                    <RotateCcw size={16} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete Permanently">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => {
                                                                        setSelectedForPermanentDeletion(new Set([itemKey]));
                                                                        setPermanentDeleteDialogOpen(true);
                                                                    }}
                                                                    sx={{
                                                                        color: RED_COLOR,
                                                                        '&:hover': {
                                                                            backgroundColor: alpha(RED_COLOR, 0.1),
                                                                        },
                                                                    }}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>

                    {deletedWorkOrders.length > 0 && (
                        <Box sx={{
                            borderTop: `1px solid ${alpha(PURPLE_COLOR, 0.1)}`,
                            p: 1,
                        }}>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                component="div"
                                count={deletedWorkOrders.length}
                                rowsPerPage={historyRowsPerPage}
                                page={historyPage}
                                onPageChange={(event, newPage) => setHistoryPage(newPage)}
                                onRowsPerPageChange={(event) => {
                                    setHistoryRowsPerPage(parseInt(event.target.value, 10));
                                    setHistoryPage(0);
                                }}
                                sx={{
                                    '& .MuiTablePagination-toolbar': {
                                        minHeight: '44px',
                                    },
                                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                        fontSize: '0.8rem',
                                    },
                                }}
                            />
                        </Box>
                    )}
                </Box>
            </Modal>

            {/* Soft Delete Confirmation Dialog */}
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
                                Move to History
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 400,
                            }}>
                                Items can be restored from history
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
                        Are you sure you want to move <strong>{selectedForDeletion.size} item(s)</strong> from the <strong>{deletionSection}</strong> section to history?
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
                                Items moved to history can be restored later. Permanent deletion is only available in the history.
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
                        onClick={() => handleSoftDelete(selectedForDeletion, deletionSection)}
                        variant="contained"
                        color="warning"
                        startIcon={<Trash2 size={16} />}
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
                        Move to History
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Restore Confirmation Dialog */}
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
                                Restore items from history
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
                        Are you sure you want to restore <strong>{selectedForRestore.size} item(s)</strong> from history?
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
                        onClick={() => handleRestore(selectedForRestore)}
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
                        Restore Items
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Permanent Delete Confirmation Dialog */}
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
                                Permanently delete items from history
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
                        Are you sure you want to permanently delete <strong>{selectedForPermanentDeletion.size} item(s)</strong> from history?
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
                        onClick={() => handlePermanentDelete(selectedForPermanentDeletion)}
                        variant="contained"
                        color="error"
                        startIcon={<Trash2 size={16} />}
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
                        Delete Permanently
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

const Section = ({
    title,
    color,
    count,
    selectedCount,
    onDelete,
    children,
    icon,
    subtitle,
    additionalActions = null,
}) => (
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
                p: 1.5,
                bgcolor: 'white',
                borderBottom: `1px solid ${alpha(color, 0.1)}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {icon && (
                    <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: alpha(color, 0.1),
                        color: color,
                    }}>
                        {icon}
                    </Box>
                )}
                <Box>
                    <Typography
                        sx={{
                            fontSize: '0.9rem',
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
                    {subtitle && (
                        <Typography
                            variant="body2"
                            sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 400,
                                mt: 0.25,
                            }}
                        >
                            {subtitle}
                        </Typography>
                    )}
                </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {additionalActions}
                {selectedCount > 0 && onDelete && (
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={onDelete}
                        startIcon={<Trash2 size={14} />}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            height: '30px',
                            px: 1.5,
                        }}
                    >
                        Move to History ({selectedCount})
                    </Button>
                )}
            </Box>
        </Box>
        {children}
    </Paper>
);

const SearchInput = ({ value, onChange, placeholder }) => (
    <Box sx={{ position: 'relative', width: 200 }}>
        <TextField
            size="small"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            sx={{
                width: '100%',
                '& .MuiInputBase-root': {
                    fontSize: '0.8rem',
                    height: '36px',
                    paddingLeft: '36px',
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
}) => {
    const allSelectedOnPage = items.length > 0 && items.every(item => selected.has(item.id));
    const someSelectedOnPage = items.length > 0 && items.some(item => selected.has(item.id));

    return (
        <TableContainer>
            <Helmet>
                <title>RME | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Super Admin RME page" />
            </Helmet>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{
                        bgcolor: alpha(color, 0.04),
                        '& th': {
                            borderBottom: `2px solid ${alpha(color, 0.1)}`,
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: TEXT_COLOR,
                            py: 1.5,
                        }
                    }}>
                        <TableCell
                            padding="checkbox"
                            width={50}
                            sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                py: 1.5,
                                pl: 2.5,
                            }}
                        >
                            <Checkbox
                                size="small"
                                checked={allSelectedOnPage}
                                indeterminate={someSelectedOnPage && !allSelectedOnPage}
                                onChange={onToggleAll}
                                sx={{
                                    color: TEXT_COLOR,
                                    padding: '4px',
                                }}
                            />
                        </TableCell>
                        <TableCell>W.O Date & Elapsed Time</TableCell>
                        <TableCell>Technician</TableCell>
                        <TableCell>Address</TableCell>
                        <TableCell align="center">Last Report</TableCell>
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
                                    <TableCell padding="checkbox" sx={{ pl: 2.5, py: 1.5 }}>
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => onToggleSelect(item.id)}
                                            size="small"
                                            sx={{
                                                color: TEXT_COLOR,
                                                padding: '4px',
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500, color: TEXT_COLOR }}>
                                                {item.date}
                                            </Typography>
                                            <Typography variant="caption" sx={{
                                                color: item.elapsedColor,
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5
                                            }}>
                                                <Timer size={12} />
                                                {item.elapsedTime}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar sx={{
                                                width: 28,
                                                height: 28,
                                                bgcolor: color,
                                                fontSize: '0.85rem',
                                                fontWeight: 600
                                            }}>
                                                {item.technicianInitial}
                                            </Avatar>
                                            <Typography variant="body2">{item.technician}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {item.street}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: GRAY_COLOR }}>
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
                                            <Typography variant="caption" sx={{ color: GRAY_COLOR }}>—</Typography>
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
                    rowsPerPageOptions={[5, 10, 25, 50]}
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
                            fontSize: '0.8rem',
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
}) => {
    const allSelectedOnPage = items.length > 0 && items.every(item => selected.has(item.id));
    const someSelectedOnPage = items.length > 0 && items.some(item => selected.has(item.id));

    return (
        <>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{
                            bgcolor: alpha(color, 0.04),
                            '& th': {
                                borderBottom: `2px solid ${alpha(color, 0.1)}`,
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                color: TEXT_COLOR,
                                py: 1.5,
                            }
                        }}>
                            <TableCell
                                padding="checkbox"
                                width={50}
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    py: 1.5,
                                    pl: 2.5,
                                }}
                            >
                                <Checkbox
                                    size="small"
                                    checked={allSelectedOnPage}
                                    indeterminate={someSelectedOnPage && !allSelectedOnPage}
                                    onChange={onToggleAll}
                                    sx={{
                                        color: TEXT_COLOR,
                                        padding: '4px',
                                    }}
                                />
                            </TableCell>
                            <TableCell>W.O Date & Elapsed Time</TableCell>
                            <TableCell>Technician</TableCell>
                            <TableCell>Address</TableCell>
                            <TableCell align="center">Last Report</TableCell>
                            <TableCell align="center">Unlocked Report</TableCell>
                            <TableCell align="center">LOCKED</TableCell>
                            <TableCell align="center">Wait To Lock</TableCell>
                            <TableCell align="center">DISCARD</TableCell>
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
                                const isTechReportSubmitted = item.techReportSubmitted;
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
                                            <TableCell padding="checkbox" sx={{ pl: 2.5, py: 1.5 }}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={() => onToggleSelect(item.id)}
                                                    size="small"
                                                    sx={{
                                                        color: TEXT_COLOR,
                                                        padding: '4px',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 500, color: TEXT_COLOR }}>
                                                        {item.date}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{
                                                        color: item.elapsedColor,
                                                        fontWeight: 600,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5
                                                    }}>
                                                        <Timer size={12} />
                                                        {item.elapsedTime}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Avatar sx={{
                                                        width: 28,
                                                        height: 28,
                                                        bgcolor: color,
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600
                                                    }}>
                                                        {item.technicianInitial}
                                                    </Avatar>
                                                    <Typography variant="body2">{item.technician}</Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {item.street}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: GRAY_COLOR }}>
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
                                                    <Typography variant="caption" sx={{ color: GRAY_COLOR }}>—</Typography>
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
                                                    <Typography variant="caption" sx={{ color: GRAY_COLOR }}>—</Typography>
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
                                                            color: isTechReportSubmitted ? 'inherit' : alpha(TEXT_COLOR, 0.3),
                                                            '&.Mui-disabled': {
                                                                opacity: 0.5,
                                                            }
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
                                            <TableRow sx={{ bgcolor: alpha(ORANGE_COLOR, 0.05) }}>
                                                <TableCell colSpan={9} sx={{ p: 2 }}>
                                                    <Box sx={{ pl: 6 }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1, color: ORANGE_COLOR }}>
                                                            Additional Information Required:
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                                                <InputLabel>Reason in Holding</InputLabel>
                                                                <Select
                                                                    value={details.reason}
                                                                    onChange={(e) => onWaitToLockReasonChange(item.id, e.target.value)}
                                                                    label="Reason in Holding"
                                                                >
                                                                    <MenuItem value="Additional Reports Needed">Additional Reports Needed</MenuItem>
                                                                    <MenuItem value="Verifying Information">Verifying Information</MenuItem>
                                                                    <MenuItem value="Pending Supervisor Review">Pending Supervisor Review</MenuItem>
                                                                    <MenuItem value="Customer Follow-up Required">Customer Follow-up Required</MenuItem>
                                                                    <MenuItem value="Technical Issue">Technical Issue</MenuItem>
                                                                    <MenuItem value="Other">Other</MenuItem>
                                                                </Select>
                                                            </FormControl>
                                                            <TextField
                                                                size="small"
                                                                multiline
                                                                rows={2}
                                                                label="Notes"
                                                                value={details.notes}
                                                                onChange={(e) => onWaitToLockNotesChange(item.id, e.target.value)}
                                                                placeholder="Enter specific details about why the RME will not be locked today..."
                                                                sx={{ flex: 1 }}
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
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {totalCount > 0 && (
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
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
                                fontSize: '0.8rem',
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
}) => {
    const allSelectedOnPage = items.length > 0 && items.every(item => selected.has(item.id));
    const someSelectedOnPage = items.length > 0 && items.some(item => selected.has(item.id));

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{
                        bgcolor: alpha(color, 0.04),
                        '& th': {
                            borderBottom: `2px solid ${alpha(color, 0.1)}`,
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: TEXT_COLOR,
                            py: 1.5,
                        }
                    }}>
                        <TableCell
                            padding="checkbox"
                            width={50}
                            sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                py: 1.5,
                                pl: 2.5,
                            }}
                        >
                            <Checkbox
                                size="small"
                                checked={allSelectedOnPage}
                                indeterminate={someSelectedOnPage && !allSelectedOnPage}
                                onChange={onToggleAll}
                                sx={{
                                    color: TEXT_COLOR,
                                    padding: '4px',
                                }}
                            />
                        </TableCell>
                        <TableCell>W.O Date & Elapsed Time </TableCell>
                        <TableCell>Technician</TableCell>
                        <TableCell>Address</TableCell>
                        <TableCell align="center">Prior Locked Report</TableCell>
                        <TableCell align="center">Unlocked Report Link</TableCell>
                        <TableCell>Reason in Holding & Notes</TableCell>
                        <TableCell align="center">LOCKED</TableCell>
                        <TableCell align="center">DISCARD</TableCell>
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
                                    <TableCell padding="checkbox" sx={{ pl: 2.5, py: 1.5 }}>
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => onToggleSelect(item.id)}
                                            size="small"
                                            sx={{
                                                color: TEXT_COLOR,
                                                padding: '4px',
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500, color: TEXT_COLOR }}>
                                                {item.date}
                                            </Typography>
                                            <Typography variant="caption" sx={{
                                                color: item.elapsedColor,
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5
                                            }}>
                                                <Clock size={12} />
                                                {item.elapsedTime}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar sx={{
                                                width: 28,
                                                height: 28,
                                                bgcolor: color,
                                                fontSize: '0.85rem',
                                                fontWeight: 600
                                            }}>
                                                {item.technicianInitial}
                                            </Avatar>
                                            <Typography variant="body2">{item.technician}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {item.street}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: GRAY_COLOR }}>
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
                                            <Typography variant="caption" sx={{ color: GRAY_COLOR }}>—</Typography>
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
                                            <Typography variant="caption" sx={{ color: GRAY_COLOR }}>—</Typography>
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
                                                    fontSize: '0.75rem',
                                                    alignSelf: 'flex-start',
                                                }}
                                            />
                                            {item.notes && (
                                                <Typography variant="caption" sx={{
                                                    color: TEXT_COLOR,
                                                    fontSize: '0.75rem',
                                                    lineHeight: 1.2,
                                                    whiteSpace: 'normal',
                                                    wordBreak: 'break-word',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: '250px',
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
                    rowsPerPageOptions={[5, 10, 25, 50]}
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
                            fontSize: '0.8rem',
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
}) => {
    const allSelectedOnPage = items.length > 0 && items.every(item => selected.has(item.id));
    const someSelectedOnPage = items.length > 0 && items.some(item => selected.has(item.id));

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{
                        bgcolor: alpha(color, 0.04),
                        '& th': {
                            borderBottom: `2px solid ${alpha(color, 0.1)}`,
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: TEXT_COLOR,
                            py: 1.5,
                        }
                    }}>
                        <TableCell
                            padding="checkbox"
                            width={50}
                            sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                py: 1.5,
                                pl: 2.5,
                            }}
                        >
                            <Checkbox
                                size="small"
                                checked={allSelectedOnPage}
                                indeterminate={someSelectedOnPage && !allSelectedOnPage}
                                onChange={onToggleAll}
                                sx={{
                                    color: TEXT_COLOR,
                                    padding: '4px',
                                }}
                            />
                        </TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Address</TableCell>
                        <TableCell>Date </TableCell>
                        <TableCell>By Manager</TableCell>
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
                                    <TableCell padding="checkbox" sx={{ pl: 2.5, py: 1.5 }}>
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => onToggleSelect(item.id)}
                                            size="small"
                                            sx={{
                                                color: TEXT_COLOR,
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
                                                fontSize: '0.75rem',
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {item.street}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: GRAY_COLOR }}>
                                                {item.city}, {item.state} {item.zip}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {formatDate(item.actionTime)}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: GRAY_COLOR }}>
                                            {formatTime(item.actionTime)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {item.by}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: GRAY_COLOR }}>
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
                    rowsPerPageOptions={[5, 10, 25, 50]}
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
                            fontSize: '0.8rem',
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