import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  Stack,
  alpha,
  Button,
  Tooltip
} from '@mui/material';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Bell,
  MapPin,
  Wrench,
  Clock,
  TrendingUp,
  Check,
  X
} from 'lucide-react';
import { useNotifications } from '../../hook/useNotifications';
import { Helmet } from 'react-helmet-async';
import axiosInstance from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const GRAY_COLOR = '#6b7280';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // For dates within last 7 days
    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })}`;
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })}`;
    } else if (diffInDays < 7) {
      return `${date.toLocaleDateString('en-US', {
        weekday: 'short',
      })} at ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })}`;
    }

    // For older dates
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).replace(',', '');
  } catch (e) {
    console.error('Error formatting detailed date:', e);
    return '—';
  }
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

export default function Notifications() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { notifications: combinedData, isLoading, error, refetch } = useNotifications();

  // Get user from localStorage or your auth context
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Get dashboard base path based on user role
  const getDashboardBasePath = () => {
    switch (user?.role?.toUpperCase()) {
      case 'SUPER-ADMIN':
      case 'SUPERADMIN':
        return '/super-admin-dashboard';
      case 'MANAGER':
        return '/manager-dashboard';
      case 'TECH':
        return '/tech-dashboard';
      default:
        return '/';
    }
  };

  // Process and combine notifications - Show ALL notifications from last 30 days (not just latest 10)
  const notifications = useMemo(() => {
    if (!combinedData) return [];

    const { locates = [], workOrders = [] } = combinedData;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const allNotifications = [];

    // Process locates data
    locates.forEach((locate) => {
      const createdAt = locate.created_at || locate.created_date;
      if (!createdAt) return;

      const createdDate = new Date(createdAt);
      if (createdDate >= oneMonthAgo) {
        const addr = parseDashboardAddress(locate.customer_address || '');

        allNotifications.push({
          id: `locate-${locate.id}`,
          type: 'locate',
          title: 'New Locate Request',
          description: `New locate request added for address: "${addr.street || 'unknown address'}"`,
          address: addr.original || 'Unknown address',
          workOrderNumber: locate.work_order_number || 'N/A',
          customerName: locate.customer_name || 'Unknown',
          timestamp: createdDate,
          formattedTime: formatDate(createdAt),
          icon: MapPin,
          color: BLUE_COLOR,
          rawData: locate,
          is_seen: locate.is_seen || false,
          entityId: locate.id
        });
      }
    });

    // Process work orders data (RME)
    workOrders.forEach((workOrder) => {
      const elapsedTime = workOrder.elapsed_time;
      if (!elapsedTime) return;

      try {
        const elapsedDate = new Date(elapsedTime);

        if (elapsedDate >= oneMonthAgo) {
          const address = workOrder.full_address || workOrder.full_address || 'Unknown address';
          const addr = parseDashboardAddress(address);

          allNotifications.push({
            id: `rme-${workOrder.id}`,
            type: 'RME',
            title: 'New RME Added',
            description: `New RME created for address: "${addr.street || 'unknown address'}"`,
            address: addr.original || 'Unknown address',
            rmeNumber: workOrder.wo_number || workOrder.wo_number || workOrder.id || 'N/A',
            customerName: workOrder.customer_name || 'Unknown',
            timestamp: elapsedDate,
            formattedTime: formatDate(elapsedTime),
            icon: Wrench,
            color: GREEN_COLOR,
            rawData: workOrder,
            is_seen: workOrder.is_seen || false,
            entityId: workOrder.id
          });
        }
      } catch (e) {
        console.error('Error parsing work order elapsed_time:', e);
      }
    });

    // Sort by timestamp (newest first)
    return allNotifications.sort((a, b) => b.timestamp - a.timestamp);
  }, [combinedData]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups = {};

    const formatGroupDate = (dateString) => {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
    };

    notifications.forEach((notification) => {
      const dateKey = formatGroupDate(notification.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notification);
    });

    return groups;
  }, [notifications]);

  // Get counts by type and seen/unseen status
  const counts = useMemo(() => {
    const locateCount = notifications.filter(n => n.type === 'locate').length;
    const rmeCount = notifications.filter(n => n.type === 'RME').length;
    const unseenCount = notifications.filter(n => !n.is_seen).length;
    const seenCount = notifications.filter(n => n.is_seen).length;

    return {
      total: notifications.length,
      locateCount,
      rmeCount,
      unseenCount,
      seenCount
    };
  }, [notifications]);

  // Single mutation for marking a single notification as seen
  const markAsSeenMutation = useMutation({
    mutationFn: async (notification) => {
      if (notification.type === 'RME') {
        // Mark RME/Work Order as seen
        await axiosInstance.post('/work-orders-today/mark-seen/', {
          ids: [notification.entityId]
        });
      } else if (notification.type === 'locate') {
        // Mark Locate as seen
        await axiosInstance.post('/locates/mark-seen/', {
          ids: [notification.entityId]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications-data']);
      refetch();
    },
    onError: (error) => {
      console.error('Error marking notification as seen:', error);
    }
  });

  // Bulk mark all as seen mutation
  const markAllAsSeenMutation = useMutation({
    mutationFn: async () => {
      // Separate IDs by type
      const locateIds = notifications
        .filter(n => n.type === 'locate' && !n.is_seen)
        .map(n => n.entityId);
      
      const workOrderIds = notifications
        .filter(n => n.type === 'RME' && !n.is_seen)
        .map(n => n.entityId);

      // Make API calls for each type if there are IDs
      const promises = [];

      if (locateIds.length > 0) {
        promises.push(
          axiosInstance.post('/locates/mark-seen/', { ids: locateIds })
        );
      }

      if (workOrderIds.length > 0) {
        promises.push(
          axiosInstance.post('/work-orders-today/mark-seen/', { ids: workOrderIds })
        );
      }

      // Wait for all API calls to complete
      await Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate and refetch notifications data
      queryClient.invalidateQueries(['notifications-data']);
      refetch();
    },
    onError: (error) => {
      console.error('Error marking all notifications as seen:', error);
    }
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries(['notifications-data']);
    refetch();
  };

  const handleMarkAllSeen = () => {
    if (counts.unseenCount > 0) {
      markAllAsSeenMutation.mutate();
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  };

  const handleNotificationClick = (notification) => {
    // Mark as seen if not already seen
    if (!notification.is_seen) {
      markAsSeenMutation.mutate(notification);
    }

    // Get the base dashboard path
    const dashboardBasePath = getDashboardBasePath();

    // Scroll to top before navigation (optional)
    scrollToTop();

    // Redirect based on notification type
    if (notification.type === 'locate') {
      navigate(`${dashboardBasePath}/locates`, { 
        state: { 
          highlightLocateId: notification.entityId,
          fromNotifications: true,
          scrollToTop: true
        }
      });
    } else if (notification.type === 'RME') {
      navigate(`${dashboardBasePath}/health-department-report-tracking/rme`, { 
        state: { 
          highlightWorkOrderId: notification.entityId,
          fromNotifications: true,
          scrollToTop: true 
        }
      });
    }
  };

  // Function to mark a single notification as seen without redirecting
  const handleMarkNotificationSeen = (notification, event) => {
    // Stop event propagation to prevent the ListItem onClick from firing
    event.stopPropagation();
    
    // Mark the notification as seen
    markAsSeenMutation.mutate(notification);
  };

  // Scroll to top on component mount (when coming from other pages)
  React.useEffect(() => {
    scrollToTop();
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{ mt: 2 }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        }
      >
        Error loading notifications: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Helmet>
        <title>Notifications | Sterling Septic & Plumbing LLC</title>
        <meta name="description" content="View and manage notifications" />
      </Helmet>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
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
              Notifications
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: GRAY_COLOR,
                fontSize: '0.8rem',
                fontWeight: 400,
              }}
            >
              Last 30 days activity
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {counts.unseenCount > 0 && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Check size={14} />}
                onClick={handleMarkAllSeen}
                disabled={markAllAsSeenMutation.isLoading}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  color: GREEN_COLOR,
                  borderColor: alpha(GREEN_COLOR, 0.3),
                  '&:hover': {
                    borderColor: GREEN_COLOR,
                    backgroundColor: alpha(GREEN_COLOR, 0.05),
                  },
                  '&.Mui-disabled': {
                    color: alpha(GREEN_COLOR, 0.5),
                    borderColor: alpha(GREEN_COLOR, 0.2),
                  }
                }}
              >
                Mark all read
              </Button>
            )}
            
            <IconButton
              onClick={() => {
                handleRefresh();
                scrollToTop(); // Also scroll to top on refresh
              }}
              size="small"
              sx={{
                color: GRAY_COLOR,
                '&:hover': {
                  backgroundColor: alpha(GRAY_COLOR, 0.1)
                }
              }}
            >
              <TrendingUp size={18} />
            </IconButton>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              flex: 1,
              borderRadius: '8px',
              border: `1px solid ${alpha(BLUE_COLOR, 0.2)}`,
              bgcolor: alpha(BLUE_COLOR, 0.05),
            }}
          >
            <Typography variant="caption" sx={{ color: GRAY_COLOR, fontWeight: 500, display: 'block', mb: 0.5 }}>
              Total Notifications
            </Typography>
            <Typography variant="h5" sx={{ color: TEXT_COLOR, fontWeight: 600 }}>
              {counts.total}
            </Typography>
          </Paper>
          
          <Paper
            elevation={0}
            sx={{
              p: 2,
              flex: 1,
              borderRadius: '8px',
              border: `1px solid ${alpha(GREEN_COLOR, 0.2)}`,
              bgcolor: alpha(GREEN_COLOR, 0.05),
            }}
          >
            <Typography variant="caption" sx={{ color: GRAY_COLOR, fontWeight: 500, display: 'block', mb: 0.5 }}>
              New (Unread)
            </Typography>
            <Typography variant="h5" sx={{ color: TEXT_COLOR, fontWeight: 600 }}>
              {counts.unseenCount}
            </Typography>
          </Paper>
        </Stack>
      </Box>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: '8px',
            border: `1px solid ${alpha(GRAY_COLOR, 0.1)}`,
          }}
        >
          <Bell size={48} color={alpha(GRAY_COLOR, 0.3)} />
          <Typography variant="h6" sx={{ mt: 2, color: GRAY_COLOR, fontWeight: 500 }}>
            No recent activity
          </Typography>
          <Typography variant="body2" sx={{ color: GRAY_COLOR, mt: 1 }}>
            No new locates or RME in the last 30 days
          </Typography>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: '8px',
            border: `1px solid ${alpha(GRAY_COLOR, 0.1)}`,
            overflow: 'hidden',
          }}
        >
          {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
            <Box key={date}>
              {/* Date Header */}
              <Box sx={{
                p: 2,
                bgcolor: alpha(GRAY_COLOR, 0.03),
                borderBottom: `1px solid ${alpha(GRAY_COLOR, 0.1)}`,
                position: 'sticky',
                top: 0,
                zIndex: 1
              }}>
                <Typography variant="subtitle2" sx={{ 
                  color: GRAY_COLOR, 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px' 
                }}>
                  {date}
                </Typography>
              </Box>

              {/* Notifications for this date */}
              <List disablePadding>
                {dateNotifications.map((notification, index) => {
                  const Icon = notification.icon;
                  const isLast = index === dateNotifications.length - 1;

                  return (
                    <React.Fragment key={notification.id}>
                      <ListItem
                        button
                        onClick={() => handleNotificationClick(notification)}
                        disabled={markAsSeenMutation.isLoading}
                        sx={{
                          p: 2,
                          backgroundColor: notification.is_seen ? 'transparent' : alpha(notification.color, 0.04),
                          '&:hover': {
                            bgcolor: notification.is_seen
                              ? alpha(notification.color, 0.08)
                              : alpha(notification.color, 0.12),
                          },
                          transition: 'background-color 0.2s ease',
                          cursor: 'pointer',
                          position: 'relative',
                          '&.Mui-disabled': {
                            opacity: 0.7,
                            cursor: 'not-allowed',
                          },
                          '&:hover .close-button': {
                            opacity: 1,
                          }
                        }}
                      >
                        {/* Close Button (X) - Only visible on hover for unread notifications */}
                        {!notification.is_seen && (
                          <Tooltip title="Mark as read" placement="top">
                            <IconButton
                              size="small"
                              className="close-button"
                              onClick={(e) => handleMarkNotificationSeen(notification, e)}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                width: 24,
                                height: 24,
                                opacity: 0,
                                transition: 'opacity 0.2s ease',
                                backgroundColor: alpha(GRAY_COLOR, 0.1),
                                color: GRAY_COLOR,
                                '&:hover': {
                                  backgroundColor: alpha(GRAY_COLOR, 0.2),
                                },
                                zIndex: 2,
                              }}
                            >
                              <X size={14} />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <ListItemIcon sx={{ minWidth: 44 }}>
                          <Box sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(notification.color, 0.1),
                            color: notification.color,
                          }}>
                            <Icon size={16} />
                          </Box>
                        </ListItemIcon>
                        
                        <ListItemText
                          primary={
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              justifyContent: 'space-between', 
                              mb: 0.5,
                              pr: notification.is_seen ? 0 : 3 // Add padding for close button space
                            }}>
                              <Typography variant="body2" sx={{
                                color: TEXT_COLOR,
                                fontWeight: notification.is_seen ? 500 : 600,
                                fontSize: '0.79rem',
                                lineHeight: 1.4,
                                flex: 1
                              }}>
                                {notification.description}
                              </Typography>
                              
                              <Chip
                                label={notification.type === 'locate' ? 'Locate' : 'RME'}
                                size="small"
                                sx={{
                                  height: '20px',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  backgroundColor: alpha(notification.color, 0.1),
                                  color: notification.color,
                                  border: `1px solid ${alpha(notification.color, 0.2)}`,
                                  ml: 1,
                                  flexShrink: 0
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                              <Typography variant="caption" sx={{
                                color: GRAY_COLOR,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                fontSize: '0.65rem'
                              }}>
                                <Clock size={12} />
                                {notification.type === 'locate' ? 'WO' : 'WO'}: {notification.type === 'locate' ? notification.workOrderNumber : notification.rmeNumber}
                                <Box sx={{ mx: 0.5 }}>•</Box>
                                {notification.formattedTime}
                              </Typography>
                              
                              {notification.address && (
                                <Typography variant="caption" sx={{
                                  color: GRAY_COLOR,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  fontSize: '0.65rem'
                                }}>
                                  <MapPin size={12} />
                                  {notification.address}
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{ m: 0 }}
                        />
                        
                        {!notification.is_seen && (
                          <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: notification.color,
                            ml: 1
                          }} />
                        )}
                      </ListItem>
                      
                      {!isLast && (
                        <Divider sx={{ mx: 2, borderColor: alpha(GRAY_COLOR, 0.1) }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </List>
            </Box>
          ))}
        </Paper>
      )}

      {/* Summary Footer */}
      {notifications.length > 0 && (
        <Box sx={{
          mt: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 1
        }}>
          <Typography variant="caption" sx={{ color: GRAY_COLOR }}>
            Showing {notifications.length} notifications from the last 30 days
          </Typography>
          
          <Typography variant="caption" sx={{
            color: GRAY_COLOR,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                backgroundColor: BLUE_COLOR 
              }} />
              <span>{counts.locateCount} Locates</span>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                backgroundColor: GREEN_COLOR 
              }} />
              <span>{counts.rmeCount} RME</span>
            </Box>
          </Typography>
        </Box>
      )}
    </Box>
  );
}