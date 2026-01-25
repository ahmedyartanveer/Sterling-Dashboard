import React from 'react';
import { Box, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';

export const Overview = () => {
  return (
    <Box>
      <Helmet>
        <title>Overview | Sterling Septic & Plumbing LLC</title>
        <meta name="description" content="Super Admin Overview page" />
      </Helmet>
      <Typography gutterBottom sx={{ mb: 4, fontSize: 14 }}>
        This Page Is Coming Soon....
      </Typography>
    </Box>
  );
};
