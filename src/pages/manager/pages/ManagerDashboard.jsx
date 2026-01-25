import { Box, Typography } from '@mui/material';
import React from 'react';
import { Helmet } from 'react-helmet-async';


export const ManagerDashboard = () => {


  return (
    <Box>
      <Helmet>
        <title>Dashboard | Sterling Septic & Plumbing LLC</title>
        <meta name="description" content="Manager dashboard" />
      </Helmet>
      <Typography gutterBottom sx={{ mb: 4, fontSize: 14 }}>
        Welcome to Sterling Septic & Plumbing LLC. This is a web application that allows you to look up customer information.
      </Typography>
    </Box>
  );
};
