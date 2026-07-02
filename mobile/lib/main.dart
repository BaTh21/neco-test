import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:whisper_space_flutter/core/providers/theme_provider.dart';
import 'package:whisper_space_flutter/core/services/auth_service.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/core/services/config_service.dart';

import 'package:whisper_space_flutter/features/auth/presentation/screens/home_screen.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/login_screen.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/providers/auth_provider.dart';

import 'package:whisper_space_flutter/features/feed/data/datasources/feed_api_service.dart';
import 'package:whisper_space_flutter/features/feed/presentation/providers/feed_provider.dart';

import 'package:whisper_space_flutter/features/notes/data/datasources/notes_api_service.dart';
import 'package:whisper_space_flutter/features/notes/presentation/providers/friend_provider.dart';
import 'package:whisper_space_flutter/features/notes/presentation/providers/notes_provider.dart';

import 'package:whisper_space_flutter/features/settings/providers/settings_provider.dart';

import 'package:whisper_space_flutter/shared/widgets/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await ConfigService().initialize();

  final storageService = StorageService();
  await storageService.init();

  final authService = AuthService(
    storageService: storageService,
  );

  final feedApiService = FeedApiService(
    storageService: storageService,
  );

  final settingsProvider = SettingsProvider();
  await settingsProvider.loadSettings();

  runApp(
    MultiProvider(
      providers: [
        Provider<StorageService>(
          create: (_) => storageService,
        ),
        Provider<ConfigService>(
          create: (_) => ConfigService(),
        ),
        Provider<AuthService>(
          create: (_) => authService,
        ),
        Provider<FeedApiService>(
          create: (_) => feedApiService,
        ),
        ChangeNotifierProvider(
          create: (_) => ThemeProvider(),
        ),
        ChangeNotifierProvider<AuthProvider>(
          create: (_) {
            final provider = AuthProvider(
              authService: authService,
              storageService: storageService,
            );
            WidgetsBinding.instance.addPostFrameCallback((_) async {
              await provider.init();
            });
            return provider;
          },
        ),
        ChangeNotifierProvider(
          create: (context) => FeedProvider(
            feedApiService: context.read<FeedApiService>(),
          ),
        ),
        ChangeNotifierProvider(
          create: (_) => NotesProvider(
            NotesApiService(
              storageService: storageService,
            ),
          ),
        ),
        ChangeNotifierProvider(
          create: (_) => FriendProvider(
            storageService: storageService,
          ),
        ),
        ChangeNotifierProvider<SettingsProvider>.value(
          value: settingsProvider,
        ),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return MaterialApp(
          title: 'NECO360',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: themeProvider.themeMode,
          initialRoute: '/',
          routes: {
            '/': (context) => Consumer<AuthProvider>(
                  builder: (context, authProvider, child) {
                    if (!authProvider.isInitialized) {
                      return const Scaffold(
                        body: Center(child: CircularProgressIndicator()),
                      );
                    }
                    if (authProvider.currentUser != null) {
                      return const HomeScreen();
                    }
                    return const LoginScreen();
                  },
                ),
            '/login': (context) => const LoginScreen(),
            '/home': (context) => const HomeScreen(),
          },
        );
      },
    );
  }
}