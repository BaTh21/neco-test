// App.jsx
import { ThemeProvider } from '@mui/material/styles';
import { Navigate, Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DebugAuth from './components/DebugAuth';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyCodePage from './pages/VerifyCodePage';
import theme from './theme';
import AuthRedirect from './guards/AuthRedirect';
import { TwoFactorAuthPage } from './pages/TwoFactorAuthPage';
import { UnreadMessagesProvider } from './context/unreadMessagesContext';

const App = () => (
  <ThemeProvider theme={theme}>
    <AuthProvider>

      <DebugAuth>
        <UnreadMessagesProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login"
                element={
                  <AuthRedirect>
                    <LoginPage />
                  </AuthRedirect>
                } />
              <Route path="/register"
                element={
                  <AuthRedirect>
                    <RegisterPage />
                  </AuthRedirect>
                } />
              <Route path="/2fa"
                element={
                  <AuthRedirect>
                    <TwoFactorAuthPage />
                  </AuthRedirect>
                } />
              <Route path="/verify-code/:email"
                element={
                  <AuthRedirect>
                    <VerifyCodePage />
                  </AuthRedirect>
                } />

              {/* Protected Routes - Separate routes for each tab */}
              <Route
                path="/feed"
                element={
                  <ProtectedRoute>
                    <DashboardPage defaultTab={0} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <DashboardPage defaultTab={1} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/friends"
                element={
                  <ProtectedRoute>
                    <DashboardPage defaultTab={2} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notes"
                element={
                  <ProtectedRoute>
                    <DashboardPage defaultTab={3} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <DashboardPage defaultTab={4} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setting"
                element={
                  <ProtectedRoute>
                    <DashboardPage defaultTab={5} />
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to feed */}
              <Route path="/" element={<Navigate to="/feed" replace />} />

              {/* Catch all route - redirect to feed */}
              <Route path="*" element={<Navigate to="/feed" replace />} />
            </Routes>
          </Router>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </UnreadMessagesProvider>
      </DebugAuth>
    </AuthProvider>
  </ThemeProvider>
);

export default App;