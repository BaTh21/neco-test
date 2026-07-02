import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#254D70',
      contrastText: '#fff',
    },
    secondary: {
      main: '#dc004e',
      contrastText: '#fff',
    },
    background: {
      default: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', // Full-screen gradient
      paper: '#fff',
    },
  },
  typography: {
    fontFamily: `'Suwannaphum', 'Share Tech', sans-serif`,
    h4: {
      fontWeight: 600,
      fontSize: { xs: '1.5rem', sm: '1.75rem' }, // Smaller on mobile
    },
    body1: {
      fontSize: { xs: '0.875rem', sm: '1rem' },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: { xs: '8px 16px', sm: '10px 20px' },
          transition: 'transform 0.2s, background-color 0.3s',
          '&:hover': {
            transform: 'scale(1.03)',
            backgroundColor: 'primary.dark',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
          borderRadius: 12,
          padding: { xs: '16px', sm: '24px' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            fontSize: { xs: '0.875rem', sm: '1rem' },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

export default theme;