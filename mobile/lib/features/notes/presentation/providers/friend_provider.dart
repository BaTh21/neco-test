// lib/features/notes/presentation/providers/friend_provider.dart
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:whisper_space_flutter/core/constants/api_constants.dart'; // Use ApiConstants instead of ApiConfig
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/notes/data/models/friend_model.dart';

class FriendProvider extends ChangeNotifier {
  final StorageService storageService;
  List<FriendModel> _friends = [];
  bool _isLoading = false;
  String? _error;

  FriendProvider({required this.storageService});

  List<FriendModel> get friends => _friends;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<String?> _getToken() async {
    // Remove the await here - storageService.getToken() already returns Future<String?>
    return storageService.getToken();
  }

  Future<Map<String, String>> _getHeaders() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<void> loadFriends() async {
    _isLoading = true;
    notifyListeners();

    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/api/v1/friends/'),// Use ApiConstants
        headers: headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        _friends = data.map((json) => FriendModel.fromJson(json)).toList();
        _error = null;
      } else {
        _error = 'Failed to load friends: ${response.statusCode}';
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}