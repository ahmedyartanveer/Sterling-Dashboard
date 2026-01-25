import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Helmet } from 'react-helmet-async';

const TOSReports = () => {
    return (
        <Box>
            <Helmet>
                <title>TOS | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Super Admin TOS page" />
            </Helmet>
            <Typography gutterBottom sx={{ mb: 4, fontSize: 14 }}>
                This Page Is Coming Soon....
            </Typography>
        </Box>
    );
};

export default TOSReports;