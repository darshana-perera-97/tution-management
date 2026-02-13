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

  /// Get all students
  static Future<List<Map<String, dynamic>>> getAllStudents() async {
    try {
      final response = await http.get(
        Uri.parse('${Config.apiUrl}/api/students'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return List<Map<String, dynamic>>.from(data['students'] ?? []);
        }
        throw Exception(data['message'] ?? 'Failed to fetch students');
      } else {
        throw Exception('Failed to load students: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching students: $e');
    }
  }

  /// Get students enrolled in a course
  static Future<List<Map<String, dynamic>>> getCourseStudents(String courseId) async {
    try {
      final response = await http.get(
        Uri.parse('${Config.apiUrl}/api/courses/$courseId/students'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return List<Map<String, dynamic>>.from(data['students'] ?? []);
        }
        // If endpoint doesn't exist, fallback to all students
        return await getAllStudents();
      } else if (response.statusCode == 404) {
        // Endpoint doesn't exist, fallback to all students
        return await getAllStudents();
      } else {
        throw Exception('Failed to load course students: ${response.statusCode}');
      }
    } catch (e) {
      // If there's an error, try to get all students as fallback
      try {
        return await getAllStudents();
      } catch (_) {
        throw Exception('Error fetching course students: $e');
      }
    }
  }

  /// Mark attendance for all students in a course
  static Future<Map<String, dynamic>> markAllAttendance({
    required String courseId,
    String? date,
  }) async {
    try {
      // First, get all students enrolled in the course
      final students = await getCourseStudents(courseId);
      
      if (students.isEmpty) {
        return {
          'success': false,
          'message': 'No students found for this course',
          'marked': 0,
          'failed': 0,
          'total': 0,
        };
      }

      int marked = 0;
      int failed = 0;
      List<String> errors = [];

      // Mark attendance for each student
      for (final student in students) {
        try {
          final studentId = student['id']?.toString() ?? '';
          if (studentId.isEmpty) continue;

          final result = await markAttendance(
            studentId: studentId,
            courseId: courseId,
            date: date,
          );

          if (result['success'] == true) {
            marked++;
          } else {
            failed++;
            errors.add('${student['name'] ?? studentId}: ${result['message'] ?? 'Failed'}');
          }
        } catch (e) {
          failed++;
          final studentName = student['name']?.toString() ?? student['id']?.toString() ?? 'Unknown';
          errors.add('$studentName: ${e.toString().replaceAll('Exception: ', '')}');
        }
      }

      return {
        'success': marked > 0,
        'message': marked == students.length
            ? 'Attendance marked for all ${students.length} students'
            : 'Marked attendance for $marked out of ${students.length} students',
        'marked': marked,
        'failed': failed,
        'total': students.length,
        'errors': errors,
      };
    } catch (e) {
      throw Exception('Error marking attendance for all students: $e');
    }
  }
}

