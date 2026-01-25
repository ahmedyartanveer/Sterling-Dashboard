import React from 'react';
import { Box, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';

export const VehiclesTrucks = () => {
  return (
    <Box>
      <Helmet>
        <title>Vehicles Trucks | Sterling Septic & Plumbing LLC</title>
        <meta name="description" content="Tech Vehicles Trucks page" />
      </Helmet>
      <Typography gutterBottom sx={{ mb: 4, fontSize: 14 }}>
        This Page Is Coming Soon....
      </Typography>
    </Box>
  );
};
