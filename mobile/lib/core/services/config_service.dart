import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:network_info_plus/network_info_plus.dart';

class ConfigService {
  static final ConfigService _instance = ConfigService._internal();
  factory ConfigService() => _instance;
  ConfigService._internal();

  String baseUrl = '';
  String wsBaseUrl = '';
  bool isInitialized = false;

  static const int _backendPort = 8000;
  static const String _backendProtocol = 'http';
  static const String _backendWsProtocol = 'ws';
  
  String _computerIp = '10.234.57.94';
  String? _cachedDeviceIp;
  bool _isEmulator = false;
  
  Future<void> initialize() async {
    if (isInitialized) return;

    String host = '';
    _isEmulator = await isRunningOnEmulator();
    
    if (_isEmulator) {
      host = '10.0.2.2';
    } else {
      host = _computerIp;
      
      try {
        final networkInfo = NetworkInfo();
        final deviceIp = await networkInfo.getWifiIP();
        if (deviceIp != null && deviceIp.isNotEmpty && deviceIp != '0.0.0.0') {
          _cachedDeviceIp = deviceIp;
        }
      } catch (e) {
        // Silently handle
      }
    }

    baseUrl = '$_backendProtocol://$host:$_backendPort';
    wsBaseUrl = '$_backendWsProtocol://$host:$_backendPort';
    isInitialized = true;
  }

  Future<bool> isRunningOnEmulator() async {
    if (kIsWeb) return false;
    
    if (defaultTargetPlatform == TargetPlatform.android) {
      // Check for emulator using different method
      try {
        // Try to read system properties (works on some devices)
        final result = await Process.run('getprop', ['ro.kernel.qemu']);
        if (result.exitCode == 0 && result.stdout.toString().trim() == '1') {
          return true;
        }
      } catch (e) {
        // Process might not be available, continue with other checks
      }
      
      // Check environment variables
      if (Platform.environment.containsKey('ANDROID_EMULATOR')) return true;
      if (Platform.environment.containsKey('EMULATOR')) return true;
      
      // Check for typical emulator characteristics
      try {
        // Most emulators have specific hardware properties
        final result = await Process.run('getprop', ['ro.build.characteristics']);
        if (result.exitCode == 0 && result.stdout.toString().contains('emulator')) {
          return true;
        }
      } catch (e) {
        // Ignore
      }
      
      // If we can detect WiFi, it's likely a real device
      try {
        final networkInfo = NetworkInfo();
        final wifiIP = await networkInfo.getWifiIP();
        if (wifiIP != null && wifiIP != '0.0.0.0' && wifiIP != '10.0.2.15') {
          return false; // Has real WiFi IP, so real device
        }
      } catch (e) {
        // Can't detect, assume emulator
      }
    }
    
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return Platform.isIOS && 
             Platform.environment.containsKey('SIMULATOR_DEVICE_NAME');
    }
    
    // Default to false for real devices
    return false;
  }

  void updateBackendIp(String newIp) {
    if (newIp.isNotEmpty && newIp != _computerIp) {
      _computerIp = newIp;
      isInitialized = false;
    }
  }

  String get currentBackendIp => _computerIp;
  String? get deviceIp => _cachedDeviceIp;
  bool get isEmulator => _isEmulator;

  Future<bool> testConnectivity() async {
    if (!isInitialized) return false;
    
    try {
      final Uri healthUrl = Uri.parse('$baseUrl/health');
      final client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 5);
      
      try {
        final request = await client.getUrl(healthUrl);
        final response = await request.close();
        final bool isConnected = response.statusCode == 200;
        client.close();
        return isConnected;
      } catch (e) {
        client.close();
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  void resetToDefault() {
    _computerIp = '10.234.57.94';
    isInitialized = false;
    _cachedDeviceIp = null;
  }
  
  String getCurrentMode() {
    if (_isEmulator) {
      return 'Emulator Mode (Backend: 10.0.2.2:8000)';
    } else {
      return 'Network Mode (Backend: $_computerIp:8000)';
    }
  }
}