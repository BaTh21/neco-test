import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsProvider with ChangeNotifier {
  bool _darkMode = false;
  bool _pushNotifications = true;
  bool _emailNotifications = false;

  bool get darkMode => _darkMode;
  bool get pushNotifications => _pushNotifications;
  bool get emailNotifications => _emailNotifications;

  Future<void> loadSettings() async {
    final prefs = await SharedPreferences.getInstance();

    _darkMode = prefs.getBool('darkMode') ?? false;
    _pushNotifications = prefs.getBool('pushNotifications') ?? true;
    _emailNotifications = prefs.getBool('emailNotifications') ?? false;

    notifyListeners();
  }

  Future<void> toggleDarkMode(bool value) async {
    _darkMode = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('darkMode', value);
    notifyListeners();
  }

  Future<void> togglePushNotifications(bool value) async {
    _pushNotifications = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('pushNotifications', value);
    notifyListeners();
  }

  Future<void> toggleEmailNotifications(bool value) async {
    _emailNotifications = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('emailNotifications', value);
    notifyListeners();
  }
}