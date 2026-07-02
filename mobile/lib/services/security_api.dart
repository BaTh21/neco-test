import 'package:dio/dio.dart';
import 'package:whisper_space_flutter/features/auth/data/models/device_info.dart';
import 'package:whisper_space_flutter/features/auth/data/models/system_log.dart';

class SecurityApi {
  final Dio _dio;

  SecurityApi(this._dio);

  // Helper to build full URL with /api/v1 prefix
  String _url(String path) => '/api/v1$path';

  // Helper for POST requests
  Future<Response> _post(String path, dynamic data) async {
    try {
      return await _dio.post(_url(path), data: data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Helper for GET requests
  Future<Response> _get(String path) async {
    try {
      return await _dio.get(_url(path));
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Exception _handleError(DioException e) {
    String message = 'Something went wrong';
    if (e.response != null && e.response!.data != null) {
      try {
        final data = e.response!.data;
        if (data is Map) {
          message = data['detail'] ?? message;
        } else if (data is String) {
          message = data;
        }
      } catch (_) {}
    }
    return Exception(message);
  }

  // Change password
  Future<void> changePassword(String oldPassword, String newPassword) async {
    await _post('/auth/change-password', {
      'old_password': oldPassword,
      'new_password': newPassword,
    });
  }

  // Request email change (send code)
  Future<void> requestEmailChange(String newEmail) async {
    await _post('/auth/change-email/request', {'new_email': newEmail});
  }

  // Verify email change with code
  Future<void> verifyEmailChange(String newEmail, String code) async {
    await _post('/auth/change-email/verify', {
      'new_email': newEmail,
      'code': code,
    });
  }

  // 2FA: get setup secret & QR URI
  Future<Map<String, String>> setup2FA() async {
    final response = await _post('/auth/2fa/setup', {});
    return {
      'secret': response.data['secret'],
      'qr_uri': response.data['qr_uri'],
    };
  }

  // Enable 2FA with TOTP code
  Future<void> enable2FA(String code) async {
    await _post('/auth/2fa/enable', {'code': code});
  }

  // Disable 2FA with TOTP code
  Future<void> disable2FA(String code) async {
    await _post('/auth/2fa/disable', {'code': code});
  }

  // Enable email 2SA
  Future<void> enableEmail2SA() async {
    await _post('/auth/2sa/email/enable', {});
  }

  // Disable email 2SA
  Future<void> disableEmail2SA() async {
    await _post('/auth/2sa/email/disable', {});
  }

  // Deactivate account
  Future<void> deactivateAccount(String password) async {
    await _post('/auth/deactivate-account', {'password': password});
  }

  // Get user activity logs
  Future<List<SystemLog>> getUserLogs({String? action, int limit = 50}) async {
    final response = await _get('/devices/logs?limit=$limit${action != null ? '&action=$action' : ''}');
    final List list = response.data;
    return list.map((json) => SystemLog.fromJson(json)).toList();
  }

  // Get user devices
  Future<List<DeviceInfo>> getUserDevices() async {
    final response = await _get('/devices/my-devices');
    final List list = response.data;
    return list.map((json) => DeviceInfo.fromJson(json)).toList();
  }
}