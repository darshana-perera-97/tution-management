import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/attendance_service.dart';

class AttendanceScreen extends StatefulWidget {
  final Map<String, dynamic> course;

  const AttendanceScreen({
    super.key,
    required this.course,
  });

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  final TextEditingController _studentIdController = TextEditingController();
  bool _isMarking = false;
  String? _successMessage;
  String? _errorMessage;
  bool _showQRScanner = false;
  MobileScannerController? _scannerController;

  @override
  void initState() {
    super.initState();
    _scannerController = MobileScannerController();
  }

  @override
  void dispose() {
    _studentIdController.dispose();
    _scannerController?.dispose();
    super.dispose();
  }

  Future<void> _markAttendance(String studentId) async {
    if (studentId.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter or scan a student ID';
      });
      return;
    }

    setState(() {
      _isMarking = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final result = await AttendanceService.markAttendance(
        studentId: studentId,
        courseId: widget.course['id'],
      );

      if (result['success'] == true) {
        setState(() {
          _successMessage = result['message'] ?? 'Attendance marked successfully!';
          _studentIdController.clear();
          _showQRScanner = false;
        });

        // Auto-hide success message after 3 seconds
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            setState(() {
              _successMessage = null;
            });
          }
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      setState(() {
        _isMarking = false;
      });
    }
  }

  void _handleQRCode(String code) async {
    // Extract student ID from QR code
    // Assuming QR code contains the student ID directly
    final studentId = code.trim();
    
    // Stop scanner first
    await _scannerController?.stop();
    
    // Close scanner view
    if (mounted) {
      setState(() {
        _showQRScanner = false;
      });
    }
    
    // Mark attendance
    _markAttendance(studentId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        title: Text(
          widget.course['courseName'] ?? 'Mark Attendance',
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 20,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20),
          onPressed: () {
            if (_showQRScanner) {
              setState(() {
                _showQRScanner = false;
              });
              _scannerController?.stop();
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
      ),
      body: _showQRScanner
          ? _buildQRScanner()
          : _buildAttendanceForm(),
    );
  }

  Widget _buildQRScanner() {
    if (_scannerController == null) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    return Stack(
      children: [
        MobileScanner(
          controller: _scannerController!,
          onDetect: (capture) {
            final List<Barcode> barcodes = capture.barcodes;
            if (barcodes.isNotEmpty) {
              for (final barcode in barcodes) {
                if (barcode.rawValue != null && barcode.rawValue!.isNotEmpty) {
                  // Prevent multiple scans
                  _scannerController?.stop();
                  _handleQRCode(barcode.rawValue!);
                  break;
                }
              }
            }
          },
        ),
        Positioned(
          top: 16,
          left: 16,
          right: 16,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.black54,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Point camera at QR code',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
        Positioned(
          bottom: 32,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton.icon(
                onPressed: () {
                  _scannerController?.stop();
                  setState(() {
                    _showQRScanner = false;
                  });
                },
                icon: const Icon(Icons.close, size: 20),
                label: const Text(
                  'Cancel',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF1A1A1A),
                  elevation: 0,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAttendanceForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Course Info Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.course['courseName'] ?? 'Course',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (widget.course['subject'] != null)
                    _buildInfoRow(
                      Icons.book_outlined,
                      'Subject',
                      widget.course['subject'].toString(),
                    ),
                  if (widget.course['grade'] != null) ...[
                    const SizedBox(height: 12),
                    _buildInfoRow(
                      Icons.school_outlined,
                      'Grade',
                      widget.course['grade'].toString(),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Success Message
          if (_successMessage != null)
            Container(
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Color(0xFF22C55E), size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _successMessage!,
                      style: const TextStyle(
                        color: Color(0xFF16A34A),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Error Message
          if (_errorMessage != null)
            Container(
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(
                        color: Color(0xFFEF4444),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // QR Code Scan Button
          SizedBox(
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _isMarking
                  ? null
                  : () async {
                      setState(() {
                        _showQRScanner = true;
                        _errorMessage = null;
                        _successMessage = null;
                      });
                      await Future.delayed(const Duration(milliseconds: 300));
                      if (mounted && _scannerController != null) {
                        await _scannerController!.start();
                      }
                    },
              icon: const Icon(Icons.qr_code_scanner, size: 20),
              label: const Text(
                'Scan QR Code',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Divider
          Row(
            children: [
              Expanded(child: Divider(color: Colors.grey.shade300)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'OR',
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Expanded(child: Divider(color: Colors.grey.shade300)),
            ],
          ),
          const SizedBox(height: 24),

          // Student ID Input
          TextField(
            controller: _studentIdController,
            style: const TextStyle(color: Color(0xFF1A1A1A)),
            keyboardType: TextInputType.text,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _markAttendance(_studentIdController.text.trim()),
            decoration: const InputDecoration(
              labelText: 'Enter Student ID',
              hintText: 'Type student ID here',
              prefixIcon: Icon(Icons.person_outlined, color: Color(0xFF6B7280)),
            ),
          ),
          const SizedBox(height: 24),

          // Mark Attendance Button
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: _isMarking
                  ? null
                  : () => _markAttendance(_studentIdController.text.trim()),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF22C55E),
                foregroundColor: Colors.white,
              ),
              child: _isMarking
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      'Mark Attendance',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF6B7280)),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: const TextStyle(
            color: Color(0xFF6B7280),
            fontSize: 14,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            color: Color(0xFF1A1A1A),
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

