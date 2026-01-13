import React from 'react';
import {
    LayoutDashboard,
    ClipboardList,
    Calendar,
    Briefcase,
    PlusCircle,
    History,
    FileText,
    Shield,
    BookOpen,
    User,
    CheckCircle,
    TrendingUp,
    // Additional icons
    AlertTriangle,
    FileCheck,
    Activity,
    Book,
    ChevronRight,
} from 'lucide-react';

export const TechMenuComponent = ({ onMenuItemClick }) => {
    const menuItems = [
        // Dashboard & Daily Work Section
        {
            sectionName: 'Dashboard & Daily Work',
            items: [
                {
                    text: 'Dashboard',
                    icon: <LayoutDashboard size={18} />,
                    path: '/tech-dashboard'
                },
                {
                    text: 'My Tasks',
                    icon: <ClipboardList size={18} />,
                    path: '/tech-dashboard/my-tasks'
                },
                {
                    text: 'My Schedule',
                    icon: <Calendar size={18} />,
                    path: '/tech-dashboard/my-schedule'
                },
            ]
        },

        // Forms & Reports Section
        {
            sectionName: 'Forms & Reports',
            items: [
                {
                    text: 'Forms',
                    icon: <FileText size={18} />,
                    path: '/tech-dashboard/forms'
                },
                {
                    text: 'Submit Form',
                    icon: <CheckCircle size={18} />,
                    path: '/tech-dashboard/forms/submit'
                },
                {
                    text: 'Health Department Reports',
                    icon: <Shield size={18} />,
                    path: '/tech-dashboard/health-department-reports'
                },
                {
                    text: 'Submit Health Report',
                    icon: <FileCheck size={18} />,
                    path: '/tech-dashboard/health-department-reports/submit'
                },
            ]
        },

        // Risk & Compliance Section
        {
            sectionName: 'Risk & Compliance',
            items: [
                {
                    text: 'Risk Management',
                    icon: <AlertTriangle size={18} />,
                    path: '/tech-dashboard/risk-management'
                },
                {
                    text: 'Submit Risk Assessment',
                    icon: <CheckCircle size={18} />,
                    path: '/tech-dashboard/risk-management/submit'
                },
            ]
        },

        // Courses & Training Section
        {
            sectionName: 'Courses & Training',
            items: [
                {
                    text: 'Courses',
                    icon: <BookOpen size={18} />,
                    path: '/tech-dashboard/courses'
                }
            ]
        },
    ];

    // Return structured menu items with onClick handlers
    return menuItems.map(section => ({
        ...section,
        items: section.items.map(item => ({
            ...item,
            onClick: () => onMenuItemClick(item.path)
        }))
    }));
};