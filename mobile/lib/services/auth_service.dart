import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class AuthService {
  static const String _operatorKey = 'operator';
  static const String _isOperatorAuthenticatedKey = 'isOperatorAuthenticated';

  /// Save operator data to local storage
  static Future<void> saveOperatorData(Map<String, dynamic> operator) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_operatorKey, jsonEncode(operator));
  }

  /// Get operator data from local storage
  static Future<Map<String, dynamic>?> getOperatorData() async {
    final prefs = await SharedPreferences.getInstance();
    final operatorJson = prefs.getString(_operatorKey);
    if (operatorJson != null) {
      return jsonDecode(operatorJson) as Map<String, dynamic>;
    }
    return null;
  }

  /// Set operator authentication status
  static Future<void> setOperatorAuthenticated(bool isAuthenticated) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_isOperatorAuthenticatedKey, isAuthenticated);
  }

  /// Check if operator is authenticated
  static Future<bool> isOperatorAuthenticated() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_isOperatorAuthenticatedKey) ?? false;
  }

  /// Clear operator data and authentication status
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_operatorKey);
    await prefs.remove(_isOperatorAuthenticatedKey);
  }
}

