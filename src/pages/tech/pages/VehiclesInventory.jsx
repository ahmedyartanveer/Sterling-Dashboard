import React from 'react';
import { Box, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';

export const VehiclesInventory = () => {
  return (
    <Box>
      <Helmet>
        <title>Vehicles Inventory | Sterling Septic & Plumbing LLC</title>
        <meta name="description" content="Tech Vehicles Inventory page" />
      </Helmet>
      <Typography gutterBottom sx={{ mb: 4, fontSize: 14 }}>
        This Page Is Coming Soon....
      </Typography>
    </Box>
  );
};
