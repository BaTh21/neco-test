import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../../core/services/auth_service.dart';
import '../../../../../core/services/storage_service.dart';
import '../../../data/models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService authService;
  final StorageService storageService;

  User? _currentUser;
  bool _isLoading = false;
  String? _error;
  bool _isInitialized = false;
  String? _tempToken;

  bool get isInitialized => _isInitialized;
  User? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get savedEmail => storageService.getUserEmail();
  Dio get dio => authService.dio;

  AuthProvider({
    required this.authService,
    required this.storageService,
  });

  // ========== INIT ==========
  Future<void> init() async {
    _isLoading = true;
    notifyListeners();
    await _loadUserFromStorage();
    _isInitialized = true;
    _isLoading = false;
    notifyListeners();
  }

  Future<void> _loadUserFromStorage() async {
    try {
      if (storageService.isLoggedIn()) {
        final userData = storageService.getUserData();
        if (userData != null) {
          _currentUser = User.fromJson(userData);
        }
      }
    } catch (e) {
      await storageService.clearAll();
    }
  }

  // ========== LOGIN (handles TOTP & email 2SA) ==========
  Future<LoginResponse> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await authService.login(email, password);
      if (result.requires2FA) {
        _tempToken = result.tempToken;
        _error = null;
        return result;
      } else if (result.success) {
        _currentUser = result.user;
        _error = null;
        _tempToken = null;
        return result;
      } else {
        _error = result.message;
        return result;
      }
    } catch (e) {
      _error = 'An unexpected error occurred';
      return LoginResponse.error(message: _error!);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ========== VERIFY EMAIL OTP (for email 2SA) ==========
  Future<bool> verifyEmailOtp(String otpCode) async {
    if (_tempToken == null) return false;
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final success = await authService.verifyEmailOtp(_tempToken!, otpCode);
      if (success) {
        final userData = storageService.getUserData();
        if (userData != null) {
          _currentUser = User.fromJson(userData);
        }
        _tempToken = null;
        return true;
      } else {
        _error = 'Invalid verification code';
        return false;
      }
    } catch (e) {
      _error = 'Verification failed';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ========== EXISTING METHODS (unchanged) ==========
  Future<RegisterResponse> register(
      String username, String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await authService.register(username, email, password);
      if (!result.success) {
        _error = result.message;
      }
      return result;
    } catch (e) {
      _error = 'An unexpected error occurred';
      return RegisterResponse.error(message: _error!);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<VerifyResponse> verifyEmail(String email, String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await authService.verifyEmail(email, code);
      if (result.success) {
        final user = await authService.getCurrentUser(result.token!.accessToken);
        _currentUser = user;
        await storageService.saveUserData(user.toJson());
      } else {
        _error = result.message;
      }
      return result;
    } catch (e) {
      _error = 'An unexpected error occurred';
      return VerifyResponse.error(message: _error!);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<ForgotPasswordResponse> forgotPassword(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await authService.forgotPassword(email);
      if (!result.success) {
        _error = result.message;
      }
      return result;
    } catch (e) {
      _error = 'An unexpected error occurred';
      return ForgotPasswordResponse.error(message: _error!);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<ResendVerificationResponse> resendVerification(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await authService.resendVerification(email);
      if (!result.success) {
        _error = result.message;
      }
      return result;
    } catch (e) {
      _error = 'An unexpected error occurred';
      return ResendVerificationResponse.error(message: _error!);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();
    try {
      await authService.logout();
      _currentUser = null;
      _error = null;
    } catch (e) {
      _error = 'Logout failed';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateProfileImage(String imageUrl) async {
    if (_currentUser != null) {
      _currentUser = _currentUser!.copyWith(avatarUrl: imageUrl);
      await storageService.saveUserData(_currentUser!.toJson());
      notifyListeners();
    }
  }

  Future<void> removeProfileImage() async {
    if (_currentUser != null) {
      _currentUser = _currentUser!.copyWith(avatarUrl: null);
      await storageService.saveUserData(_currentUser!.toJson());
      notifyListeners();
    }
  }

  Future<void> updateUsername(String newUsername) async {
    if (_currentUser == null) return;
    _isLoading = true;
    notifyListeners();
    try {
      await authService.updateUsername(newUsername);
      _currentUser = _currentUser!.copyWith(username: newUsername);
      await storageService.saveUserData(_currentUser!.toJson());
      _error = null;
    } catch (e) {
      _error = 'Failed to update username: $e';
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<User?> refreshCurrentUser() async {
    final token = storageService.getToken();
    if (token == null) return null;
    try {
      final user = await authService.getCurrentUser(token);
      if (user != null) {
        _currentUser = user;
        await storageService.saveUserData(user.toJson());
        notifyListeners();
        return user;
      }
    } catch (e) {
      debugPrint('Failed to refresh user: $e');
    }
    return null;
  }

  Future<bool> resetPassword(String resetCode, String newPassword) async {
  _isLoading = true;
  _error = null;
  notifyListeners();
  try {
    final result = await authService.resetPassword(resetCode, newPassword);
    if (result.success) {
      return true;
    } else {
      _error = result.message;
      return false;
    }
  } catch (e) {
    _error = 'Reset password failed';
    return false;
  } finally {
    _isLoading = false;
    notifyListeners();
  }
}
  
}