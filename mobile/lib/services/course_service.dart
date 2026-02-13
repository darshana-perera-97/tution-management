import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config.dart';

class CourseService {
  /// Fetch all available courses
  static Future<List<Map<String, dynamic>>> fetchCourses() async {
    try {
      final response = await http.get(
        Uri.parse('${Config.apiUrl}/api/courses'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return List<Map<String, dynamic>>.from(data['courses'] ?? []);
        }
        throw Exception(data['message'] ?? 'Failed to fetch courses');
      } else {
        throw Exception('Failed to load courses: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching courses: $e');
    }
  }
}

