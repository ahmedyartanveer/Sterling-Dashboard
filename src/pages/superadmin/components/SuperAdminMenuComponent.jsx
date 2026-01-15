import React, { useState } from 'react';
import {
    LayoutDashboard,
    Users,
    MapPin,
    FileText,
    Bell,
    BellRing,
    ClipboardList,
    History,
    Database,
    User,
    BarChart3,
    AlertTriangle,
    ClipboardCheck,
    Activity,
    ChevronDown,
    ChevronUp,
    Briefcase,
    Truck,
    Map,
    ListChecks,
    SignalHigh,
    GraduationCap,
    LibraryBig,
    Search,
    // Additional icons from manager menu
    Settings,
    Wrench,
    Calendar,
    Quote,
    Target,
    Package,
    Shield,
    Award,
    FileEdit,
    CheckSquare,
} from 'lucide-react';
import { TollOutlined } from '@mui/icons-material';

export const SuperAdminMenuComponent = ({ onMenuItemClick }) => {
    const [expandedSections, setExpandedSections] = useState({
        'general-section': false,
        'management-section': false,
        'system-section': false,
        'resources-section': false,
        'operations-subsection': false,
        'workorders-subsection': false,
        'assets-subsection': false,
        'reports-subsection': false,
        'forms-subsection': false,
        'health-reports': false,
    });

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId],
        }));
    };

    const menuItems = [
        // 🧭 GENERAL
        {
            sectionName: 'GENERAL',
            sectionId: 'general-section',
            isExpandable: true,
            items: [
                {
                    text: 'Dashboard',
                    icon: <LayoutDashboard size={18} />,
                    path: '/superadmin-dashboard',
                },
                {
                    text: 'Overview',
                    icon: <BarChart3 size={18} />,
                    path: '/superadmin-dashboard/overview',
                },
                {
                    text: 'Operations',
                    icon: <Briefcase size={18} />,
                    isExpandable: true,
                    sectionId: 'operations-subsection',
                    subItems: [
                        {
                            text: 'Dispatch',
                            icon: <Truck size={16} />,
                            path: '/superadmin-dashboard/dispatch',
                        },
                        {
                            text: 'Logistics Map',
                            icon: <Map size={16} />,
                            path: '/superadmin-dashboard/logistics-map',
                        },
                        {
                            text: 'Locates',
                            icon: <MapPin size={16} />,
                            path: '/superadmin-dashboard/locates',
                        },
                    ],
                },
                {
                    text: 'Work Orders',
                    icon: <ListChecks size={18} />,
                    isExpandable: true,
                    sectionId: 'workorders-subsection',
                    subItems: [
                        {
                            text: 'Installations',
                            icon: <Settings size={16} />,
                            path: '/superadmin-dashboard/installations',
                        },
                        {
                            text: 'Repairs',
                            icon: <Wrench size={16} />,
                            path: '/superadmin-dashboard/repairs',
                        },
                    ],
                },
            ],
        },

        // 🛠️ MANAGEMENT
        {
            sectionName: 'MANAGEMENT',
            sectionId: 'management-section',
            isExpandable: true,
            items: [
                {
                    text: 'Users',
                    icon: <Users size={18} />,
                    path: '/superadmin-dashboard/users',
                },
                {
                    text: 'Technicians',
                    icon: <Users size={18} />,
                    isExpandable: true,
                    sectionId: 'technicians-subsection',
                    subItems: [
                        {
                            text: 'All Technicians',
                            icon: <Users size={16} />,
                            path: '/superadmin-dashboard/all-technicians',
                        },
                        {
                            text: 'Scheduling',
                            icon: <Calendar size={16} />,
                            path: '/superadmin-dashboard/scheduling',
                        },
                        {
                            text: 'Performance',
                            icon: <Activity size={16} />,
                            path: '/superadmin-dashboard/performance',
                        },
                    ],
                },
                {
                    text: 'Sales',
                    icon: <ClipboardList size={18} />,
                    isExpandable: true,
                    sectionId: 'sales-subsection',
                    subItems: [
                        {
                            text: 'Quotes',
                            icon: <Quote size={16} />,
                            path: '/superadmin-dashboard/quotes',
                        },
                        {
                            text: 'Leads',
                            icon: <Target size={16} />,
                            path: '/superadmin-dashboard/leads',
                        },
                    ],
                },
            ],
        },

        // ⚙️ SYSTEM
        {
            sectionName: 'SYSTEM',
            sectionId: 'system-section',
            isExpandable: true,
            items: [
                {
                    text: 'Assets',
                    icon: <Database size={18} />,
                    isExpandable: true,
                    sectionId: 'assets-subsection',
                    subItems: [
                        {
                            text: 'Vehicles & Tools',
                            icon: <TollOutlined size={16} />,
                            path: '/superadmin-dashboard/vehicles-tools',
                        },
                        {
                            text: 'Inventory',
                            icon: <Package size={16} />,
                            path: '/superadmin-dashboard/inventory',
                        },
                    ],
                },
                {
                    text: 'Reports',
                    icon: <SignalHigh size={18} />,
                    isExpandable: true,
                    sectionId: 'reports-subsection',
                    subItems: [
                        {
                            text: 'Health Dept Reports',
                            icon: <AlertTriangle size={16} />,
                            isExpandable: true,
                            sectionId: 'health-reports',
                            subItems: [
                                {
                                    text: 'RME Reports',
                                    icon: <ClipboardCheck size={14} />,
                                    path: '/superadmin-dashboard/health-department-report-tracking/rme',
                                },
                                {
                                    text: 'RSS Reports',
                                    icon: <Activity size={14} />,
                                    path: '/superadmin-dashboard/health-department-report-tracking/rss',
                                },
                                {
                                    text: 'TOS Reports',
                                    icon: <BarChart3 size={14} />,
                                    path: '/superadmin-dashboard/health-department-report-tracking/tos',
                                },
                            ],
                        },
                        {
                            text: 'Risk Management',
                            icon: <Shield size={16} />,
                            path: '/superadmin-dashboard/risk-management',
                        },
                        {
                            text: 'Scorecards',
                            icon: <Award size={16} />,
                            path: '/superadmin-dashboard/scorecards',
                        },
                    ],
                },
                {
                    text: 'Forms',
                    icon: <FileText size={18} />,
                    isExpandable: true,
                    sectionId: 'forms-subsection',
                    subItems: [
                        {
                            text: 'Forms',
                            icon: <FileEdit size={16} />,
                            path: '/superadmin-dashboard/forms',
                        },
                        {
                            text: 'Review Forms',
                            icon: <ClipboardCheck size={16} />,
                            path: '/superadmin-dashboard/review-forms',
                        },
                        {
                            text: 'Approvals',
                            icon: <CheckSquare size={16} />,
                            path: '/superadmin-dashboard/approvals',
                        },
                    ],
                }
            ],
        },

        // 📚 RESOURCES
        {
            sectionName: 'RESOURCES',
            sectionId: 'resources-section',
            isExpandable: true,
            items: [
                {
                    text: 'Training',
                    icon: <GraduationCap size={18} />,
                    path: '/superadmin-dashboard/training',
                },
                {
                    text: 'Tasks',
                    icon: <ClipboardList size={18} />,
                    path: '/superadmin-dashboard/tasks',
                },
                {
                    text: 'Library',
                    icon: <LibraryBig size={18} />,
                    path: '/superadmin-dashboard/library',
                },
                {
                    text: 'Lookup',
                    icon: <Search size={18} />,
                    path: '/superadmin-dashboard/lookup',
                },
            ],
        },
    ];

    // 🔄 Process menu items
    const processedMenuItems = menuItems.map(section => {
        const processedItems = section.items.map(item => {
            if (item.isExpandable) {
                // Process nested expandable items (like health reports)
                const processedSubItems = item.subItems?.map(subItem => {
                    if (subItem.isExpandable) {
                        return {
                            ...subItem,
                            onClick: () => toggleSection(subItem.sectionId),
                            expanded: expandedSections[subItem.sectionId] || false,
                            expandIcon: expandedSections[subItem.sectionId]
                                ? <ChevronUp size={14} />
                                : <ChevronDown size={14} />,
                            subItems: subItem.subItems?.map(nestedSubItem => ({
                                ...nestedSubItem,
                                onClick: () => onMenuItemClick(nestedSubItem.path),
                            })) || [],
                        };
                    }
                    return {
                        ...subItem,
                        onClick: () => onMenuItemClick(subItem.path),
                    };
                });

                return {
                    ...item,
                    onClick: () => toggleSection(item.sectionId),
                    expanded: expandedSections[item.sectionId] || false,
                    expandIcon: expandedSections[item.sectionId]
                        ? <ChevronUp size={16} />
                        : <ChevronDown size={16} />,
                    subItems: processedSubItems || [],
                };
            }

            return {
                ...item,
                onClick: () => onMenuItemClick(item.path),
            };
        });

        return {
            ...section,
            onClick: () => toggleSection(section.sectionId),
            expanded: expandedSections[section.sectionId] || false,
            expandIcon: expandedSections[section.sectionId]
                ? <ChevronUp size={16} />
                : <ChevronDown size={16} />,
            items: processedItems,
        };
    });

    return processedMenuItems;
};