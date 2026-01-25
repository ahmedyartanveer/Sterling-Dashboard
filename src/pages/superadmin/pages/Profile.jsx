import React from 'react';
import { Box } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { ProfilePage } from '../../../components/ProfilePage';

export const SuperAdminProfile = () => {
    return (
        <Box>
            <Helmet>
                <title>Super Admin Profile | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Super administrator profile management dashboard" />
            </Helmet>
            <ProfilePage roleLabel="SUPER ADMIN" />
        </Box>
    )
};