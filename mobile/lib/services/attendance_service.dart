import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config.dart';

class AttendanceService {
  /// Mark attendance for a student
  static Future<Map<String, dynamic>> markAttendance({
    required String studentId,
    required String courseId,
    String? date,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${Config.apiUrl}/api/attendance'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'studentId': studentId,
          'courseId': courseId,
          'date': date ?? DateTime.now().toIso8601String(),
        }),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return {
            'success': true,
            'message': data['message'] ?? 'Attendance marked successfully',
            'attendance': data['attendance'],
          };
        }
        throw Exception(data['message'] ?? 'Failed to mark attendance');
      } else {
        final data = jsonDecode(response.body);
        throw Exception(data['message'] ?? 'Failed to mark attendance: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error marking attendance: $e');
    }
  }

  /// Get student by ID
  static Future<Map<String, dynamic>?> getStudentById(String studentId) async {
    try {
      final response = await http.get(
        Uri.parse('${Config.apiUrl}/api/students'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final students = List<Map<String, dynamic>>.from(data['students'] ?? []);
          return students.firstWhere(
            (student) => student['id'] == studentId,
            orElse: () => {},
          );
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}

