import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;

import '../../features/auth/data/models/token_model.dart';
import '../../features/auth/data/models/user_model.dart';
import '../constants/api_constants.dart';
import 'storage_service.dart';

class AuthService {
  final StorageService storageService;
  final String baseUrl;
  final Dio _dio;
  User? _cachedUser;

  AuthService({
    required this.storageService,
    String? baseUrl,
  })  : baseUrl = baseUrl ?? ApiConstants.baseUrl,
        _dio = Dio(BaseOptions(
          baseUrl: baseUrl ?? ApiConstants.baseUrl,
          headers: ApiConstants.defaultHeaders,
          connectTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 30),
        )) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storageService.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
    ));
  }

  Dio get dio => _dio;

  // ========== LOGIN (supports TOTP & email 2SA) ==========
  Future<LoginResponse> login(String email, String password) async {
    try {
      final url = Uri.parse('$baseUrl${ApiConstants.login}');
      final response = await http.post(
        url,
        headers: ApiConstants.formLoginHeaders,
        body:
            'username=${Uri.encodeComponent(email)}&password=${Uri.encodeComponent(password)}',
      );

      final responseBody = jsonDecode(response.body);

      // Check if 2FA (TOTP or email) is required
      if (response.statusCode == 200 &&
          responseBody['requires_2fa'] == true &&
          responseBody['temp_token'] != null) {
        return LoginResponse.twoFactorRequired(
          tempToken: responseBody['temp_token'],
          method: responseBody['method'] ?? 'totp',
          message: responseBody['message'],
        );
      }

      // Normal successful login (Token response)
      if (response.statusCode == 200 && responseBody['access_token'] != null) {
        final token = Token.fromJson(responseBody);
        await storageService.saveToken(token.accessToken);
        await storageService.saveRefreshToken(token.refreshToken);
        await storageService.setLoggedIn(true);
        final user = await getCurrentUser(token.accessToken);
        await storageService.saveUserData(user.toJson());
        await storageService.saveUserEmail(user.email);
        return LoginResponse.success(user: user, token: token);
      }

      // Otherwise, handle as a regular error
      return _handleLoginError(response);
    } catch (e) {
      return LoginResponse.error(
        message: 'Network error. Please check your internet connection.',
      );
    }
  }

  LoginResponse _handleLoginError(http.Response response) {
    try {
      final error = jsonDecode(response.body);
      String errorMessage;
      if (response.statusCode == 401) {
        return LoginResponse.error(
            message: 'Invalid email or password. Please try again.');
      } else if (response.statusCode == 404) {
        return LoginResponse.error(
            message: 'User not found. Please check your email.');
      } else if (response.statusCode == 403) {
        return LoginResponse.error(
            message: 'Account not verified. Please verify your email first.');
      } else if (response.statusCode == 422) {
        return LoginResponse.error(
            message: 'Invalid input format. Please check your information.');
      }
      if (error is Map<String, dynamic>) {
        if (error.containsKey('detail')) {
          final detail = error['detail'];
          if (detail is String) {
            errorMessage = detail;
          } else if (detail is List && detail.isNotEmpty) {
            errorMessage = detail.map((e) => e['msg'] ?? '').join(', ');
          } else {
            errorMessage = 'Login failed. Please try again.';
          }
        } else {
          errorMessage = 'Login failed. Please try again.';
        }
      } else {
        errorMessage = 'Login failed with status ${response.statusCode}';
      }
      return LoginResponse.error(message: errorMessage);
    } catch (e) {
      return LoginResponse.error(
        message: 'Login failed. Please check your credentials and try again.',
      );
    }
  }

  // ========== VERIFY EMAIL 2SA OTP ==========
Future<bool> verifyEmailOtp(String tempToken, String otpCode) async {
  try {
    final response = await _dio.post(
      '/api/v1/auth/2sa/email/verify',
      data: {'code': otpCode},
      options: Options(
        headers: {'Authorization': 'Bearer $tempToken'},
      ),
    );
    if (response.statusCode == 200) {
      final data = response.data;
      await storageService.saveToken(data['access_token']);
      await storageService.saveRefreshToken(data['refresh_token']);
      await storageService.setLoggedIn(true);
      final user = await getCurrentUser(data['access_token']);
      await storageService.saveUserData(user.toJson());
      await storageService.saveUserEmail(user.email);
      return true;
    }
    return false;
  } catch (e) {
    print('Verification error: $e');
    return false;
  }
}

  // ========== EXISTING METHODS (unchanged) ==========
  Future<RegisterResponse> register(
      String username, String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl${ApiConstants.register}'),
        headers: ApiConstants.defaultHeaders,
        body: jsonEncode({
          'username': username,
          'email': email,
          'password': password,
        }),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await storageService.saveUserEmail(email);
        return RegisterResponse.success(
          message: data['msg'] ??
              'Registration successful! Please check your email for verification code.',
          email: email,
        );
      } else if (response.statusCode == 409) {
        return RegisterResponse.error(
            message: 'Email or username already exists.');
      } else {
        return RegisterResponse.error(
            message: 'Registration failed. Please try again.');
      }
    } catch (e) {
      return RegisterResponse.error(
          message: 'Network error. Please check your internet connection.');
    }
  }

  Future<VerifyResponse> verifyEmail(String email, String code) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl${ApiConstants.verifyCode}'),
        headers: ApiConstants.defaultHeaders,
        body: jsonEncode({'email': email, 'code': code}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final token = Token.fromJson(data);
        await storageService.saveToken(token.accessToken);
        await storageService.saveRefreshToken(token.refreshToken);
        await storageService.setLoggedIn(true);
        return VerifyResponse.success(token: token);
      } else {
        return VerifyResponse.error(
            message: 'Invalid or expired verification code.');
      }
    } catch (e) {
      return VerifyResponse.error(
          message: 'Network error. Please check your internet connection.');
    }
  }

  Future<ForgotPasswordResponse> forgotPassword(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl${ApiConstants.forgotPassword}'),
        headers: ApiConstants.defaultHeaders,
        body: jsonEncode({'email': email}),
      );
      if (response.statusCode == 200) {
        return ForgotPasswordResponse.success(
            message: 'If the email is registered, a reset code has been sent.');
      } else {
        return ForgotPasswordResponse.error(
            message: 'Failed to process request. Please try again.');
      }
    } catch (e) {
      return ForgotPasswordResponse.error(
          message: 'Network error. Please check your internet connection.');
    }
  }

  Future<ResetPasswordResponse> resetPassword(String code, String newPassword) async {
  try {
    final response = await http.post(
      Uri.parse('$baseUrl${ApiConstants.resetPassword}'),
      headers: ApiConstants.defaultHeaders,
      body: jsonEncode({
        'code': code,
        'new_password': newPassword,
      }),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return ResetPasswordResponse.success(message: data['msg'] ?? 'Password reset successful');
    } else {
      return ResetPasswordResponse.error(message: 'Failed to reset password');
    }
  } catch (e) {
    return ResetPasswordResponse.error(message: 'Network error');
  }
}

  

  Future<User> getCurrentUser(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl${ApiConstants.getUserProfile}'),
        headers: {
          ...ApiConstants.defaultHeaders,
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return User.fromJson(data);
      } else {
        throw Exception('Failed to load user profile');
      }
    } catch (e) {
      throw Exception('Failed to load user: $e');
    }
  }

  Future<User?> getCurrentUserFromCache() async {
  if (_cachedUser != null) return _cachedUser;
  
  final token = await storageService.getToken();
  if (token == null) return null;
  
  try {
    _cachedUser = await getCurrentUser(token);
    return _cachedUser;
  } catch (e) {
    print('Failed to load user: $e');
    return null;
  }
} 

String? getSavedUsername() {
  final userData = storageService.getUserData();
  return userData?['username'];
}

  Future<void> logout() async {
    await storageService.clearAll();
  }

  Future<ResendVerificationResponse> resendVerification(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl${ApiConstants.resendVerification}'),
        headers: ApiConstants.defaultHeaders,
        body: jsonEncode({'email': email}),
      );
      if (response.statusCode == 200) {
        return ResendVerificationResponse.success(
            message: 'Verification code sent successfully.');
      } else {
        return ResendVerificationResponse.error(
            message: 'Failed to resend verification code.');
      }
    } catch (e) {
      return ResendVerificationResponse.error(
          message: 'Network error. Please check your internet connection.');
    }
  }

  Future<void> updateUsername(String newUsername) async {
    final response = await dio.put(
      '/api/v1/users/me',
      data: {'username': newUsername},
    );
    if (response.statusCode != 200) throw Exception('Failed to update username');
  }
}

// ========== RESPONSE CLASSES ==========
class LoginResponse {
  final bool success;
  final String? message;
  final User? user;
  final Token? token;
  final bool requires2FA;
  final String? tempToken;
  final String? method; // 'totp' or 'email'

  LoginResponse({
    required this.success,
    this.message,
    this.user,
    this.token,
    this.requires2FA = false,
    this.tempToken,
    this.method,
  });

  factory LoginResponse.success({required User user, required Token token}) =>
      LoginResponse(
        success: true,
        user: user,
        token: token,
      );

  factory LoginResponse.error({required String message}) =>
      LoginResponse(success: false, message: message);

  factory LoginResponse.twoFactorRequired({
    required String tempToken,
    required String method,
    String? message,
  }) =>
      LoginResponse(
        success: false,
        requires2FA: true,
        tempToken: tempToken,
        method: method,
        message: message ?? 'Two-factor authentication required',
      );
}

class RegisterResponse {
  final bool success;
  final String? message;
  final String? email;
  RegisterResponse({required this.success, this.message, this.email});
  factory RegisterResponse.success({String? message, String? email}) =>
      RegisterResponse(success: true, message: message, email: email);
  factory RegisterResponse.error({required String message}) =>
      RegisterResponse(success: false, message: message);
}

class VerifyResponse {
  final bool success;
  final String? message;
  final Token? token;
  VerifyResponse({required this.success, this.message, this.token});
  factory VerifyResponse.success({required Token token}) =>
      VerifyResponse(success: true, token: token);
  factory VerifyResponse.error({required String message}) =>
      VerifyResponse(success: false, message: message);
}

class ForgotPasswordResponse {
  final bool success;
  final String? message;
  ForgotPasswordResponse({required this.success, this.message});
  factory ForgotPasswordResponse.success({String? message}) =>
      ForgotPasswordResponse(success: true, message: message);
  factory ForgotPasswordResponse.error({required String message}) =>
      ForgotPasswordResponse(success: false, message: message);
}

class ResendVerificationResponse {
  final bool success;
  final String? message;
  ResendVerificationResponse({required this.success, this.message});
  factory ResendVerificationResponse.success({String? message}) =>
      ResendVerificationResponse(success: true, message: message);
  factory ResendVerificationResponse.error({required String message}) =>
      ResendVerificationResponse(success: false, message: message);
}

class ResetPasswordResponse {
  final bool success;
  final String? message;
  ResetPasswordResponse({required this.success, this.message});
  factory ResetPasswordResponse.success({String? message}) =>
      ResetPasswordResponse(success: true, message: message);
  factory ResetPasswordResponse.error({required String message}) =>
      ResetPasswordResponse(success: false, message: message);
}