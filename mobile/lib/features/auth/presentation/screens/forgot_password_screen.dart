import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../shared/widgets/custom_button.dart';
import '../../../../shared/widgets/loading_overlay.dart';
import '../widgets/auth_text_field.dart';
import 'login_screen.dart';
import 'reset_password_screen.dart';
import 'providers/auth_provider.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  _ForgotPasswordScreenState createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;
  bool _emailSent = false;
  String? _resetCode;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _sendResetEmail() async {
    FocusScope.of(context).unfocus();

    if (_formKey.currentState == null || !_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    final authProvider = context.read<AuthProvider>();
    final result = await authProvider.forgotPassword(_emailController.text.trim());

    setState(() => _isLoading = false);

    if (!mounted) return;

    if (result.success) {
      // Show the success message screen
      setState(() => _emailSent = true);
      // Then show OTP dialog on top of it
      _showOtpDialog();
    } else {
      _showErrorDialog(result.message ?? 'Failed to send reset email');
    }
  }

  void _showOtpDialog() {
    final TextEditingController otpController = TextEditingController();
    bool isVerifying = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: const Text('Verify OTP'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'We sent a 6‑digit verification code to your email address. Enter it below to reset your password.',
                ),
                const SizedBox(height: 16),
                AuthTextField(
                  controller: otpController,
                  label: '6‑digit Code',
                  hintText: '123456',
                  keyboardType: TextInputType.number,
                  prefixIcon: Icons.security,
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: isVerifying
                    ? null
                    : () {
                        Navigator.of(dialogContext).pop();
                      },
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: isVerifying
                    ? null
                    : () async {
                        final code = otpController.text.trim();
                        if (code.length != 6 || !RegExp(r'^\d+$').hasMatch(code)) {
                          ScaffoldMessenger.of(dialogContext).showSnackBar(
                            const SnackBar(
                              content: Text('Please enter a valid 6‑digit code'),
                              backgroundColor: Colors.orange,
                            ),
                          );
                          return;
                        }

                        setDialogState(() => isVerifying = true);

                        // Close the OTP dialog and navigate to reset password screen
                        Navigator.of(dialogContext).pop();
                        _navigateToResetPassword(code);

                        setDialogState(() => isVerifying = false);
                      },
                child: isVerifying
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Verify'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _navigateToResetPassword(String resetCode) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ResetPasswordScreen(
          email: _emailController.text.trim(),
          resetCode: resetCode,
        ),
      ),
    );
  }

  void _showErrorDialog(String message) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDarkMode ? const Color(0xFF1E1E1E) : Colors.white,
        title: Text(
          'Error',
          style: TextStyle(color: isDarkMode ? Colors.white : Colors.black),
        ),
        content: Text(
          message,
          style: TextStyle(color: isDarkMode ? Colors.white70 : Colors.black87),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'OK',
              style: TextStyle(color: isDarkMode ? Colors.white70 : Colors.black),
            ),
          ),
        ],
      ),
    );
  }

  void _goToLogin() {
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => const LoginScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final gradientStart = isDarkMode ? const Color(0xFF0A0A0A) : const Color(0xFF6A11CB);
    final gradientEnd = isDarkMode ? const Color(0xFF1E1E1E) : const Color(0xFF2575FC);
    final cardColor = isDarkMode ? const Color(0xFF1E1E1E) : Colors.white;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.white70;

    return LoadingOverlay(
      isLoading: _isLoading,
      child: Scaffold(
        body: Stack(
          children: [
            Container(
              width: double.infinity,
              height: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [gradientStart, gradientEnd],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
            SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Icon(Icons.lock_reset, size: 100, color: Colors.white),
                    const SizedBox(height: 20),
                    Text(
                      'Reset Password',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _emailSent
                          ? 'Check your email for the 6‑digit verification code.'
                          : 'Enter your email address and we will send you a verification code to reset your password.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: subtitleColor,
                          ),
                    ),
                    const SizedBox(height: 20),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(25),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.15),
                            blurRadius: 30,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: !_emailSent
                          ? Form(
                              key: _formKey,
                              child: Column(
                                children: [
                                  const SizedBox(height: 10),
                                  AuthTextField(
                                    controller: _emailController,
                                    label: 'Email',
                                    hintText: 'Enter your email address',
                                    keyboardType: TextInputType.emailAddress,
                                    prefixIcon: Icons.email,
                                    validator: (value) {
                                      if (value == null || value.isEmpty) {
                                        return 'Email is required';
                                      }
                                      if (!RegExp(r'^[^@]+@[^@]+\.[^@]+')
                                          .hasMatch(value)) {
                                        return 'Enter a valid email';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 20),
                                  CustomButton(
                                    text: 'Send Reset Code',
                                    onPressed: _sendResetEmail,
                                    fullWidth: true,
                                    icon: Icons.send,
                                    color: const Color(0xFF6A11CB),
                                  ),
                                  const SizedBox(height: 15),
                                  CustomButton(
                                    text: 'Back to Login',
                                    onPressed: _goToLogin,
                                    fullWidth: true,
                                    color: const Color.fromARGB(255, 41, 0, 84),
                                  ),
                                  const SizedBox(height: 10),
                                ],
                              ),
                            )
                          : Column(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(20),
                                  decoration: BoxDecoration(
                                    color: isDarkMode ? Colors.green[900] : Colors.green[50],
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: isDarkMode ? Colors.green[700]! : Colors.green[100]!,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.check_circle,
                                        color: isDarkMode ? Colors.green[300] : Colors.green[700],
                                        size: 30,
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Text(
                                          'Check your email for the verification code.',
                                          style: TextStyle(
                                            color: isDarkMode ? Colors.green[300] : Colors.green[800],
                                            fontSize: 16,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 32),
                                CustomButton(
                                  text: 'Back to Login',
                                  onPressed: _goToLogin,
                                  fullWidth: true,
                                  icon: Icons.arrow_back,
                                  variant: ButtonVariant.outlined,
                                ),
                              ],
                            ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}