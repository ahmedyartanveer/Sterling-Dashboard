import React, { useState } from 'react';
import {
    LayoutDashboard,
    ClipboardList,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Car,
    ListChecks,
    Camera,
    Package,
    Users,
    Search,
    Library,
    ClipboardCheck,
} from 'lucide-react';

export const TechMenuComponent = ({ onMenuItemClick }) => {
    const [expandedSections, setExpandedSections] = useState({
        'dashboard-section': false,
        'forms-reports-section': false,
        'vehicle-tools-section': false,
        'vehicle-tools-sub': false,
        'team-scorecard-section': false,
        'team-scorecard-sub': false,
        'resources-section': false,
        'health-reports': false,
    });

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId],
        }));
    };

    const menuItems = [
        {
            sectionName: 'Dashboard & Daily Work',
            sectionId: 'dashboard-section',
            isExpandable: true,
            items: [
                {
                    text: 'Dashboard',
                    icon: <LayoutDashboard size={18} />,
                    path: '/tech-dashboard',
                },
                {
                    text: 'My Scorecard',
                    icon: <ClipboardList size={18} />,
                    path: '/tech-dashboard/my-scorecard',
                },
            ],
        },
        {
            sectionName: 'Forms & Reports',
            sectionId: 'forms-reports-section',
            isExpandable: true,
            items: [
                {
                    text: 'Health Department Reports',
                    icon: <AlertTriangle size={18} />,
                    isExpandable: true,
                    sectionId: 'health-reports',
                    subItems: [
                        {
                            text: 'RME Reports',
                            icon: <ClipboardCheck size={16} />,
                            path: '/tech-dashboard/reports/rme',
                        },
                    ],
                },
            ],
        },
        {
            sectionName: 'Vehicle & Tools',
            sectionId: 'vehicle-tools-section',
            isExpandable: true,
            items: [
                {
                    text: 'Vehicle & Tools',
                    icon: <Car size={18} />,
                    isExpandable: true,
                    sectionId: 'vehicle-tools-sub',
                    subItems: [
                        {
                            text: 'Trucks',
                            icon: <Car size={16} />,
                            path: '/tech-dashboard/vehicles/trucks',
                        },
                        {
                            text: 'Vehicle List',
                            icon: <ListChecks size={16} />,
                            path: '/tech-dashboard/vehicles/list',
                        },
                        {
                            text: 'Photo Submission',
                            icon: <Camera size={16} />,
                            path: '/tech-dashboard/vehicles/photos',
                        },
                        {
                            text: 'Inventory Form',
                            icon: <Package size={16} />,
                            path: '/tech-dashboard/vehicles/inventory',
                        },
                    ],
                },
            ],
        },
        {
            sectionName: 'Team Scorecard',
            sectionId: 'team-scorecard-section',
            isExpandable: true,
            items: [
                {
                    text: 'Team Scorecard',
                    icon: <Users size={18} />,
                    isExpandable: true,
                    sectionId: 'team-scorecard-sub',
                    subItems: [
                        {
                            text: 'Daily Checklist',
                            icon: <CheckCircle size={16} />,
                            path: '/tech-dashboard/team/daily-checklist',
                        }
                    ],
                },
            ],
        },
        {
            sectionName: 'Resources',
            sectionId: 'resources-section',
            isExpandable: true,
            items: [
                {
                    text: 'Lookup',
                    icon: <Search size={18} />,
                    path: 'https://dashboard.sterlingsepticandplumbing.com/lookup',
                },
                {
                    text: 'Library',
                    icon: <Library size={18} />,
                    path: '/tech-dashboard/resources/library',
                },
            ],
        },
    ];

    const processedMenuItems = menuItems.map(section => {
        const processedItems = section.items.map(item => {
            if (item.isExpandable && item.subItems) {
                return {
                    ...item,
                    onClick: () => toggleSection(item.sectionId),
                    expanded: expandedSections[item.sectionId],
                    expandIcon: expandedSections[item.sectionId]
                        ? <ChevronUp size={16} />
                        : <ChevronDown size={16} />,
                    subItems: item.subItems.map(subItem => ({
                        ...subItem,
                        onClick: () => onMenuItemClick(subItem.path),
                    })),
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
            expanded: expandedSections[section.sectionId],
            expandIcon: expandedSections[section.sectionId]
                ? <ChevronUp size={16} />
                : <ChevronDown size={16} />,
            items: processedItems,
        };
    });

    return processedMenuItems;
};