import { Button, styled } from '@mui/material';

const GradientButton = styled(Button)(({ theme }) => ({
    background: 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
    color: 'white',
    padding: '6px 16px',
    fontWeight: 500,
    fontSize: '0.85rem',
    textTransform: 'none',
    boxShadow: '0 2px 8px rgba(21, 101, 192, 0.25)',
    transition: 'all 0.3s ease',

    '&:hover': {
        background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)',
        boxShadow: '0 6px 14px rgba(21, 101, 192, 0.35)',
    },

    '&:disabled': {
        background: theme.palette.grey[300],
        color: theme.palette.grey[500],
    },
}));

export default GradientButton;
