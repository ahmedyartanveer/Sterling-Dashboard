import { Box, LinearProgress } from '@mui/material'
import React from 'react'

export default function DashboardLoader() {
    return (
        <Box sx={{ width: '100%' }}>
            <LinearProgress
                sx={{
                    mb: 3,
                    height: '2px',
                    position: 'absolute',
                    top: {xs: 59, sm: 65},
                    left: 0,
                    right: 0,
                    backgroundColor: '#E5E7EB',
                    '& .MuiLinearProgress-bar': {
                        background: '#3182CE',
                    },
                }}
            />
        </Box>
    )
}
