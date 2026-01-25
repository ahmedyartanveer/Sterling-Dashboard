import React from 'react';
import { styled, alpha } from '@mui/material/styles';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useNotifications } from '../hook/useNotifications';
import axiosInstance from '../api/axios';

const colors = {
    primary: '#3182ce',
    primaryLight: '#ebf8ff',
    primaryDark: '#2c5282',
    activeBg: '#ebf8ff',
    activeText: '#3182ce',
    activeBorder: '#3182ce',
    drawerBg: '#ffffff',
    textPrimary: '#2d3748',
    textSecondary: '#718096',
    textTertiary: '#a0aec0',
    borderLight: '#e2e8f0',
    hoverBg: '#f7fafc',
    white: '#ffffff',
    black: '#000000',
    appBarBg: 'rgba(255, 255, 255, 0.1)',
    red: '#ef4444',
    green: '#10b981',
    blue: '#1976d2',
};

const HoverMenu = styled(Box)(({ theme }) => ({
    position: 'fixed',
    backgroundColor: colors.appBarBg,
    backdropFilter: 'blur(10px)',
    borderRadius: '6px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: `1px solid ${alpha('#ffffff', 0.2)}`,
    zIndex: theme.zIndex.drawer + 20,
    overflow: 'hidden',
    animation: 'fadeIn 0.15s ease-out',
    '@keyframes fadeIn': {
        from: { opacity: 0, transform: 'translateX(-5px)' },
        to: { opacity: 1, transform: 'translateX(0)' },
    },
}));

const HoverMenuItem = styled(Box)(({ theme }) => ({
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: colors.textPrimary,
    transition: 'all 0.2s ease',
    backgroundColor: 'transparent',
    '&:hover': {
        backgroundColor: alpha('#ffffff', 0.15),
        color: colors.primary,
    },
    '&.active': {
        backgroundColor: alpha(colors.primary, 0.2),
        color: colors.primary,
        borderLeft: `2px solid ${colors.activeBorder}`,
    },
}));

const NestedMenuItem = ({
    item,
    level = 0,
    isDrawerOpen,
    getActiveStyles,
    handleNavigation,
    isMobile,
    location,
    onCloseDrawer,
    onExpandToggle,
}) => {
    const isExpandable = item.isExpandable;
    const isExpanded = item.expanded;
    const [hoverMenuAnchor, setHoverMenuAnchor] = React.useState(null);
    const [hoverTimeout, setHoverTimeout] = React.useState(null);
    const [isMarkingAsSeen, setIsMarkingAsSeen] = React.useState(false);
    
    const { notifications, refetch } = useNotifications();

    const isItemActive = (path) => {
        if (!path) return false;
        const currentPath = location.pathname;
        if (currentPath === path) return true;
        if (path !== '/super-admin-dashboard' && path !== '/manager-dashboard' && path !== '/tech-dashboard' && currentPath.startsWith(path + '/')) {
            return true;
        }
        if (path === '/manager-dashboard' && currentPath === '/manager-dashboard') {
            return true;
        }
        if (path !== '/super-admin-dashboard' && path !== '/manager-dashboard' && path !== '/tech-dashboard' && currentPath === path) {
            return true;
        }
        return false;
    };

    const isActive = isItemActive(item.path);

    // Function to mark notifications as seen for a specific path
    const markNotificationsAsSeenForPath = async (path) => {
        if (!notifications || !notifications.locates || !notifications.workOrders) {
            return;
        }

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        try {
            switch (path) {
                case '/super-admin-dashboard/locates':
                    // Get all unseen locate IDs
                    const locateIds = notifications.locates
                        .filter(locate => {
                            const createdDate = new Date(locate.created_at || locate.created_date);
                            return createdDate >= oneMonthAgo && !locate.is_seen;
                        })
                        .map(locate => locate.id);

                    if (locateIds.length > 0) {
                        await axiosInstance.post('/locates/mark-seen/', {
                            ids: locateIds
                        });
                    }
                    break;

                case '/super-admin-dashboard/health-department-report-tracking/rme':
                    // Get all unseen RME IDs
                    const rmeIds = notifications.workOrders
                        .filter(workOrder => {
                            const elapsedDate = new Date(workOrder.elapsed_time);
                            return elapsedDate >= oneMonthAgo && !workOrder.is_seen;
                        })
                        .map(workOrder => workOrder.id);

                    if (rmeIds.length > 0) {
                        await axiosInstance.post('/work-orders-today/mark-seen/', {
                            ids: rmeIds
                        });
                    }
                    break;
            }

            // Immediately refetch notifications
            refetch();
        } catch (error) {
            console.error('Error marking notifications as seen:', error);
        } finally {
            setIsMarkingAsSeen(false);
        }
    };

    const handleMouseEnter = (event) => {
        if (!isDrawerOpen && !isMobile) {
            clearTimeout(hoverTimeout);
            setHoverMenuAnchor(event.currentTarget);
        }
    };

    const handleMouseLeave = () => {
        if (!isDrawerOpen && !isMobile) {
            const timeout = setTimeout(() => {
                setHoverMenuAnchor(null);
            }, 200);
            setHoverTimeout(timeout);
        }
    };

    const handleHoverMenuMouseEnter = () => {
        clearTimeout(hoverTimeout);
    };

    const handleHoverMenuMouseLeave = () => {
        const timeout = setTimeout(() => {
            setHoverMenuAnchor(null);
        }, 200);
        setHoverTimeout(timeout);
    };

    const handleItemClick = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        // If item is expandable and has no path, just toggle expansion
        if (isExpandable && !item.path) {
            if (onExpandToggle) {
                onExpandToggle(item.text);
            }
            return;
        }

        // If item has a path (navigation item), handle navigation
        if (item.path) {
            // Check if it's an external URL (starts with http:// or https://)
            if (item.path.startsWith('http://') || item.path.startsWith('https://')) {
                // Open external link in new tab
                window.open(item.path, '_blank');
            } else {
                // Mark notifications as seen for specific paths
                if (item.path === '/super-admin-dashboard/locates' || 
                    item.path === '/super-admin-dashboard/health-department-report-tracking/rme') {
                    setIsMarkingAsSeen(true);
                    await markNotificationsAsSeenForPath(item.path);
                }
                
                // Internal navigation - close drawer on mobile
                handleNavigation(item.path);
                if (isMobile && onCloseDrawer) {
                    onCloseDrawer();
                }
            }
        } else if (item.onClick) {
            item.onClick(event);
        }
        setHoverMenuAnchor(null);
    };

    const renderBadge = (count) => {
        if (!count || count <= 0) return null;

        return (
            <Badge
                badgeContent={count}
                color="error"
                sx={{
                    ml: 'auto',
                    mr: isExpandable ? 0.5 : 0,
                    '& .MuiBadge-badge': {
                        fontSize: '0.55rem',
                        height: '14px',
                        minWidth: '14px',
                        bgcolor: colors.red,
                    }
                }}
            />
        );
    };

    const mainButton = (
        <ListItemButton
            component="div"
            onClick={handleItemClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            disabled={isMarkingAsSeen}
            sx={[
                getActiveStyles(item.path),
                {
                    minHeight: 40,
                    flexDirection: isDrawerOpen ? 'row' : 'column',
                    justifyContent: isDrawerOpen ? 'flex-start' : 'center',
                    alignItems: 'center',
                    gap: isDrawerOpen ? 1.25 : 0.25,
                    px: isDrawerOpen ? 2.25 : 1.25,
                    py: isDrawerOpen ? 0.5 : 0.75,
                    pl: isDrawerOpen ? 2.25 + (level * 2) : 1.25,
                    '& .MuiListItemIcon-root': {
                        minWidth: 0,
                        mr: isDrawerOpen ? 1.25 : 0,
                        justifyContent: 'center',
                    },
                    '& .MuiListItemText-root': {
                        m: 0,
                        flex: 1,
                        display: isDrawerOpen ? 'block' : 'none', // Hide text when drawer is closed
                    },
                    textDecoration: 'none',
                    cursor: isMarkingAsSeen ? 'wait' : 'pointer',
                    opacity: isMarkingAsSeen ? 0.7 : 1,
                },
                isExpandable && {
                    pr: 1.25,
                }
            ]}
        >
            <ListItemIcon>
                {React.cloneElement(item.icon, {
                    sx: {
                        width: 18,
                        height: 18,
                        color: 'inherit',
                    }
                })}
            </ListItemIcon>
            {isDrawerOpen && (
                <ListItemText
                    primary={
                        <Typography sx={{
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            lineHeight: 1.2,
                            color: 'inherit',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            letterSpacing: '0.01em',
                        }}>
                            {item.text}
                            {isMarkingAsSeen && '...'}
                        </Typography>
                    }
                />
            )}
            {isDrawerOpen && item.hasCount && !isMarkingAsSeen && renderBadge(item.count)}
            {isExpandable && isDrawerOpen && (
                <ListItemIcon sx={{
                    minWidth: 0,
                    ml: 'auto',
                    color: 'inherit',
                    opacity: 0.7
                }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </ListItemIcon>
            )}
        </ListItemButton>
    );

    const wrappedButton = isDrawerOpen || !isMobile ? (
        mainButton
    ) : (
        <Tooltip
            title={item.text}
            placement="right"
            arrow
            componentsProps={{
                tooltip: {
                    sx: {
                        backgroundColor: colors.textPrimary,
                        fontSize: '0.75rem',
                        padding: '3px 6px',
                        borderRadius: '3px',
                    }
                },
                arrow: {
                    sx: {
                        color: colors.textPrimary,
                    }
                }
            }}
        >
            {mainButton}
        </Tooltip>
    );

    const renderHoverMenu = () => {
        if (!hoverMenuAnchor || isDrawerOpen || isMobile) return null;

        const rect = hoverMenuAnchor.getBoundingClientRect();
        const hasSubItems = item.subItems && item.subItems.length > 0;

        return (
            <HoverMenu
                onMouseEnter={handleHoverMenuMouseEnter}
                onMouseLeave={handleHoverMenuMouseLeave}
                sx={{
                    left: rect.right + 4,
                    top: rect.top,
                    minWidth: 180,
                    maxWidth: 250,
                }}
            >
                {/* Main item */}
                <HoverMenuItem
                    onClick={handleItemClick}
                    className={isActive ? 'active' : ''}
                    sx={{
                        fontWeight: 600,
                        borderBottom: hasSubItems ? `1px solid ${alpha('#ffffff', 0.2)}` : 'none',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {React.cloneElement(item.icon, { size: 16, color: isActive ? colors.primary : colors.textPrimary })}
                        <span>{item.text}{isMarkingAsSeen && '...'}</span>
                    </Box>
                    {item.hasCount && !isMarkingAsSeen && (
                        <Badge
                            badgeContent={item.count}
                            color="error"
                            sx={{
                                '& .MuiBadge-badge': {
                                    fontSize: '0.55rem',
                                    height: '14px',
                                    minWidth: '14px',
                                    bgcolor: colors.red,
                                }
                            }}
                        />
                    )}
                    {item.path && (item.path.startsWith('http://') || item.path.startsWith('https://')) && (
                        <Box component="span" sx={{ ml: 'auto', fontSize: '0.7rem', opacity: 0.7 }}>
                            ↗
                        </Box>
                    )}
                </HoverMenuItem>

                {/* Sub-items */}
                {hasSubItems && item.subItems.map((subItem, index) => {
                    const isSubItemActive = isItemActive(subItem.path);
                    const hasNestedSubItems = subItem.subItems && subItem.subItems.length > 0;
                    const isSubItemExternal = subItem.path && (subItem.path.startsWith('http://') || subItem.path.startsWith('https://'));

                    const handleSubItemClick = async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        
                        if (isSubItemExternal) {
                            window.open(subItem.path, '_blank');
                        } else if (subItem.path) {
                            // Mark notifications as seen for specific paths
                            if (subItem.path === '/super-admin-dashboard/locates' || 
                                subItem.path === '/super-admin-dashboard/health-department-report-tracking/rme') {
                                setIsMarkingAsSeen(true);
                                await markNotificationsAsSeenForPath(subItem.path);
                            }
                            
                            handleNavigation(subItem.path);
                        } else if (subItem.onClick) {
                            subItem.onClick(event);
                        }
                        setHoverMenuAnchor(null);
                    };

                    return (
                        <React.Fragment key={index}>
                            {/* Sub-item with its own navigation */}
                            <HoverMenuItem
                                onClick={handleSubItemClick}
                                className={isSubItemActive ? 'active' : ''}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', pl: 3 }}>
                                    {subItem.icon && React.cloneElement(subItem.icon, {
                                        size: 14,
                                        color: isSubItemActive ? colors.primary : colors.textPrimary
                                    })}
                                    <span>{subItem.text}</span>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {subItem.hasCount && !isMarkingAsSeen && (
                                        <Badge
                                            badgeContent={subItem.count}
                                            color="error"
                                            sx={{
                                                '& .MuiBadge-badge': {
                                                    fontSize: '0.55rem',
                                                    height: '14px',
                                                    minWidth: '14px',
                                                    bgcolor: colors.red,
                                                }
                                            }}
                                        />
                                    )}
                                    {isSubItemExternal && (
                                        <Box component="span" sx={{ fontSize: '0.7rem', opacity: 0.7 }}>
                                            ↗
                                        </Box>
                                    )}
                                </Box>
                            </HoverMenuItem>

                            {/* Nested sub-items */}
                            {hasNestedSubItems && subItem.subItems.map((nestedItem, nestedIndex) => {
                                const isNestedItemActive = isItemActive(nestedItem.path);
                                const isNestedItemExternal = nestedItem.path && (nestedItem.path.startsWith('http://') || nestedItem.path.startsWith('https://'));

                                const handleNestedItemClick = async (event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    
                                    if (isNestedItemExternal) {
                                        window.open(nestedItem.path, '_blank');
                                    } else if (nestedItem.path) {
                                        // Mark notifications as seen for specific paths
                                        if (nestedItem.path === '/super-admin-dashboard/locates' || 
                                            nestedItem.path === '/super-admin-dashboard/health-department-report-tracking/rme') {
                                            setIsMarkingAsSeen(true);
                                            await markNotificationsAsSeenForPath(nestedItem.path);
                                        }
                                        
                                        handleNavigation(nestedItem.path);
                                    } else if (nestedItem.onClick) {
                                        nestedItem.onClick(event);
                                    }
                                    setHoverMenuAnchor(null);
                                };

                                return (
                                    <HoverMenuItem
                                        key={`${index}-${nestedIndex}`}
                                        onClick={handleNestedItemClick}
                                        className={isNestedItemActive ? 'active' : ''}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', pl: 5 }}>
                                            {nestedItem.icon && React.cloneElement(nestedItem.icon, {
                                                size: 12,
                                                color: isNestedItemActive ? colors.primary : colors.textPrimary
                                            })}
                                            <span style={{ fontSize: '0.75rem' }}>{nestedItem.text}</span>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {nestedItem.hasCount && !isMarkingAsSeen && (
                                                <Badge
                                                    badgeContent={nestedItem.count}
                                                    color="error"
                                                    sx={{
                                                        '& .MuiBadge-badge': {
                                                            fontSize: '0.55rem',
                                                            height: '14px',
                                                            minWidth: '14px',
                                                            bgcolor: colors.red,
                                                        }
                                                    }}
                                                />
                                            )}
                                            {isNestedItemExternal && (
                                                <Box component="span" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>
                                                    ↗
                                                </Box>
                                            )}
                                        </Box>
                                    </HoverMenuItem>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </HoverMenu>
        );
    };

    return (
        <React.Fragment>
            <ListItem
                disablePadding
                sx={{
                    display: 'block',
                    position: 'relative',
                }}
            >
                {wrappedButton}
                {renderHoverMenu()}
            </ListItem>

            {isExpandable && isExpanded && item.subItems && isDrawerOpen && (
                <ul style={{
                    padding: 0,
                    margin: 0,
                    paddingLeft: 0,
                    backgroundColor: level === 0 ? alpha(colors.textTertiary, 0.05) : 'transparent'
                }}>
                    {item.subItems.map((subItem, index) => (
                        <NestedMenuItem
                            key={subItem.text || index}
                            item={subItem}
                            level={level + 1}
                            isDrawerOpen={isDrawerOpen}
                            getActiveStyles={getActiveStyles}
                            handleNavigation={handleNavigation}
                            isMobile={isMobile}
                            location={location}
                            onCloseDrawer={onCloseDrawer}
                            onExpandToggle={onExpandToggle}
                        />
                    ))}
                </ul>
            )}
        </React.Fragment>
    );
};

export default NestedMenuItem;