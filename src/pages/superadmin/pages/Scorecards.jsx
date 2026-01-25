import React from 'react';
import { Box, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';

export const Scorecards = () => {
  return (
    <Box>
      <Helmet>
        <title>Scorecards | Sterling Septic & Plumbing LLC</title>
        <meta name="description" content="Super Admin Scorecards page" />
      </Helmet>
      <Typography gutterBottom sx={{ mb: 4, fontSize: 14 }}>
        This Page Is Coming Soon....
      </Typography>
    </Box>
  );
};
