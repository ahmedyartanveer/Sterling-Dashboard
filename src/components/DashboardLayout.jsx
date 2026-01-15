import React from 'react';
import { styled, useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import InputBase from '@mui/material/InputBase';
import Badge from '@mui/material/Badge';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useAuth } from '../auth/AuthProvider';
import { useLocation, useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import logo from '../public/logo.png';
import DashboardFooter from './DashboardFooter';

import {
  LogOut,
  User,
  Settings,
  MoreVertical,
  Menu as MenuIcon,
  ChevronDown,
  ChevronUp,
  Search,
  Bell,
  HelpCircle,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Tag,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  Calendar,
  MapPin,
  Clock,
  Mail,
  Shield,
  UserCog,
  Filter,
  X,
  Edit,
  Camera,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';

const drawerWidth = 250;
const closedDrawerWidth = 60;
const mobileDrawerWidth = 230;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  backgroundColor: '#1a365d',
  backgroundImage: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
});

const closedMixin = (theme) => ({
  width: closedDrawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  backgroundColor: '#1a365d',
  backgroundImage: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(0, 0.5),
  minHeight: 52,
  flexShrink: 0,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const PermanentDrawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open
      ? {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme),
      }
      : {
        ...closedMixin(theme),
        '& .MuiDrawer-paper': closedMixin(theme),
      }),
  })
);

const ScrollableBox = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'transparent',
  },
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
});

const SearchContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#f8fafc',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '5px',
  padding: '2px 10px',
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: '#3182ce',
    backgroundColor: '#ffffff',
  },
  '&:focus-within': {
    borderColor: '#3182ce',
    backgroundColor: '#ffffff',
    boxShadow: '0 0 0 2px rgba(49, 130, 206, 0.1)',
  },
  [theme.breakpoints.down('md')]: {
    position: 'fixed',
    top: 60,
    left: 16,
    right: 16,
    zIndex: theme.zIndex.appBar + 1,
    width: 'calc(100% - 32px)',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    borderColor: '#3182ce',
    '&:hover, &:focus-within': {
      borderColor: '#3182ce',
      backgroundColor: '#ffffff',
    },
  },
}));

const SearchInput = styled(InputBase)(({ theme }) => ({
  color: '#4a5568',
  fontSize: '0.8rem',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: '6px 0 6px 6px',
    fontSize: '0.8rem',
    '&::placeholder': {
      color: '#a0aec0',
      opacity: 1,
      fontSize: '0.8rem',
    },
  },
  [theme.breakpoints.down('md')]: {
    '& .MuiInputBase-input::placeholder': {
      fontSize: '0.85rem',
    },
  },
}));

const MobileSearchBackdrop = styled(Box)(({ theme }) => ({
  display: 'none',
  [theme.breakpoints.down('md')]: {
    display: 'block',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: theme.zIndex.appBar,
    backdropFilter: 'blur(2px)',
  },
}));

const MobileSearchButton = styled(IconButton)(({ theme }) => ({
  display: 'none',
  [theme.breakpoints.down('md')]: {
    display: 'flex',
    color: '#718096',
    backgroundColor: '#f8fafc',
    borderRadius: '5px',
    border: '1px solid rgba(0,0,0,0.08)',
    width: 32,
    height: 32,
    '&:hover': {
      backgroundColor: '#edf2f7',
      color: '#3182ce',
    },
  },
}));

const MobileActionsContainer = styled(Box)(({ theme }) => ({
  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
  [theme.breakpoints.down('md')]: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.75,
  },
}));

const DesktopActionsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  flex: 1,
  justifyContent: 'flex-end',
  maxWidth: '550px',
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}));

const BreadcrumbContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  [theme.breakpoints.down('sm')]: {
    display: 'none',
  },
}));

const MobilePageTitle = styled(Typography)(({ theme }) => ({
  display: 'none',
  [theme.breakpoints.down('sm')]: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#2d3748',
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    maxWidth: '120px',
  },
}));

const HoverMenu = styled(Box)(({ theme }) => ({
  position: 'fixed',
  backgroundColor: '#1a365d',
  backgroundImage: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
  borderRadius: '6px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  border: '1px solid rgba(255,255,255,0.15)',
  zIndex: theme.zIndex.drawer + 10,
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
  gap: '10px',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: alpha('#ffffff', 0.85),
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha('#ffffff', 0.1),
    color: '#ffffff',
  },
  '&.active': {
    backgroundColor: alpha('#ffffff', 0.15),
    color: '#ffffff',
    borderLeft: '2px solid #63b3ed',
  },
}));

const generateBreadcrumb = (path) => {
  const pathParts = path.replace(/^\/+/, '').split('/').filter(Boolean);
  const ACRONYMS = new Set(['rme', 'RSS', 'TOS']);
  const SPECIAL_CASES = {
    'rme': 'RME',
    'rss': 'RSS',
    'tos': 'TOS',
  };

  const breadcrumbItems = pathParts.map((part, index) => {
    const decodedPart = decodeURIComponent(part);
    let displayName;

    if (SPECIAL_CASES[decodedPart.toLowerCase()]) {
      displayName = SPECIAL_CASES[decodedPart.toLowerCase()];
    }
    else if (/^[A-Z]+$/.test(decodedPart) || ACRONYMS.has(decodedPart.toLowerCase())) {
      displayName = decodedPart.toUpperCase();
    }
    else if (ACRONYMS.has(decodedPart.toLowerCase())) {
      displayName = decodedPart.toUpperCase();
    }
    else {
      displayName = decodedPart
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => {
          if (ACRONYMS.has(word.toLowerCase())) {
            return word.toUpperCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    }

    return {
      name: displayName,
      path: '/' + pathParts.slice(0, index + 1).join('/'),
      isLast: index === pathParts.length - 1
    };
  });

  return breadcrumbItems;
};

const getPageTitle = (path) => {
  const pathParts = path.replace(/^\/+/, '').split('/').filter(Boolean);

  if (pathParts.length === 0) {
    return 'Dashboard';
  }

  const lastPart = pathParts[pathParts.length - 1];
  const decodedPart = decodeURIComponent(lastPart);

  return decodedPart
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const ProfileDialog = ({ open, onClose, user, userRole }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const getDashboardBasePath = () => {
    const currentPath = location.pathname;

    if (currentPath.startsWith('/superadmin-dashboard')) {
      return '/superadmin-dashboard';
    } else if (currentPath.startsWith('/manager-dashboard')) {
      return '/manager-dashboard';
    } else if (currentPath.startsWith('/tech-dashboard')) {
      return '/tech-dashboard';
    }

    switch (userRole?.toUpperCase()) {
      case 'SUPERADMIN':
        return '/superadmin-dashboard';
      case 'MANAGER':
        return '/manager-dashboard';
      case 'TECH':
        return '/tech-dashboard';
      default:
        return '/';
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'SUPERADMIN':
        return '#dc2626';
      case 'MANAGER':
        return '#059669';
      case 'TECH':
        return '#2563eb';
      default:
        return '#6b7280';
    }
  };

  const getRoleLabel = (role) => {
    switch (role?.toUpperCase()) {
      case 'SUPERADMIN':
        return 'Super Admin';
      case 'MANAGER':
        return 'Manager';
      case 'TECH':
        return 'Technician';
      default:
        return 'User';
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toUpperCase()) {
      case 'SUPERADMIN':
        return <ShieldCheck size={18} />;
      case 'MANAGER':
        return <Briefcase size={18} />;
      case 'TECH':
        return <UserCog size={18} />;
      default:
        return <User size={18} />;
    }
  };

  const handleEditProfile = () => {
    const basePath = getDashboardBasePath();
    onClose();
    navigate(`${basePath}/profile`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          [theme.breakpoints.down('sm')]: {
            margin: '16px',
            width: 'calc(100% - 32px)',
          },
        }
      }}
    >
      <DialogTitle sx={{
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        pb: 2,
        position: 'relative',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha('#3182ce', 0.1),
              color: '#3182ce',
            }}>
              <User size={20} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{
                color: '#1a202c',
                fontSize: '1rem',
                fontWeight: 600,
                lineHeight: 1.2,
              }}>
                User Profile
              </Typography>
              <Typography variant="caption" sx={{
                color: '#718096',
                fontSize: '0.75rem',
                fontWeight: 400,
              }}>
                View and manage your profile information
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: '#718096',
              '&:hover': {
                backgroundColor: alpha('#718096', 0.1),
                color: '#4a5568',
              },
            }}
          >
            <X size={18} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative', mb: 0 }}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                bgcolor: '#3182ce',
                color: '#ffffff',
                fontSize: '2rem',
                fontWeight: 600,
                border: '4px solid #ffffff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                [theme.breakpoints.down('sm')]: {
                  width: 80,
                  height: 80,
                  fontSize: '1.5rem',
                },
              }}
            >
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </Avatar>
          </Box>

          <Typography variant="h5" sx={{
            color: '#1a202c',
            fontSize: '1.25rem',
            fontWeight: 600,
            mb: 0.5,
            textAlign: 'center',
            [theme.breakpoints.down('sm')]: {
              fontSize: '1.1rem',
            },
          }}>
            {user?.name || 'Jenny Wilson'}
          </Typography>

          <Chip
            icon={getRoleIcon(userRole)}
            label={getRoleLabel(userRole)}
            sx={{
              backgroundColor: alpha(getRoleColor(userRole), 0.1),
              color: getRoleColor(userRole),
              border: `1px solid ${alpha(getRoleColor(userRole), 0.3)}`,
              fontSize: '0.75rem',
              fontWeight: 600,
              height: '28px',
              mb: 3,
              '& .MuiChip-icon': {
                color: getRoleColor(userRole),
                marginLeft: '8px',
              },
            }}
          />
        </Box>

        <Box sx={{
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          p: 2.5,
          mb: 2,
          [theme.breakpoints.down('sm')]: {
            p: 2,
          },
        }}>
          <Typography variant="subtitle2" sx={{
            color: '#4a5568',
            fontSize: '0.8rem',
            fontWeight: 600,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
          }}>
            <User size={14} />
            Personal Information
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{
                color: '#718096',
                fontSize: '0.7rem',
                fontWeight: 500,
                mb: 0.5,
                display: 'block',
              }}>
                Email Address
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Mail size={14} color="#718096" />
                <Typography variant="body2" sx={{
                  color: '#1a202c',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  wordBreak: 'break-word',
                }}>
                  {user?.email || 'jennywilson@gmail.com'}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{
                color: '#718096',
                fontSize: '0.7rem',
                fontWeight: 500,
                mb: 0.5,
                display: 'block',
              }}>
                Account Role
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Shield size={14} color="#718096" />
                <Typography variant="body2" sx={{
                  color: '#1a202c',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}>
                  {getRoleLabel(userRole)}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{
                color: '#718096',
                fontSize: '0.7rem',
                fontWeight: 500,
                mb: 0.5,
                display: 'block',
              }}>
                Member Since
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calendar size={14} color="#718096" />
                <Typography variant="body2" sx={{
                  color: '#1a202c',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'January 2024'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{
        p: 2.5,
        pt: 2,
        borderTop: '1px solid rgba(0,0,0,0.06)',
        justifyContent: 'space-between',
      }}>
        <Button
          onClick={handleEditProfile}
          variant="outlined"
          startIcon={<Edit size={16} />}
          sx={{
            textTransform: 'none',
            fontSize: '0.85rem',
            fontWeight: 500,
            color: '#3182ce',
            borderColor: '#cbd5e0',
            '&:hover': {
              borderColor: '#3182ce',
              backgroundColor: alpha('#3182ce', 0.04),
            },
          }}
        >
          Edit Profile
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const NestedMenuItem = ({ item, level = 0, isDrawerOpen, getActiveStyles, handleNavigation, isMobile, location }) => {
  const isExpandable = item.isExpandable;
  const isExpanded = item.expanded;
  const [hoverMenuAnchor, setHoverMenuAnchor] = React.useState(null);
  const [hoverTimeout, setHoverTimeout] = React.useState(null);

  const isItemActive = (path) => {
    const currentPath = location.pathname;
    if (currentPath === path) return true;
    if (path !== '/superadmin-dashboard' && path !== '/manager-dashboard' && path !== '/tech-dashboard' && currentPath.startsWith(path + '/')) {
      return true;
    }
    if (path === '/manager-dashboard' && currentPath === '/manager-dashboard') {
      return true;
    }
    if (path !== '/superadmin-dashboard' && path !== '/manager-dashboard' && path !== '/tech-dashboard' && currentPath === path) {
      return true;
    }
    return false;
  };

  const isActive = isItemActive(item.path);

  const handleMouseEnter = (event) => {
    if (!isDrawerOpen && !isMobile && (item.isExpandable || item.subItems?.length > 0)) {
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

  const handleItemClick = () => {
    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      handleNavigation(item.path);
    }
    setHoverMenuAnchor(null);
  };

  const mainButton = (
    <ListItemButton
      onClick={handleItemClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
          },
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
            </Typography>
          }
        />
      )}
      {!isDrawerOpen && (
        <Typography sx={{
          fontSize: '0.55rem',
          fontWeight: 500,
          lineHeight: 1.2,
          mt: 0.25,
          textAlign: 'center',
          color: 'inherit',
          letterSpacing: '0.01em',
        }}>
          {item.text.split(' ').map(word => word.charAt(0)).join('')}
        </Typography>
      )}
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
            backgroundColor: '#2d3748',
            fontSize: '0.75rem',
            padding: '3px 6px',
            borderRadius: '3px',
          }
        },
        arrow: {
          sx: {
            color: '#2d3748',
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
        <HoverMenuItem
          onClick={handleItemClick}
          className={isActive ? 'active' : ''}
          sx={{
            fontWeight: 600,
            borderBottom: hasSubItems ? '1px solid rgba(255,255,255,0.15)' : 'none',
          }}
        >
          {React.cloneElement(item.icon, { size: 16, color: isActive ? '#ffffff' : alpha('#ffffff', 0.85) })}
          <span>{item.text}</span>
        </HoverMenuItem>
        
        {hasSubItems && item.subItems.map((subItem, index) => {
          const isSubItemActive = isItemActive(subItem.path);
          return (
            <HoverMenuItem
              key={index}
              onClick={() => {
                if (subItem.path) {
                  handleNavigation(subItem.path);
                }
                setHoverMenuAnchor(null);
              }}
              className={isSubItemActive ? 'active' : ''}
              sx={{
                pl: 3,
              }}
            >
              {React.cloneElement(subItem.icon, { size: 14, color: isSubItemActive ? '#ffffff' : alpha('#ffffff', 0.85) })}
              <span>{subItem.text}</span>
            </HoverMenuItem>
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
        <List sx={{
          py: 0,
          pl: 0,
          backgroundColor: level === 0 ? alpha('#000000', 0.1) : 'transparent'
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
            />
          ))}
        </List>
      )}
    </React.Fragment>
  );
};

export default function DashboardLayout({ children, title, menuItems }) {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [open, setOpen] = React.useState(!isMobile);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  const handleDrawerToggle = () => setOpen(!open);

  const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U';

  const breadcrumbItems = generateBreadcrumb(location.pathname);
  const pageTitle = getPageTitle(location.pathname);

  const getUserRole = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.role || parsed.userType || 'USER';
      }
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
    }
    return 'USER';
  };

  const userRole = getUserRole();

  const isRouteActive = (path) => {
    const currentPath = location.pathname;

    if (currentPath === path) return true;

    if (path !== '/superadmin-dashboard' && path !== '/manager-dashboard' && path !== '/tech-dashboard' && currentPath.startsWith(path + '/')) {
      return true;
    }

    if (path === '/manager-dashboard' && currentPath === '/manager-dashboard') {
      return true;
    }

    if (path !== '/superadmin-dashboard' && path !== '/manager-dashboard' && path !== '/tech-dashboard' && currentPath === path) {
      return true;
    }

    return false;
  };

  const getActiveStyles = (path) => {
    const isActive = isRouteActive(path);

    if (isActive) {
      return {
        color: '#ffffff !important',
        backgroundColor: alpha('#ffffff', 0.15),
        borderLeft: '2px solid #63b3ed',
        '& .MuiListItemIcon-root': {
          color: '#ffffff',
        },
        '&:hover': {
          backgroundColor: alpha('#ffffff', 0.2),
          color: '#ffffff !important',
        },
        borderRadius: '0 5px 5px 0',
        transition: 'all 0.15s ease',
        mx: 0.5,
        my: 0.25,
      };
    }

    return {
      color: alpha('#ffffff', 0.85),
      backgroundColor: 'transparent',
      '& .MuiListItemIcon-root': {
        color: alpha('#ffffff', 0.85),
      },
      '&:hover': {
        backgroundColor: alpha('#ffffff', 0.1),
        color: '#ffffff',
        '& .MuiListItemIcon-root': {
          color: '#ffffff',
        },
      },
      borderRadius: '0 5px 5px 0',
      transition: 'all 0.15s ease',
      mx: 0.5,
      my: 0.25,
    };
  };

  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleProfileClick = () => {
    setProfileDialogOpen(true);
    handleMenuClose();
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    if (path) {
      navigate(path);
      if (isMobile) {
        setOpen(false);
      }
    }
  };

  const handleBreadcrumbClick = (path) => {
    if (path) {
      navigate(path);
    }
  };

  const handleProfileDialogClose = () => {
    setProfileDialogOpen(false);
  };

  const toggleMobileSearch = () => {
    setMobileSearchOpen(!mobileSearchOpen);
  };

  const handleMobileSearchClose = () => {
    setMobileSearchOpen(false);
  };

  const renderDrawerContent = () => (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: '#ffffff',
      '& .MuiListItemIcon-root': {
        color: 'inherit',
      },
      '& .MuiTypography-root': {
        color: 'inherit',
      },
      '& .MuiDivider-root': {
        borderColor: alpha('#ffffff', 0.15),
      },
    }}>
      <DrawerHeader>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-start' : 'center',
          width: '100%',
          px: open ? 2 : 1,
        }}>
          {open ? (
            <img
              src={logo}
              alt="Logo"
              style={{
                width: '140px',
                height: 'auto',
              }}
            />
          ) : (
            <Box sx={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src={logo}
                alt="Logo"
                style={{
                  width: '28px',
                  height: 'auto',
                  filter: 'brightness(0) invert(1)'
                }}
              />
            </Box>
          )}
        </Box>
      </DrawerHeader>

      <Divider sx={{
        borderColor: alpha('#ffffff', 0.15),
        my: 0.5,
      }} />

      <ScrollableBox sx={{ py: 0.5 }}>
        {menuItems?.map((section, sectionIndex) => (
          <React.Fragment key={sectionIndex}>
            {open && section.sectionName && (
              <Box sx={{
                px: 2.5,
                py: 0.75,
                mb: 0.25,
              }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: alpha('#ffffff', 0.6),
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'block',
                  }}
                >
                  {section.sectionName}
                </Typography>
              </Box>
            )}

            <List sx={{ py: 0.25 }}>
              {section.items.map((item, index) => (
                <NestedMenuItem
                  key={item.text || index}
                  item={item}
                  level={0}
                  isDrawerOpen={open}
                  getActiveStyles={getActiveStyles}
                  handleNavigation={handleNavigation}
                  isMobile={isMobile}
                  location={location}
                />
              ))}
            </List>
          </React.Fragment>
        ))}
      </ScrollableBox>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
      <CssBaseline />

      {mobileSearchOpen && (
        <MobileSearchBackdrop onClick={handleMobileSearchClose} />
      )}

      <AppBar
        position="fixed"
        open={open && !isMobile}
        sx={{
          zIndex: theme.zIndex.drawer + (mobileSearchOpen ? 2 : 1),
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: 0.5,
          transition: 'all 0.3s ease',
        }}
      >
        <Toolbar sx={{
          minHeight: 56,
          px: { xs: 3, sm: 2.5 },
          py: { xs: 2, sm: 0 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1.5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!isMobile ? (
              <IconButton
                onClick={handleDrawerToggle}
                edge="start"
                sx={{
                  marginLeft: open ? -1.5 : 4,
                  width: 32,
                  height: 32,
                  borderRadius: '5px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: '#f8fafc',
                  color: '#4a5568',
                  '&:hover': {
                    backgroundColor: '#edf2f7',
                    borderColor: '#cbd5e0',
                  },
                }}
              >
                {open ? (
                  <ChevronLeft size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </IconButton>
            ) : (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
                edge="start"
                sx={{
                  color: '#4a5568',
                  backgroundColor: '#f8fafc',
                  borderRadius: '5px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  '&:hover': {
                    backgroundColor: '#edf2f7',
                  },
                }}
              >
                <MenuIcon size={18} />
              </IconButton>
            )}

            <MobilePageTitle>
              {pageTitle}
            </MobilePageTitle>

            <BreadcrumbContainer>
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontWeight: 600,
                  color: '#2d3748',
                  fontSize: '0.95rem',
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {breadcrumbItems.map((item, index) => (
                  <React.Fragment key={item.path || `item-${index}`}>
                    {index > 0 && (
                      <Box
                        component="span"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 0.5,
                        }}
                      >
                        <ChevronRight size={14} color="#a0aec0" />
                      </Box>
                    )}
                    <Box
                      component="span"
                      onClick={() => !item.isLast && handleBreadcrumbClick(item.path)}
                      sx={{
                        color: item.isLast ? '#3182ce' : '#4a5568',
                        cursor: item.isLast ? 'default' : 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: item.isLast ? 600 : 500,
                        '&:hover': !item.isLast ? {
                          color: '#3182ce',
                          textDecoration: 'underline',
                        } : {},
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                      }}
                    >
                      {item.name}
                      {item.isLast && (
                        <Box sx={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          backgroundColor: '#3182ce',
                          ml: 0.5,
                        }} />
                      )}
                    </Box>
                  </React.Fragment>
                ))}
              </Typography>
            </BreadcrumbContainer>
          </Box>

          <DesktopActionsContainer>
            <SearchContainer sx={{ width: '280px' }}>
              <Search size={16} color="#a0aec0" />
              <SearchInput
                placeholder="Q Search"
                inputProps={{ 'aria-label': 'search' }}
              />
            </SearchContainer>

            <IconButton
              sx={{
                color: '#718096',
                backgroundColor: '#f8fafc',
                borderRadius: '5px',
                border: '1px solid rgba(0,0,0,0.08)',
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: '#edf2f7',
                  color: '#3182ce',
                },
              }}
            >
              <Badge
                badgeContent={3}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.55rem',
                    height: '14px',
                    minWidth: '14px',
                  }
                }}
              >
                <Bell size={16} />
              </Badge>
            </IconButton>

            <IconButton
              onClick={handleMenuOpen}
              sx={{
                p: 0.5,
                borderRadius: '5px',
                border: '1px solid rgba(0,0,0,0.08)',
                backgroundColor: '#f8fafc',
                '&:hover': {
                  backgroundColor: '#edf2f7',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: '#3182ce',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {getInitials(user?.name)}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  mt: 0.5,
                  minWidth: 160,
                  backgroundColor: '#ffffff',
                  color: '#2d3748',
                  border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  '& .MuiMenuItem-root': {
                    fontSize: '0.8rem',
                    py: 0.5,
                    px: 1.25,
                    color: '#4a5568',
                    '&:hover': {
                      backgroundColor: '#f7fafc',
                      color: '#2d3748',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'inherit',
                      minWidth: 32,
                    },
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{
                px: 1.25,
                py: 0.75,
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: '#3182ce',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {getInitials(user?.name)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{
                    fontWeight: 600,
                    color: '#2d3748',
                    fontSize: '0.8rem',
                    lineHeight: 1.2,
                  }}>
                    {user?.name || 'Jenny Wilson'}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: '#718096',
                    fontSize: '0.7rem',
                    lineHeight: 1.2,
                  }}>
                    {user?.email || 'jennywilson@gmail.com'}
                  </Typography>
                </Box>
              </Box>
              <MenuItem onClick={handleProfileClick}>
                <ListItemIcon>
                  <User size={16} />
                </ListItemIcon>
                <Typography sx={{ fontSize: '0.8rem' }}>Profile</Typography>
              </MenuItem>
              <Divider sx={{
                my: 0.5,
                borderColor: 'rgba(0,0,0,0.06)',
              }} />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogOut size={16} />
                </ListItemIcon>
                <Typography sx={{ fontSize: '0.8rem' }}>Logout</Typography>
              </MenuItem>
            </Menu>
          </DesktopActionsContainer>

          <MobileActionsContainer>
            <MobileSearchButton onClick={toggleMobileSearch}>
              <Search size={16} />
            </MobileSearchButton>

            <IconButton
              sx={{
                color: '#718096',
                backgroundColor: '#f8fafc',
                borderRadius: '5px',
                border: '1px solid rgba(0,0,0,0.08)',
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: '#edf2f7',
                  color: '#3182ce',
                },
              }}
            >
              <Badge
                badgeContent={3}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.55rem',
                    height: '14px',
                    minWidth: '14px',
                  }
                }}
              >
                <Bell size={16} />
              </Badge>
            </IconButton>

            <IconButton
              onClick={handleMenuOpen}
              sx={{
                p: 0.5,
                borderRadius: '5px',
                border: '1px solid rgba(0,0,0,0.08)',
                backgroundColor: '#f8fafc',
                '&:hover': {
                  backgroundColor: '#edf2f7',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: '#3182ce',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {getInitials(user?.name)}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  mt: 0.5,
                  minWidth: 160,
                  backgroundColor: '#ffffff',
                  color: '#2d3748',
                  border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  '& .MuiMenuItem-root': {
                    fontSize: '0.8rem',
                    py: 0.5,
                    px: 1.25,
                    color: '#4a5568',
                    '&:hover': {
                      backgroundColor: '#f7fafc',
                      color: '#2d3748',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'inherit',
                      minWidth: 32,
                    },
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{
                px: 1.25,
                py: 0.75,
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: '#3182ce',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {getInitials(user?.name)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{
                    fontWeight: 600,
                    color: '#2d3748',
                    fontSize: '0.8rem',
                    lineHeight: 1.2,
                  }}>
                    {user?.name || 'Jenny Wilson'}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: '#718096',
                    fontSize: '0.7rem',
                    lineHeight: 1.2,
                  }}>
                    {user?.email || 'jennywilson@gmail.com'}
                  </Typography>
                </Box>
              </Box>
              <MenuItem onClick={handleProfileClick}>
                <ListItemIcon>
                  <User size={16} />
                </ListItemIcon>
                <Typography sx={{ fontSize: '0.8rem' }}>Profile</Typography>
              </MenuItem>
              <Divider sx={{
                my: 0.5,
                borderColor: 'rgba(0,0,0,0.06)',
              }} />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogOut size={16} />
                </ListItemIcon>
                <Typography sx={{ fontSize: '0.8rem' }}>Logout</Typography>
              </MenuItem>
            </Menu>
          </MobileActionsContainer>
        </Toolbar>
      </AppBar>

      {mobileSearchOpen && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.appBar + 2,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          animation: 'slideDown 0.2s ease-out',
          '@keyframes slideDown': {
            from: {
              transform: 'translateY(-100%)',
            },
            to: {
              transform: 'translateY(0)',
            },
          },
        }}>
          <Box sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}>
            <SearchContainer sx={{ flex: 1 }}>
              <Search size={16} color="#a0aec0" />
              <SearchInput
                placeholder="Search everything..."
                inputProps={{ 'aria-label': 'search' }}
                autoFocus
                onBlur={handleMobileSearchClose}
              />
            </SearchContainer>
            <IconButton
              onClick={handleMobileSearchClose}
              sx={{
                color: '#718096',
                backgroundColor: '#f8fafc',
                borderRadius: '5px',
                border: '1px solid rgba(0,0,0,0.08)',
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: '#edf2f7',
                  color: '#3182ce',
                },
              }}
            >
              <X size={16} />
            </IconButton>
          </Box>
        </Box>
      )}

      {isMobile ? (
        <MuiDrawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{
            keepMounted: true,
            disableScrollLock: true,
          }}
          sx={{
            zIndex: theme.zIndex.appBar + (mobileSearchOpen ? 2 : 1),
            '& .MuiDrawer-paper': {
              width: mobileDrawerWidth,
              backgroundImage: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
              borderRight: 'none',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            },
          }}
        >
          {renderDrawerContent()}
        </MuiDrawer>
      ) : (
        <PermanentDrawer variant="permanent" open={open}>
          {renderDrawerContent()}
        </PermanentDrawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: '#f7fafc',
          width: '100%',
          overflow: 'hidden',
          pt: mobileSearchOpen ? 8 : 0,
        }}
      >
        <DrawerHeader />

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 1.25, sm: 2 },
            pt: { xs: 3, sm: 2 },
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                flex: 1,
                p: { xs: 1.25, sm: 2 },
                overflowY: 'auto',
                overflowX: 'hidden',
                '&::-webkit-scrollbar': {
                  width: '5px',
                  height: '5px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f5f9',
                  borderRadius: '2px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#cbd5e0',
                  borderRadius: '2px',
                  '&:hover': {
                    background: '#a0aec0',
                  },
                },
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e0 #f1f5f9',
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>

        <Box sx={{
          borderTop: '1px solid rgba(0,0,0,0.04)',
          backgroundColor: '#ffffff',
          py: 1,
          px: { xs: 1.25, sm: 2 }
        }}>
          <DashboardFooter />
        </Box>
      </Box>

      <ProfileDialog
        open={profileDialogOpen}
        onClose={handleProfileDialogClose}
        user={user}
        userRole={userRole}
      />
    </Box>
  );
}