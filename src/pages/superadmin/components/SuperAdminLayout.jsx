import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../../components/DashboardLayout';
import { SuperAdminMenuComponent } from './SuperAdminMenuComponent';

export const SuperAdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleMenuItemClick = (path) => {
        navigate(path);
    };

    const structuredMenuItems = SuperAdminMenuComponent({ onMenuItemClick: handleMenuItemClick });

    const getPageTitle = () => {
        const currentPath = location.pathname;
        
        for (const section of structuredMenuItems) {
            for (const item of section.items) {
                if (currentPath === item.path) return item.text;
                if (currentPath.startsWith(item.path + '/')) return item.text;
                
                if (item.subItems) {
                    const subItem = item.subItems.find(sub => {
                        if (currentPath === sub.path) return true;
                        if (currentPath.startsWith(sub.path + '/')) return true;
                        return false;
                    });
                    if (subItem) return subItem.text;
                }
            }
        }

        if (currentPath === '/super-admin-dashboard') {
            return 'Dashboard';
        }
        
        return 'Super Admin Dashboard';
    };

    return (
        <DashboardLayout 
            title={getPageTitle()} 
            menuItems={structuredMenuItems}
        >
            <Outlet />
        </DashboardLayout>
    );
};