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
    CircularProgress,
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
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import axiosInstance from '../../../api/axios';
import {
    format,
    addBusinessDays,
    addHours,
    isBefore,
    isWeekend,
    addDays,
} from 'date-fns';
import StyledTextField from '../../../components/ui/StyledTextField';

import {
    RefreshCw,
    CheckCircle,
    Clock,
    Timer,
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
} from 'lucide-react';

const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const ORANGE_COLOR = '#ed6c02';
const GRAY_COLOR = '#6b7280';
const PURPLE_COLOR = '#8b5cf6';

const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (e) {
        return '—';
    }
};

const formatDateShort = (dateString) => {
    if (!dateString) return '—';
    try {
        return format(new Date(dateString), 'MMM dd, HH:mm');
    } catch (e) {
        return '—';
    }
};

const formatEmergencyCountdown = (remainingMs) => {
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
};

const getBusinessDaysRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);

    if (now >= end) return { days: 0, expired: true };

    let current = new Date(now);
    let businessDays = 0;

    if (current.getHours() >= 17) {
        current = addDays(current, 1);
    }

    current.setHours(8, 0, 0, 0);

    while (current < end) {
        if (!isWeekend(current)) {
            businessDays++;
        }
        current = addDays(current, 1);
    }

    return { days: businessDays, expired: false };
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

const Locates = () => {
    const queryClient = useQueryClient();
    const [currentTime, setCurrentTime] = useState(new Date());

    const [selectedPending, setSelectedPending] = useState(new Set());
    const [selectedInProgress, setSelectedInProgress] = useState(new Set());
    const [selectedCompleted, setSelectedCompleted] = useState(new Set());

    const [pagePending, setPagePending] = useState(0);
    const [rowsPerPagePending, setRowsPerPagePending] = useState(10);
    const [pageInProgress, setPageInProgress] = useState(0);
    const [rowsPerPageInProgress, setRowsPerPageInProgress] = useState(10);
    const [pageCompleted, setPageCompleted] = useState(0);
    const [rowsPerPageCompleted, setRowsPerPageCompleted] = useState(10);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedForDeletion, setSelectedForDeletion] = useState(new Set());
    const [deletionSection, setDeletionSection] = useState('');
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [selectedForCompletion, setSelectedForCompletion] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const [recycleBinOpen, setRecycleBinOpen] = useState(false);
    const [recycleBinSearch, setRecycleBinSearch] = useState('');
    const [recycleBinPage, setRecycleBinPage] = useState(0);
    const [recycleBinRowsPerPage, setRecycleBinRowsPerPage] = useState(10);
    const [selectedRecycleBinItems, setSelectedRecycleBinItems] = useState(new Set());
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
    const [singleRestoreDialogOpen, setSingleRestoreDialogOpen] = useState(false);
    const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);
    const [selectedSingleItem, setSelectedSingleItem] = useState(null);
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success',
    });

    // Real-time updates for recycle bin count
    const [recycleBinCount, setRecycleBinCount] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Updated query with correct API endpoint
    const { data: rawData = [], isLoading, refetch } = useQuery({
        queryKey: ['locates-all'],
        queryFn: async () => {
            const res = await axiosInstance.get('/all-locates/');
            return Array.isArray(res.data) ? res.data : res.data?.data || [];
        },
        staleTime: 30000, // 30 seconds
        refetchInterval: 60000, // Refetch every minute for real-time updates
    });

    console.log('Fetched locates data:', rawData);

    // Optimized recycle bin query with polling - updated endpoint
    const { data: deletedHistoryData = {}, isLoading: isRecycleBinLoading, refetch: refetchRecycleBin } = useQuery({
        queryKey: ['locates-deleted-history'],
        queryFn: async () => {
            const res = await axiosInstance.get('/deleted-history/');
            return res.data || {};
        },
        staleTime: 30000,
        refetchInterval: 60000,
    });

    // Update recycle bin count whenever data changes
    useEffect(() => {
        if (deletedHistoryData.data) {
            const filtered = deletedHistoryData.data.filter(item => !item.isPermanentlyDeleted);
            setRecycleBinCount(filtered.length);
        } else if (deletedHistoryData.deleted_work_orders) {
            const filtered = deletedHistoryData.deleted_work_orders.filter(item => !item.is_permanently_deleted);
            setRecycleBinCount(filtered.length);
        }
    }, [deletedHistoryData]);

    const invalidateAndRefetch = () => {
        queryClient.invalidateQueries({ queryKey: ['locates-all'] });
        queryClient.invalidateQueries({ queryKey: ['locates-deleted-history'] });
    };

    const markCalledMutation = useMutation({
        mutationFn: async ({ id, callType }) => {
            const response = await axiosInstance.patch(
                `/work-order/${id}/update-call-status/`,
                {
                    locates_called: true,
                    call_type: callType,
                    called_at: new Date().toISOString(),
                }
            );
            return response.data;
        },
        onSuccess: (data) => {
            invalidateAndRefetch();
            showSnackbar('Locate call status updated', 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Update failed', 'error');
        },
    });

    const softDeleteBulkMutation = useMutation({
        mutationFn: (ids) =>
            axiosInstance.delete('/work-order/bulk-delete/', { data: { ids: Array.from(ids) } }),
        onSuccess: () => {
            invalidateAndRefetch();
            setSelectedPending(new Set());
            setSelectedInProgress(new Set());
            setSelectedCompleted(new Set());
            if (recycleBinOpen) {
                refetchRecycleBin();
            }
            showSnackbar('Selected items moved to recycle bin', 'success');
        },
        onError: (err) => showSnackbar(err?.response?.data?.message || 'Delete failed', 'error'),
    });

    const completeWorkOrderManuallyMutation = useMutation({
        mutationFn: async (id) => {
            const response = await axiosInstance.patch(`/work-order/${id}/complete/`);
            return response.data;
        },
        onSuccess: () => {
            invalidateAndRefetch();
            setSelectedForCompletion(new Set());
            setSelectedInProgress(new Set());
            showSnackbar('Work order marked as complete', 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Manual completion failed', 'error');
        },
    });

    const bulkCompleteWorkOrdersMutation = useMutation({
        mutationFn: async (ids) => {
            const promises = Array.from(ids).map(id =>
                axiosInstance.patch(`/work-order/${id}/complete/`)
            );
            const responses = await Promise.all(promises);
            return responses.map(r => r.data);
        },
        onSuccess: (responses) => {
            invalidateAndRefetch();
            setSelectedForCompletion(new Set());
            setSelectedInProgress(new Set());
            showSnackbar(`${responses.length} work order(s) marked as complete`, 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Bulk completion failed', 'error');
        },
    });

    const restoreFromRecycleBinMutation = useMutation({
        mutationFn: async ({ dashboardId, deletedOrderId }) => {
            const response = await axiosInstance.post(
                `/history/${dashboardId}/${deletedOrderId}/restore/`
            );
            return response.data;
        },
        onSuccess: () => {
            invalidateAndRefetch();
            refetchRecycleBin();
            setSelectedRecycleBinItems(new Set());
            setSingleRestoreDialogOpen(false);
            showSnackbar('Item restored successfully', 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Restore failed', 'error');
        },
    });

    const bulkRestoreMutation = useMutation({
        mutationFn: async (items) => {
            const promises = items.map(item =>
                axiosInstance.post(`/history/${item.dashboardId}/${item.deletedOrderId}/restore/`)
            );
            const responses = await Promise.all(promises);
            return responses.map(r => r.data);
        },
        onSuccess: (responses) => {
            invalidateAndRefetch();
            refetchRecycleBin();
            setSelectedRecycleBinItems(new Set());
            showSnackbar(`${responses.length} item(s) restored`, 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Bulk restore failed', 'error');
        },
    });

    const permanentDeleteFromRecycleBinMutation = useMutation({
        mutationFn: async ({ dashboardId, deletedOrderId }) => {
            const response = await axiosInstance.delete(
                `/history/${dashboardId}/${deletedOrderId}/permanent/`
            );
            return response.data;
        },
        onSuccess: () => {
            refetchRecycleBin();
            setSelectedRecycleBinItems(new Set());
            setSingleDeleteDialogOpen(false);
            showSnackbar('Item permanently deleted', 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Permanent delete failed', 'error');
        },
    });

    const bulkPermanentDeleteMutation = useMutation({
        mutationFn: async (items) => {
            const response = await axiosInstance.delete('/history/bulk-permanent-delete/', {
                data: { items }
            });
            return response.data;
        },
        onSuccess: (data) => {
            refetchRecycleBin();
            setSelectedRecycleBinItems(new Set());
            showSnackbar(`${data.deletedCount || items.length} item(s) permanently deleted`, 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Bulk permanent delete failed', 'error');
        },
    });

    const clearAllRecycleBinMutation = useMutation({
        mutationFn: async () => {
            const response = await axiosInstance.delete('/history/clear-all/');
            return response.data;
        },
        onSuccess: () => {
            refetchRecycleBin();
            setSelectedRecycleBinItems(new Set());
            setClearAllDialogOpen(false);
            showSnackbar('Recycle bin cleared', 'success');
        },
        onError: (err) => {
            showSnackbar(err?.response?.data?.message || 'Clear all failed', 'error');
        },
    });

    const processed = useMemo(() => {
        // Extract all work orders from all dashboards
        const allWorkOrders = [];

        rawData.forEach(dashboard => {
            if (dashboard.work_orders && Array.isArray(dashboard.work_orders)) {
                dashboard.work_orders.forEach(wo => {
                    const addr = parseDashboardAddress(wo.customer_address || '');
                    const isEmergency = (wo.type || wo.priority_name || '').toUpperCase().includes('EMERGENCY');
                    const type = isEmergency ? 'EMERGENCY' : 'STANDARD';

                    let completionDate = null;
                    let timeRemainingText = '';
                    let timeRemainingDetail = '';
                    let timeRemainingColor = TEXT_COLOR;
                    let isExpired = false;

                    const calledByName = wo.called_by || wo.metadata?.updatedBy || '';
                    const calledByEmail = wo.called_by_email || '';

                    if (wo.locates_called && wo.called_at && wo.call_type) {
                        const called = new Date(wo.called_at);
                        completionDate = wo.completion_date ? new Date(wo.completion_date) :
                            (wo.call_type === 'EMERGENCY' ? addHours(called, 4) : addBusinessDays(called, 2));

                        const now = currentTime;
                        isExpired = isBefore(completionDate, now);

                        if (!isExpired) {
                            if (wo.call_type === 'EMERGENCY') {
                                const totalMs = 4 * 60 * 60 * 1000;
                                const elapsedMs = now.getTime() - called.getTime();
                                const remainingMs = Math.max(0, totalMs - elapsedMs);

                                timeRemainingText = formatEmergencyCountdown(remainingMs);
                                timeRemainingDetail = `Expires at: ${format(completionDate, 'MMM dd, HH:mm:ss')}`;

                                if (remainingMs <= 30 * 60 * 1000) {
                                    timeRemainingColor = RED_COLOR;
                                } else if (remainingMs <= 60 * 60 * 1000) {
                                    timeRemainingColor = ORANGE_COLOR;
                                } else {
                                    timeRemainingColor = BLUE_COLOR;
                                }
                            } else {
                                const businessInfo = getBusinessDaysRemaining(completionDate);
                                const now = new Date();
                                const isBusinessDay = !isWeekend(now);

                                if (businessInfo.days === 0 && isBusinessDay) {
                                    const businessHoursRemaining = Math.max(0, 17 - now.getHours());
                                    timeRemainingText = `${businessHoursRemaining}h remaining today`;
                                } else if (businessInfo.days === 1) {
                                    timeRemainingText = `1 business day`;
                                } else {
                                    timeRemainingText = `${businessInfo.days} business days`;
                                }

                                timeRemainingDetail = `Expires: ${format(completionDate, 'MMM dd, yyyy')}`;

                                if (businessInfo.days === 0) {
                                    timeRemainingColor = ORANGE_COLOR;
                                } else if (businessInfo.days <= 1) {
                                    timeRemainingColor = ORANGE_COLOR;
                                } else {
                                    timeRemainingColor = BLUE_COLOR;
                                }
                            }
                        } else {
                            timeRemainingText = 'EXPIRED';
                            timeRemainingDetail = `Expired on: ${format(completionDate, 'MMM dd, yyyy HH:mm')}`;
                            timeRemainingColor = RED_COLOR;
                        }
                    }

                    allWorkOrders.push({
                        id: wo.id || `ext-${wo.work_order_number || Math.random().toString(36).slice(2, 9)}`,
                        workOrderId: wo.id,
                        jobId: wo.work_order_number || 'N/A',
                        workOrderNumber: wo.work_order_number || '',
                        customerName: wo.customer_name || 'Unknown',
                        ...addr,
                        type,
                        techName: wo.tech_name || wo.technician || 'Unassigned',
                        requestedDate: wo.created_date || wo.requested_date,
                        completedAt: wo.completed_date,
                        locatesCalled: !!wo.locates_called,
                        callType: wo.call_type || null,
                        calledByName,
                        calledByEmail,
                        calledAt: wo.called_at,
                        completionDate: completionDate,
                        priorityName: wo.priority_name || 'Standard',
                        priorityColor: wo.priority_color,
                        needsCall: (wo.priority_name || '').toUpperCase() === 'EXCAVATOR',
                        isExpired,
                        timeRemainingText,
                        timeRemainingDetail,
                        timeRemainingColor,
                        workflowStatus: wo.workflow_status || 'UNKNOWN',
                        dashboardId: dashboard.id || null,
                    });
                });
            }
        });

        return allWorkOrders;
    }, [rawData, currentTime]);

    const recycleBinItems = useMemo(() => {
        const data = deletedHistoryData.data || deletedHistoryData.deleted_work_orders || [];
        const extractedData = data.map(item => {
            // Extract dashboard ID from the data
            const dashboardId = item.dashboard_id || item.dashboardId ||
                (item.original_dashboard ? item.original_dashboard : null) ||
                (deletedHistoryData.id ? deletedHistoryData.id.toString() : null);

            const dashboardName = item.dashboard_name || item.dashboardName ||
                `Dashboard ${dashboardId || 'Unknown'}`;

            // Handle both field name formats
            const deletedOrderId = item.id || item.original_work_order_id;
            const workOrderNumber = item.work_order_number || 'N/A';
            const customerName = item.customer_name || 'Unknown';
            const customerAddress = item.customer_address || '';
            const deletedBy = item.deleted_by || item.deletedBy || 'Unknown';
            const deletedByEmail = item.deleted_by_email || item.deletedByEmail || '';
            const deletedAt = item.deleted_at || item.deletedAt;
            const deletedFrom = item.deleted_from || item.deletedFrom || 'Unknown';
            const isPermanentlyDeleted = item.is_permanently_deleted || item.isPermanentlyDeleted || false;
            const originalWorkOrderId = item.original_work_order_id || item.id;

            return {
                ...item,
                dashboardId: dashboardId ? dashboardId.toString() : '1',
                dashboardName,
                deletedOrderId: deletedOrderId ? deletedOrderId.toString() : item.id?.toString() || '1',
                originalWorkOrderId: originalWorkOrderId ? originalWorkOrderId.toString() : '1',
                workOrderNumber,
                customerName,
                customerAddress,
                deletedBy,
                deletedByEmail,
                deletedAt,
                deletedFrom,
                isPermanentlyDeleted,
            };
        });

        const filtered = extractedData.filter(item => !item.isPermanentlyDeleted);
        let searchFiltered = [...filtered];
        if (recycleBinSearch) {
            const searchLower = recycleBinSearch.toLowerCase();
            searchFiltered = searchFiltered.filter(item =>
                (item.workOrderNumber?.toLowerCase() || '').includes(searchLower) ||
                (item.customerName?.toLowerCase() || '').includes(searchLower) ||
                (item.customerAddress?.toLowerCase() || '').includes(searchLower) ||
                (item.deletedBy?.toLowerCase() || '').includes(searchLower) ||
                (item.deletedFrom?.toLowerCase() || '').includes(searchLower)
            );
        }

        return searchFiltered;
    }, [deletedHistoryData, recycleBinSearch]);

    // SHOW ALL DATA WITHOUT FILTERING FOR EXCAVATOR
    const allPending = useMemo(() => {
        let filtered = processed.filter(l => !l.locatesCalled);
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(l =>
                l.workOrderNumber?.toLowerCase().includes(searchLower) ||
                l.customerName?.toLowerCase().includes(searchLower) ||
                l.street?.toLowerCase().includes(searchLower) ||
                l.city?.toLowerCase().includes(searchLower) ||
                l.techName?.toLowerCase().includes(searchLower)
            );
        }
        return filtered;
    }, [processed, searchTerm]);

    const inProgress = useMemo(() =>
        processed.filter(l => l.locatesCalled && !l.isExpired && l.workflowStatus !== 'COMPLETE'), [processed]);

    const completed = useMemo(() =>
        processed.filter(l => (l.locatesCalled && l.isExpired) || l.workflowStatus === 'COMPLETE'), [processed]);

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
        markCalledMutation.mutate({ id, callType });
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
        setCompleteDialogOpen(false);
    };

    const confirmSoftDelete = (selectionSet, section) => {
        if (selectionSet.size === 0) return;
        setSelectedForDeletion(selectionSet);
        setDeletionSection(section);
        setDeleteDialogOpen(true);
    };

    const executeSoftDelete = () => {
        softDeleteBulkMutation.mutate(selectedForDeletion);
        setDeleteDialogOpen(false);
        setSelectedForDeletion(new Set());
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

        const allPageIds = new Set(currentPageItems.map(item => `${item.dashboardId}_${item.deletedOrderId}`));
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
        const itemsToRestore = Array.from(selectedRecycleBinItems).map(itemKey => {
            const [dashboardId, deletedOrderId] = itemKey.split('_');
            return { dashboardId, deletedOrderId };
        });
        bulkRestoreMutation.mutate(itemsToRestore);
        setRestoreDialogOpen(false);
    };

    const confirmBulkPermanentDelete = () => {
        if (selectedRecycleBinItems.size === 0) return;
        setPermanentDeleteDialogOpen(true);
    };

    const executeBulkPermanentDelete = () => {
        const itemsToDelete = Array.from(selectedRecycleBinItems).map(itemKey => {
            const [dashboardId, deletedOrderId] = itemKey.split('_');
            return { dashboardId, deletedOrderId };
        });
        bulkPermanentDeleteMutation.mutate(itemsToDelete);
        setPermanentDeleteDialogOpen(false);
    };

    const confirmClearAllRecycleBin = () => {
        if (recycleBinItems.length === 0) return;
        setClearAllDialogOpen(true);
    };

    const executeClearAllRecycleBin = () => {
        clearAllRecycleBinMutation.mutate();
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
            restoreFromRecycleBinMutation.mutate({
                dashboardId: selectedSingleItem.dashboardId,
                deletedOrderId: selectedSingleItem.deletedOrderId
            });
        }
    };

    const executeSinglePermanentDelete = () => {
        if (selectedSingleItem) {
            permanentDeleteFromRecycleBinMutation.mutate({
                dashboardId: selectedSingleItem.dashboardId,
                deletedOrderId: selectedSingleItem.deletedOrderId
            });
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
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
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

    const pendingPageItems = allPending.slice(
        pagePending * rowsPerPagePending,
        pagePending * rowsPerPagePending + rowsPerPagePending
    );

    const inProgressPageItems = inProgress.slice(
        pageInProgress * rowsPerPageInProgress,
        pageInProgress * rowsPerPageInProgress + rowsPerPageInProgress
    );

    const completedPageItems = completed.slice(
        pageCompleted * rowsPerPageCompleted,
        pageCompleted * rowsPerPageCompleted + rowsPerPageCompleted
    );

    const recycleBinPageItems = recycleBinItems.slice(
        recycleBinPage * recycleBinRowsPerPage,
        recycleBinPage * recycleBinRowsPerPage + recycleBinRowsPerPage
    );

    return (
        <Box>
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
                        Dispatch and monitor locate requests efficiently
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<Trash2 size={16} />}
                    onClick={() => setRecycleBinOpen(true)}
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
                    Recycle Bin ({recycleBinCount})
                </Button>
            </Box>

            {/* UPDATED SECTION - Now shows all pending work orders, not just excavator */}
            <Section
                title="Pending Locates"
                color={ORANGE_COLOR}
                count={allPending.length}
                selectedCount={selectedPending.size}
                onDelete={() => confirmSoftDelete(selectedPending, 'Pending Locates')}
                additionalActions={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <StyledTextField
                            size="small"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{
                                width: 200,
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
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => setSearchTerm('')}
                                            edge="end"
                                            sx={{ p: 0.5 }}
                                        >
                                            <X size={16} />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Stack>
                }
            >
                <LocateTable
                    items={pendingPageItems}
                    selected={selectedPending}
                    onToggleSelect={(id) => toggleSelection(setSelectedPending, id)}
                    onToggleAll={() => setSelectedPending(toggleAllSelection(allPending, pendingPageItems, selectedPending))}
                    onMarkCalled={handleMarkCalled}
                    color={ORANGE_COLOR}
                    showCallAction
                    totalCount={allPending.length}
                    page={pagePending}
                    rowsPerPage={rowsPerPagePending}
                    onPageChange={handleChangePagePending}
                    onRowsPerPageChange={handleChangeRowsPerPagePending}
                    markCalledMutation={markCalledMutation}
                />
            </Section>

            <Section
                title="In Progress"
                color={BLUE_COLOR}
                count={inProgress.length}
                selectedCount={selectedInProgress.size}
                onDelete={() => confirmSoftDelete(selectedInProgress, 'In Progress')}
                additionalActions={
                    selectedInProgress.size > 0 ? (
                        <Stack direction="row" spacing={1} alignItems="center">
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
                                    height: '30px',
                                    px: 1.5,
                                    bgcolor: GREEN_COLOR,
                                    '&:hover': {
                                        bgcolor: alpha(GREEN_COLOR, 0.9),
                                    },
                                }}
                            >
                                Complete ({selectedInProgress.size})
                            </Button>
                        </Stack>
                    ) : null
                }
                showTimer
            >
                <LocateTable
                    items={inProgressPageItems}
                    selected={selectedInProgress}
                    onToggleSelect={(id) => toggleSelection(setSelectedInProgress, id)}
                    onToggleAll={() => setSelectedInProgress(toggleAllSelection(inProgress, inProgressPageItems, selectedInProgress))}
                    onManualComplete={handleManualCompletion}
                    color={BLUE_COLOR}
                    showTimerColumn
                    showCalledBy
                    showManualCompleteAction={false}
                    currentTime={currentTime}
                    totalCount={inProgress.length}
                    page={pageInProgress}
                    rowsPerPage={rowsPerPageInProgress}
                    onPageChange={handleChangePageInProgress}
                    onRowsPerPageChange={handleChangeRowsPerPageInProgress}
                    completeWorkOrderManuallyMutation={completeWorkOrderManuallyMutation}
                />
            </Section>

            <Section
                title="Completed"
                color={GREEN_COLOR}
                count={completed.length}
                selectedCount={selectedCompleted.size}
                onDelete={() => confirmSoftDelete(selectedCompleted, 'Completed')}
            >
                <LocateTable
                    items={completedPageItems}
                    selected={selectedCompleted}
                    onToggleSelect={(id) => toggleSelection(setSelectedCompleted, id)}
                    onToggleAll={() => setSelectedCompleted(toggleAllSelection(completed, completedPageItems, selectedCompleted))}
                    color={GREEN_COLOR}
                    showCalledBy
                    showTimerColumn={false}
                    totalCount={completed.length}
                    page={pageCompleted}
                    rowsPerPage={rowsPerPageCompleted}
                    onPageChange={handleChangePageCompleted}
                    onRowsPerPageChange={handleChangeRowsPerPageCompleted}
                />
            </Section>

            <Modal
                open={recycleBinOpen}
                onClose={() => setRecycleBinOpen(false)}
                aria-labelledby="recycle-bin-modal"
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
                                <Trash2 size={20} />
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: TEXT_COLOR,
                                    mb: 0.5,
                                }}>
                                    Recycle Bin
                                </Typography>
                                <Typography variant="body2" sx={{
                                    fontSize: '0.85rem',
                                    color: GRAY_COLOR,
                                }}>
                                    {recycleBinItems.length} deleted item(s) • Restore or permanently delete
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                                size="small"
                                onClick={() => setRecycleBinOpen(false)}
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
                                checked={recycleBinPageItems.length > 0 && recycleBinPageItems.every(item =>
                                    selectedRecycleBinItems.has(`${item.dashboardId}_${item.deletedOrderId}`)
                                )}
                                indeterminate={
                                    recycleBinPageItems.length > 0 &&
                                    recycleBinPageItems.some(item =>
                                        selectedRecycleBinItems.has(`${item.dashboardId}_${item.deletedOrderId}`)
                                    ) &&
                                    !recycleBinPageItems.every(item =>
                                        selectedRecycleBinItems.has(`${item.dashboardId}_${item.deletedOrderId}`)
                                    )
                                }
                                onChange={toggleAllRecycleBinSelection}
                                sx={{ padding: '4px' }}
                            />
                            <StyledTextField
                                size="small"
                                placeholder="Search deleted items..."
                                value={recycleBinSearch}
                                fullWidth
                                onChange={(e) => setRecycleBinSearch(e.target.value)}
                                sx={{
                                    width: 250,
                                    '& .MuiInputBase-root': {
                                        fontSize: '0.8rem',
                                    },
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search size={16} color={GRAY_COLOR} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: recycleBinSearch && (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => setRecycleBinSearch('')}
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
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<RotateCcw size={14} />}
                                onClick={confirmBulkRestore}
                                disabled={selectedRecycleBinItems.size === 0 || bulkRestoreMutation.isPending}
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
                                Restore ({selectedRecycleBinItems.size})
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Trash2 size={14} />}
                                onClick={confirmBulkPermanentDelete}
                                disabled={selectedRecycleBinItems.size === 0 || bulkPermanentDeleteMutation.isPending}
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
                                Delete ({selectedRecycleBinItems.size})
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Trash2 size={14} />}
                                onClick={confirmClearAllRecycleBin}
                                disabled={recycleBinItems.length === 0 || clearAllRecycleBinMutation.isPending}
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
                                Clear All ({recycleBinItems.length})
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {isRecycleBinLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                <CircularProgress size={24} sx={{ color: PURPLE_COLOR }} />
                            </Box>
                        ) : recycleBinItems.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Trash2 size={48} color={alpha(GRAY_COLOR, 0.3)} />
                                <Typography variant="body2" sx={{
                                    mt: 2,
                                    color: GRAY_COLOR,
                                    fontSize: '0.9rem',
                                }}>
                                    Recycle bin is empty
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
                                            <TableCell>Customer</TableCell>
                                            <TableCell>Address</TableCell>
                                            <TableCell>Deleted By</TableCell>
                                            <TableCell>Deleted At</TableCell>
                                            <TableCell>Deleted From</TableCell>
                                            <TableCell width={150}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {recycleBinPageItems.map((item) => {
                                            const itemKey = `${item.dashboardId}_${item.deletedOrderId}`;
                                            const isSelected = selectedRecycleBinItems.has(itemKey);
                                            const address = parseDashboardAddress(item.customerAddress || '');
                                            const deletedBy = item.deletedBy || 'Unknown';
                                            const deletedByEmail = item.deletedByEmail || '';
                                            const deletedFrom = item.deletedFrom || 'Unknown';
                                            const workOrderNumber = item.workOrderNumber || 'N/A';
                                            const customerName = item.customerName || 'Unknown';
                                            const type = item.type || 'STANDARD';

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
                                                            onChange={() => toggleRecycleBinSelection(itemKey)}
                                                            sx={{ padding: '4px' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: '0.85rem',
                                                            fontWeight: 500,
                                                            color: TEXT_COLOR,
                                                        }}>
                                                            {workOrderNumber}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{
                                                            fontSize: '0.75rem',
                                                            color: GRAY_COLOR,
                                                        }}>
                                                            {type}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: '0.85rem',
                                                            color: TEXT_COLOR,
                                                        }}>
                                                            {customerName}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: '0.85rem',
                                                            color: TEXT_COLOR,
                                                            mb: 0.5,
                                                        }}>
                                                            {address.street || '—'}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{
                                                            fontSize: '0.75rem',
                                                            color: GRAY_COLOR,
                                                        }}>
                                                            {[address.city, address.state, address.zip].filter(Boolean).join(', ')}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box>
                                                            <Typography variant="body2" sx={{
                                                                fontSize: '0.85rem',
                                                                color: TEXT_COLOR,
                                                            }}>
                                                                {deletedBy}
                                                            </Typography>
                                                            {deletedByEmail && (
                                                                <Typography variant="caption" sx={{
                                                                    fontSize: '0.75rem',
                                                                    color: GRAY_COLOR,
                                                                }}>
                                                                    {deletedByEmail}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: '0.85rem',
                                                            color: TEXT_COLOR,
                                                        }}>
                                                            {formatDateShort(item.deletedAt)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={deletedFrom}
                                                            size="small"
                                                            sx={{
                                                                fontSize: '0.7rem',
                                                                height: '20px',
                                                                backgroundColor: alpha(PURPLE_COLOR, 0.1),
                                                                color: PURPLE_COLOR,
                                                                border: `1px solid ${alpha(PURPLE_COLOR, 0.2)}`,
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={0.5}>
                                                            <Tooltip title="Restore">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleSingleRestore(item)}
                                                                    disabled={restoreFromRecycleBinMutation.isPending}
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
                                                                    onClick={() => handleSinglePermanentDelete(item)}
                                                                    disabled={permanentDeleteFromRecycleBinMutation.isPending}
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

                    {recycleBinItems.length > 0 && (
                        <Box sx={{
                            borderTop: `1px solid ${alpha(PURPLE_COLOR, 0.1)}`,
                            p: 1,
                        }}>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                component="div"
                                count={recycleBinItems.length}
                                rowsPerPage={recycleBinRowsPerPage}
                                page={recycleBinPage}
                                onPageChange={handleChangeRecycleBinPage}
                                onRowsPerPageChange={handleChangeRecycleBinRowsPerPage}
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

            {/* Clear All Recycle Bin Confirmation Dialog */}
            <Dialog
                open={clearAllDialogOpen}
                onClose={() => setClearAllDialogOpen(false)}
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
                                Clear All Recycle Bin
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 400,
                            }}>
                                Permanently delete all items from recycle bin
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
                        Are you sure you want to permanently delete <strong>{recycleBinItems.length} item(s)</strong> from the recycle bin?
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
                                All items will be permanently deleted and cannot be recovered. This includes all selected and unselected items in the recycle bin.
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1.5 }}>
                    <Button
                        onClick={() => setClearAllDialogOpen(false)}
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
                        onClick={executeClearAllRecycleBin}
                        variant="contained"
                        color="error"
                        startIcon={<Trash2 size={16} />}
                        disabled={clearAllRecycleBinMutation.isPending}
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
                        {clearAllRecycleBinMutation.isPending ? 'Clearing...' : 'Clear All Permanently'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Single Restore Confirmation Dialog */}
            <Dialog
                open={singleRestoreDialogOpen}
                onClose={() => setSingleRestoreDialogOpen(false)}
                maxWidth="sm"
                fullWidth
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
                        onClick={() => setSingleRestoreDialogOpen(false)}
                        variant='outlined'
                        sx={{
                            textTransform: 'none',
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
                        }}
                    >
                        {restoreFromRecycleBinMutation.isPending ? 'Restoring...' : 'Restore'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Single Permanent Delete Confirmation Dialog */}
            <Dialog
                open={singleDeleteDialogOpen}
                onClose={() => setSingleDeleteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
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
                    <Button onClick={() => setSingleDeleteDialogOpen(false)}
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

            {/* Bulk Restore Confirmation Dialog */}
            <Dialog
                open={restoreDialogOpen}
                onClose={() => setRestoreDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <RotateCcw size={20} color={GREEN_COLOR} />
                        <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Restore Items
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Are you sure you want to restore {selectedRecycleBinItems.size} item(s) from the recycle bin?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setRestoreDialogOpen(false)}
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
                        color="success"
                        onClick={executeBulkRestore}
                        disabled={bulkRestoreMutation.isPending}
                        startIcon={<RotateCcw size={16} />}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 400,
                        }}
                    >
                        {bulkRestoreMutation.isPending ? 'Restoring...' : 'Restore'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Permanent Delete Confirmation Dialog */}
            <Dialog
                open={permanentDeleteDialogOpen}
                onClose={() => setPermanentDeleteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
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
                            fontSize: '0.85rem',
                            fontWeight: 400,
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
                            fontSize: '0.85rem',
                            fontWeight: 400,
                        }}
                    >
                        {bulkPermanentDeleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                    </Button>
                </DialogActions>
            </Dialog>

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
                        startIcon={<Trash2 size={16} />}
                        disabled={softDeleteBulkMutation.isPending}
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
                        {softDeleteBulkMutation.isPending ? 'Moving...' : 'Move to Recycle Bin'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Manual Completion Dialog */}
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

const Section = ({
    title,
    color,
    count,
    selectedCount,
    onDelete,
    children,
    showTimer = false,
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
                {showTimer && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Timer size={16} color={GRAY_COLOR} />
                        <Typography
                            variant="body2"
                            sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 400,
                            }}
                        >
                            Real-time countdown active
                        </Typography>
                    </Box>
                )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {additionalActions}
                {selectedCount > 0 && (
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
                        Delete ({selectedCount})
                    </Button>
                )}
            </Box>
        </Box>
        {children}
    </Paper>
);

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
    currentTime,
    totalCount,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    markCalledMutation,
    completeWorkOrderManuallyMutation,
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
                        {showCallAction && (
                            <TableCell
                                width={220}
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    py: 1.5,
                                }}
                            >
                                Call Action
                            </TableCell>
                        )}
                        {showTimerColumn && (
                            <TableCell
                                width={180}
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    py: 1.5,
                                }}
                            >
                                Time Remaining
                            </TableCell>
                        )}
                        <TableCell sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            py: 1.5,
                        }}>
                            Customer
                        </TableCell>
                        <TableCell sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            py: 1.5,
                        }}>
                            Address
                        </TableCell>
                        <TableCell sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            py: 1.5,
                        }}>
                            Date
                        </TableCell>
                        <TableCell sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            py: 1.5,
                        }}>
                            Technician
                        </TableCell>
                        {showCalledBy && (
                            <TableCell
                                width={200}
                                sx={{
                                    color: TEXT_COLOR,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    py: 1.5,
                                }}
                            >
                                Called By
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
                                (showCalledBy ? 1 : 0)
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

                                    {showCallAction && (
                                        <TableCell sx={{ py: 1.5 }}>
                                            {item.locatesCalled ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <CheckCircle size={18} color={RED_COLOR} />
                                                    <Chip
                                                        label={item.callType || 'Called'}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: item.callType === 'EMERGENCY'
                                                                ? alpha(RED_COLOR, 0.1)
                                                                : alpha(BLUE_COLOR, 0.1),
                                                            color: item.callType === 'EMERGENCY' ? RED_COLOR : BLUE_COLOR,
                                                            border: `1px solid ${item.callType === 'EMERGENCY'
                                                                ? alpha(RED_COLOR, 0.2)
                                                                : alpha(BLUE_COLOR, 0.2)}`,
                                                            fontSize: '0.75rem',
                                                            fontWeight: 500,
                                                            height: '22px',
                                                            '& .MuiChip-label': {
                                                                px: 1,
                                                            },
                                                        }}
                                                    />
                                                </Box>
                                            ) : (
                                                <Stack direction="row" spacing={1}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => onMarkCalled(item.workOrderId || item.id, 'STANDARD')}
                                                        startIcon={<PhoneCall size={14} />}
                                                        disabled={markCalledMutation?.isPending}
                                                        sx={{
                                                            textTransform: 'none',
                                                            fontSize: '0.75rem',
                                                            height: '30px',
                                                            px: 1.5,
                                                        }}
                                                    >
                                                        {markCalledMutation?.isPending && markCalledMutation.variables?.id === (item.workOrderId || item.id) ? 'Calling...' : 'Standard'}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        onClick={() => onMarkCalled(item.workOrderId || item.id, 'EMERGENCY')}
                                                        startIcon={<AlertTriangle size={14} />}
                                                        disabled={markCalledMutation?.isPending}
                                                        sx={{
                                                            textTransform: 'none',
                                                            fontSize: '0.75rem',
                                                            height: '30px',
                                                            px: 1.5,
                                                        }}
                                                    >
                                                        {markCalledMutation?.isPending && markCalledMutation.variables?.id === (item.workOrderId || item.id) ? 'Calling...' : 'Emergency'}
                                                    </Button>
                                                </Stack>
                                            )}
                                        </TableCell>
                                    )}

                                    {showTimerColumn && (
                                        <TableCell sx={{ py: 1.5 }}>
                                            {item.timeRemainingText ? (
                                                <Tooltip title={item.timeRemainingDetail}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Clock size={16} color={item.timeRemainingColor} />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                color: item.timeRemainingColor,
                                                                fontSize: '0.85rem',
                                                                fontWeight: item.timeRemainingText === 'EXPIRED' ? 600 : 400,
                                                                fontFamily: item.callType === 'EMERGENCY' ? 'monospace' : 'inherit'
                                                            }}
                                                        >
                                                            {item.timeRemainingText}
                                                        </Typography>
                                                    </Box>
                                                </Tooltip>
                                            ) : (
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: GRAY_COLOR,
                                                        fontSize: '0.85rem',
                                                        fontWeight: 400,
                                                    }}
                                                >
                                                    —
                                                </Typography>
                                            )}
                                        </TableCell>
                                    )}

                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            {hasCheckmark && (
                                                <Tooltip title={`Called by ${item.calledByName}`}>
                                                    <CheckCircle size={16} color={RED_COLOR} />
                                                </Tooltip>
                                            )}
                                            <Box>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: TEXT_COLOR,
                                                        fontSize: '0.85rem',
                                                        fontWeight: 500,
                                                        mb: 0.25,
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
                                                        mb: 0.5,
                                                    }}
                                                >
                                                    WO: {item.workOrderNumber}
                                                </Typography>
                                                {item.priorityName && item.priorityName !== 'Standard' && (
                                                    <Chip
                                                        label={item.priorityName}
                                                        size="small"
                                                        sx={{
                                                            color: TEXT_COLOR,
                                                            fontSize: '0.7rem',
                                                            height: '20px',
                                                            fontWeight: 500,
                                                            backgroundColor: alpha(color, 0.1),
                                                            border: `1px solid ${alpha(color, 0.2)}`,
                                                            '& .MuiChip-label': {
                                                                px: 1,
                                                            },
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>

                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: TEXT_COLOR,
                                                fontSize: '0.85rem',
                                                fontWeight: 400,
                                                mb: 0.25,
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
                                                }}
                                            >
                                                {location}
                                            </Typography>
                                        )}
                                    </TableCell>

                                    <TableCell sx={{ py: 1.5 }}>
                                        <Stack spacing={0.5}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: GRAY_COLOR,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 400,
                                                }}
                                            >
                                                Requested: {formatDate(item.requestedDate)}
                                            </Typography>
                                            {item.calledAt && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: BLUE_COLOR,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    Called: {formatDate(item.calledAt)}
                                                </Typography>
                                            )}
                                            {item.completionDate && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: GRAY_COLOR,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 400,
                                                    }}
                                                >
                                                    Due: {formatDate(item.completionDate)}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </TableCell>

                                    <TableCell sx={{ py: 1.5 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar sx={{
                                                width: 28,
                                                height: 28,
                                                bgcolor: color,
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                            }}>
                                                {item.techName?.charAt(0) || '?'}
                                            </Avatar>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: TEXT_COLOR,
                                                    fontSize: '0.85rem',
                                                    fontWeight: 400,
                                                }}
                                            >
                                                {item.techName}
                                            </Typography>
                                        </Stack>
                                    </TableCell>

                                    {showCalledBy && (
                                        <TableCell sx={{ py: 1.5 }}>
                                            {item.calledByName ? (
                                                <Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <User size={14} color={TEXT_COLOR} />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                color: TEXT_COLOR,
                                                                fontSize: '0.85rem',
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {item.calledByName}
                                                        </Typography>
                                                    </Box>
                                                    {item.calledByEmail && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                            <Mail size={12} color={GRAY_COLOR} />
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: GRAY_COLOR,
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 400,
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
                                                        fontSize: '0.85rem',
                                                        fontWeight: 400,
                                                    }}
                                                >
                                                    —
                                                </Typography>
                                            )}
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

export default Locates;