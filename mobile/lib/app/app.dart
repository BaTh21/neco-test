import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:whisper_space_flutter/features/feed/presentation/screens/shared_diary_screen.dart';

import '../features/auth/presentation/screens/forgot_password_screen.dart';
import '../features/auth/presentation/screens/login_screen.dart';
import '../features/auth/presentation/screens/register_screen.dart';
import '../features/auth/presentation/screens/verification_screen.dart';
import '../features/feed/presentation/screens/feed_screen.dart';
import '../shared/widgets/theme/app_theme.dart';


class WhisperSpaceApp extends StatelessWidget {
  final bool isLoggedIn;
  
  WhisperSpaceApp({super.key, required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'NECO360',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: _router,
    );
  }

  late final GoRouter _router = GoRouter(
    initialLocation: isLoggedIn ? '/home' : '/login',
    routes: [
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => MaterialPage(
          key: state.pageKey,
          child: const LoginScreen(),
        ),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (context, state) => MaterialPage(
          key: state.pageKey,
          child: const RegisterScreen(),
        ),
      ),
      GoRoute(
        path: '/verify-email',
        pageBuilder: (context, state) {
          final email = state.uri.queryParameters['email'] ?? '';
          return MaterialPage(
            key: state.pageKey,
            child: VerificationScreen(email: email),
          );
        },
      ),
      GoRoute(
        path: '/forgot-password',
        pageBuilder: (context, state) => MaterialPage(
          key: state.pageKey,
          child: const ForgotPasswordScreen(),
        ),
      ),
       GoRoute(
        path: '/home',
        pageBuilder: (context, state) => MaterialPage(
          key: state.pageKey,
          child: const FeedScreen(), 
        ),
      ),
      GoRoute(
        path: '/shared/diary/:token',
        pageBuilder: (context, state) {
          final token = state.pathParameters['token']!;
          return MaterialPage(
            key: state.pageKey,
            child: SharedDiaryScreen(token: token),
          );
        },
      ),
    ],
  );

  Widget _buildHomeScreen() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('NECO360'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
            },
          ),
        ],
      ),
      body: const Center(
        child: Text('Welcome to NECO360!'),
      ),
    );
  }
}