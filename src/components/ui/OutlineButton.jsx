import { Button, styled } from '@mui/material';

const OutlineButton = styled(Button)(({ theme }) => ({
    border: `1px solid #dc2626`,
    color: '#dc2626',
    borderRadius: '5px',
    padding: '6px 16px',
    fontWeight: 500,
    textTransform: 'none',
    fontSize: '13px',
    transition: 'all 0.3s ease',
    '&:hover': {
        backgroundColor: 'rgba(220, 38, 38, 0.05)',
        borderColor: '#b91c1c',
        color: '#b91c1c',
    },
}));

export default OutlineButton;