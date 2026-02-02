import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { Container, Button, Table, Modal, Form, Alert, Card } from 'react-bootstrap';
import { Html5Qrcode } from 'html5-qrcode';
import '../App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5253';

const Attendance = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [showMarkAttendanceModal, setShowMarkAttendanceModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanResult, setQrScanResult] = useState('');
  const [scannerInstance, setScannerInstance] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warnings, setWarnings] = useState([]);
  const qrScannerRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    fetchPayments();
    fetchAttendance();
  }, []);

  // Handle QR Scanner lifecycle
  useEffect(() => {
    let html5QrCode = null;
    let isMounted = true;
    let scanProcessed = false;
    
    if (showQRScanner && qrScannerRef.current && selectedCourse) {
      const startScanner = async () => {
        try {
          const scannerId = 'qr-reader-attendance';
          html5QrCode = new Html5Qrcode(scannerId);
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              if (!isMounted || scanProcessed) return;
              scanProcessed = true;
              
              // Batch state updates
              startTransition(() => {
                setQrScanResult(decodedText);
              });
              
              if (html5QrCode) {
                html5QrCode.stop().then(() => {
                  if (html5QrCode) {
                    html5QrCode.clear();
                  }
                  if (isMounted) {
                    startTransition(() => {
                      setScannerInstance(null);
                      setShowQRScanner(false);
                    });
                  }
                  if (decodedText && isMounted) {
                    setTimeout(() => {
                      handleMarkAttendance(decodedText.trim());
                    }, 100);
                  }
                }).catch((err) => {
                  if (err.message && !err.message.includes('not running')) {
                    console.error('Error stopping scanner:', err);
                  }
                  scanProcessed = false;
                });
              }
            },
            (errorMessage) => {
              // Error handling is done internally by the library
            }
          );
          
          if (isMounted) {
            setScannerInstance(html5QrCode);
          }
        } catch (err) {
          console.error('Error starting QR scanner:', err);
          if (isMounted) {
            startTransition(() => {
              setError('Failed to start camera. Please check permissions and try again.');
              setShowQRScanner(false);
            });
          }
        }
      };

      startScanner();
    }

    return () => {
      isMounted = false;
      scanProcessed = false;
      if (html5QrCode) {
        html5QrCode.stop().then(() => {
          if (html5QrCode) {
            html5QrCode.clear();
          }
        }).catch((err) => {
          if (err.message && !err.message.includes('not running') && !err.message.includes('not paused')) {
            console.error('Error in cleanup:', err);
          }
        });
      }
    };
  }, [showQRScanner, selectedCourse, handleMarkAttendance]);

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/students`);
      const data = await response.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses`);
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments`);
      const data = await response.json();
      if (data.success) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`${API_URL}/api/attendance`);
      const data = await response.json();
      if (data.success) {
        setAttendance(data.attendance);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const checkStudentCourseStatus = useCallback((studentId, courseId) => {
    const student = students.find(s => s.id === studentId);
    const course = courses.find(c => c.id === courseId);
    const warningsList = [];

    if (!student) {
      warningsList.push('Student not found');
      return { isValid: false, warnings: warningsList };
    }

    if (!course) {
      warningsList.push('Course not found');
      return { isValid: false, warnings: warningsList };
    }

    // Check if student is registered for course
    const isRegistered = course.enrolledStudents &&
      Array.isArray(course.enrolledStudents) &&
      course.enrolledStudents.includes(studentId);

    if (!isRegistered) {
      warningsList.push('Student is not registered for this course');
    }

    // Check if course fees are ending (check if there are pending payments)
    const currentDate = new Date();
    const enrollmentDate = new Date(student.createdAt);
    const courseCreatedDate = new Date(course.createdAt);
    const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;

    // Check current month payment
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthPayment = payments.find(
      p => p.studentId === studentId &&
           p.monthKey === currentMonthKey &&
           p.courseId === courseId &&
           p.status === 'Paid'
    );

    if (!currentMonthPayment) {
      warningsList.push('Course fees for current month are not paid');
    }

    return {
      isValid: isRegistered,
      warnings: warningsList,
      student,
      course
    };
  }, [students, courses, payments]);

  const handleMarkAttendance = useCallback(async (studentId) => {
    if (isProcessingRef.current) return;
    
    if (!selectedCourse) {
      setError('Please select a course first');
      return;
    }

    if (!studentId || !studentId.trim()) {
      setError('Please enter a valid Student ID');
      return;
    }

    isProcessingRef.current = true;

    // Batch state updates
    startTransition(() => {
      setError('');
      setWarnings([]);
      setSelectedStudent(null);
    });

    // Check student and course status
    const status = checkStudentCourseStatus(studentId.trim(), selectedCourse);
    
    startTransition(() => {
      if (status.student) {
        setSelectedStudent(status.student);
        setShowStudentDetails(true);
      }

      if (status.warnings.length > 0) {
        setWarnings(status.warnings);
      }

      if (!status.isValid) {
        setError('Cannot mark attendance: ' + status.warnings.join(', '));
        isProcessingRef.current = false;
        return;
      }
    });

    if (!status.isValid) {
      return;
    }

    // Mark attendance
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentId.trim(),
          courseId: selectedCourse,
          date: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        startTransition(() => {
          setSuccess('Attendance marked successfully!');
          setStudentIdInput('');
          setQrScanResult('');
        });
        await fetchAttendance();
        setTimeout(() => {
          startTransition(() => {
            setSuccess('');
            setWarnings([]);
            setSelectedStudent(null);
            setShowStudentDetails(false);
          });
          isProcessingRef.current = false;
        }, 3000);
      } else {
        setError(data.message || 'Failed to mark attendance');
        isProcessingRef.current = false;
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError('Unable to connect to server. Please try again later.');
      isProcessingRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, checkStudentCourseStatus]);

  const handleCloseMarkAttendanceModal = () => {
    setShowMarkAttendanceModal(false);
    setSelectedCourse('');
    setStudentIdInput('');
    setQrScanResult('');
    setError('');
    setSuccess('');
    setWarnings([]);
    setSelectedStudent(null);
    setShowStudentDetails(false);
    if (scannerInstance) {
      scannerInstance.stop().then(() => {
        if (scannerInstance) {
          scannerInstance.clear();
        }
        setScannerInstance(null);
      }).catch((err) => {
        if (err.message && !err.message.includes('not running') && !err.message.includes('not paused')) {
          console.error('Error stopping scanner:', err);
        }
        setScannerInstance(null);
      });
    }
    setShowQRScanner(false);
  };

  const getAllAttendanceWithInfo = () => {
    return attendance
      .map(record => {
        const student = students.find(s => s.id === record.studentId);
        const course = courses.find(c => c.id === record.courseId);
        return {
          ...record,
          studentName: student ? student.fullName : 'Unknown',
          courseName: course ? course.courseName : 'Unknown',
          courseSubject: course ? course.subject : '-'
        };
      })
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.courseName : 'Unknown';
  };

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="dashboard-title">Attendance</h2>
            <p className="dashboard-subtitle">Mark and view student attendance</p>
          </div>
          <Button
            className="add-operator-btn"
            onClick={() => setShowMarkAttendanceModal(true)}
          >
            + Mark Attendance
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-3" onClose={() => setSuccess('')} dismissible>
          {success}
        </Alert>
      )}

      {/* Attendance Records Table */}
      <div className="mb-4">
        <h5 className="mb-3">Attendance Records</h5>
        <div className="operators-table-container">
          <Table striped bordered hover className="operators-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Course</th>
                <th>Subject</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {getAllAttendanceWithInfo().length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                getAllAttendanceWithInfo().map((record, index) => (
                  <tr key={record.id}>
                    <td>{index + 1}</td>
                    <td><code>{record.studentId}</code></td>
                    <td>{record.studentName}</td>
                    <td>{record.courseName}</td>
                    <td>{record.courseSubject}</td>
                    <td>
                      {record.date 
                        ? new Date(record.date).toLocaleString() 
                        : new Date(record.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      <Modal show={showMarkAttendanceModal} onHide={handleCloseMarkAttendanceModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Mark Attendance</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label><strong>Select Course</strong></Form.Label>
              <Form.Select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setStudentIdInput('');
                  setQrScanResult('');
                  setError('');
                  setWarnings([]);
                  setSelectedStudent(null);
                  setShowStudentDetails(false);
                  if (scannerInstance) {
                    scannerInstance.stop().then(() => {
                      if (scannerInstance) {
                        scannerInstance.clear();
                      }
                      setScannerInstance(null);
                    }).catch((err) => {
                      if (err.message && !err.message.includes('not running') && !err.message.includes('not paused')) {
                        console.error('Error stopping scanner:', err);
                      }
                      setScannerInstance(null);
                    });
                  }
                  setShowQRScanner(false);
                }}
                className="form-control-custom"
              >
                <option value="">-- Select a course --</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.courseName} ({course.subject}) - {course.grade}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {selectedCourse && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label><strong>Student ID</strong></Form.Label>
                  <div className="d-flex gap-2" style={{ flexWrap: 'nowrap' }}>
                    <Form.Control
                      type="text"
                      placeholder="Enter Student ID"
                      value={studentIdInput}
                      onChange={(e) => {
                        setStudentIdInput(e.target.value);
                        setError('');
                        setWarnings([]);
                        setSelectedStudent(null);
                        setShowStudentDetails(false);
                      }}
                      className="form-control-custom"
                      style={{ flex: '1', minWidth: '0' }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleMarkAttendance(studentIdInput);
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      onClick={() => handleMarkAttendance(studentIdInput)}
                      disabled={loading || !studentIdInput.trim()}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Mark
                    </Button>
                    <Button
                      variant="info"
                      onClick={() => {
                        if (showQRScanner && scannerInstance) {
                          scannerInstance.stop().then(() => {
                            if (scannerInstance) {
                              scannerInstance.clear();
                            }
                            setScannerInstance(null);
                          }).catch((err) => {
                            if (err.message && !err.message.includes('not running') && !err.message.includes('not paused')) {
                              console.error('Error stopping scanner:', err);
                            }
                            setScannerInstance(null);
                          });
                        }
                        setShowQRScanner(!showQRScanner);
                        setQrScanResult('');
                        setError('');
                      }}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {showQRScanner ? 'Cancel Scan' : 'Scan QR Code'}
                    </Button>
                  </div>
                </Form.Group>

                {showQRScanner && (
                  <div className="mb-3 p-3 bg-light rounded">
                    <Form.Group>
                      <Form.Label>Camera QR Scanner</Form.Label>
                      <div 
                        id={`qr-reader-attendance`}
                        ref={qrScannerRef}
                        style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}
                      ></div>
                      <Form.Text className="text-muted d-block mt-2">
                        Point your camera at the student's QR code. The scanner will automatically detect and mark attendance.
                      </Form.Text>
                    </Form.Group>
                    {qrScanResult && (
                      <Alert variant="info" className="mb-2 mt-2">
                        Scanned ID: <strong>{qrScanResult}</strong>
                      </Alert>
                    )}
                    <div className="d-flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (scannerInstance) {
                            scannerInstance.stop().then(() => {
                              if (scannerInstance) {
                                scannerInstance.clear();
                              }
                              setScannerInstance(null);
                            }).catch((err) => {
                              if (err.message && !err.message.includes('not running') && !err.message.includes('not paused')) {
                                console.error('Error stopping scanner:', err);
                              }
                              setScannerInstance(null);
                            });
                          }
                          setShowQRScanner(false);
                          setQrScanResult('');
                        }}
                      >
                        Stop Scanner
                      </Button>
                      {qrScanResult && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleMarkAttendance(qrScanResult)}
                          disabled={loading}
                        >
                          Mark Attendance
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {warnings.length > 0 && (
                  <Alert variant="warning" className="mb-3">
                    <strong>Warnings:</strong>
                    <ul className="mb-0 mt-2">
                      {warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {showStudentDetails && selectedStudent && (
                  <Card className="mt-3">
                    <Card.Header>
                      <strong>Student Details</strong>
                    </Card.Header>
                    <Card.Body>
                      <div className="row">
                        <div className="col-md-6">
                          <p className="mb-2">
                            <strong>Name:</strong> {selectedStudent.fullName}
                          </p>
                          <p className="mb-2">
                            <strong>Grade:</strong> {selectedStudent.grade}
                          </p>
                          <p className="mb-2">
                            <strong>Parent Name:</strong> {selectedStudent.parentName || '-'}
                          </p>
                          <p className="mb-2">
                            <strong>Contact:</strong> {selectedStudent.contactNumber || '-'}
                          </p>
                        </div>
                        <div className="col-md-6">
                          <p className="mb-2">
                            <strong>WhatsApp:</strong> {selectedStudent.whatsappNumber || '-'}
                          </p>
                          <p className="mb-2">
                            <strong>Address:</strong> {selectedStudent.address || '-'}
                          </p>
                          <p className="mb-2">
                            <strong>DOB:</strong> {selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : '-'}
                          </p>
                          <p className="mb-0">
                            <strong>Enrollment Date:</strong> {new Date(selectedStudent.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                )}
              </>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseMarkAttendanceModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Attendance;

