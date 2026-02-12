import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { Container, Button, Table, Modal, Form, Alert, Card, Row, Col } from 'react-bootstrap';
import { Html5Qrcode } from 'html5-qrcode';
import '../App.css';
import API_URL from '../config';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const Attendance = ({ hideMarkButton = false }) => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [showMarkAttendanceModal, setShowMarkAttendanceModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanResult, setQrScanResult] = useState('');
  const [scannerInstance, setScannerInstance] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState(null);
  const [showAttendanceDetailsModal, setShowAttendanceDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warnings, setWarnings] = useState([]);
  const qrScannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  
  // Queue system states
  const [attendanceQueue, setAttendanceQueue] = useState([]);
  const [lastQueueCount, setLastQueueCount] = useState(0);
  const [showQueuePopup, setShowQueuePopup] = useState(false);
  const [currentQueueItem, setCurrentQueueItem] = useState(null);
  const [popupsEnabled, setPopupsEnabled] = useState(() => {
    // Load from localStorage, default to true
    const saved = localStorage.getItem('attendancePopupsEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Safe function to stop scanner
  const safeStopScanner = async (scanner) => {
    if (!scanner) return;
    
    try {
      // Check if scanner has stop method before calling
      if (typeof scanner.stop === 'function') {
        try {
          await scanner.stop().catch((stopErr) => {
            // Handle promise rejection
            const errorMsg = (stopErr?.message || stopErr?.toString() || '').toLowerCase();
            if (errorMsg && 
                !errorMsg.includes('not running') && 
                !errorMsg.includes('not paused') &&
                !errorMsg.includes('scanner is not running') &&
                !errorMsg.includes('cannot stop') &&
                !errorMsg.includes('scanner is not running or paused')) {
              console.error('Error stopping scanner:', stopErr);
            }
          });
        } catch (syncErr) {
          // Handle synchronous errors
          const errorMsg = (syncErr?.message || syncErr?.toString() || '').toLowerCase();
          if (errorMsg && 
              !errorMsg.includes('not running') && 
              !errorMsg.includes('not paused') &&
              !errorMsg.includes('scanner is not running') &&
              !errorMsg.includes('cannot stop') &&
              !errorMsg.includes('scanner is not running or paused')) {
            console.error('Error stopping scanner:', syncErr);
          }
        }
      }
      
      // Try to clear scanner
      if (typeof scanner.clear === 'function') {
        try {
          scanner.clear();
        } catch (clearErr) {
          // Ignore clear errors
        }
      }
    } catch (err) {
      // Silently ignore errors about scanner not running or cannot stop
      const errorMsg = (err?.message || err?.toString() || '').toLowerCase();
      if (errorMsg && 
          !errorMsg.includes('not running') && 
          !errorMsg.includes('not paused') &&
          !errorMsg.includes('scanner is not running') &&
          !errorMsg.includes('cannot stop') &&
          !errorMsg.includes('scanner is not running or paused')) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    fetchPayments();
    fetchAttendance();
    
    // Set default month to current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
    
    // Live syncing with minimum delay (5 seconds)
    const SYNC_INTERVAL = 5000; // 5 seconds minimum delay
    const syncInterval = setInterval(() => {
      fetchStudents();
      fetchCourses();
      fetchPayments();
      fetchAttendance();
    }, SYNC_INTERVAL);
    
    // Check if user is admin or operator for queue polling
    const isAdmin = localStorage.getItem('isAuthenticated');
    const isOperator = localStorage.getItem('isOperatorAuthenticated');
    const shouldPollQueue = isAdmin || isOperator;
    
    // Poll attendance queue every 2 seconds (only for admin/operator)
    let queueInterval = null;
    if (shouldPollQueue) {
      // Initial fetch
      fetchAttendanceQueue();
      // Set up polling
      queueInterval = setInterval(() => {
        fetchAttendanceQueue();
      }, 2000); // 2 seconds
    }
    
    // Cleanup: Close modal and clear intervals when component unmounts or tab changes
    return () => {
      clearInterval(syncInterval);
      if (queueInterval) {
        clearInterval(queueInterval);
      }
      setShowAttendanceDetailsModal(false);
      setSelectedAttendanceRecord(null);
    };
  }, []);

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
                safeStopScanner(html5QrCode).then(() => {
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
        safeStopScanner(html5QrCode);
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

  // Fetch attendance queue for real-time notifications
  const fetchAttendanceQueue = async () => {
    try {
      const response = await fetch(`${API_URL}/api/attendance/queue`);
      const data = await response.json();
      if (data.success && data.queue) {
        const newQueue = data.queue;
        setAttendanceQueue(newQueue);
        
        // Check if there's a new item (queue count increased)
        if (newQueue.length > lastQueueCount && popupsEnabled) {
          // Get the last item (most recent)
          const latestItem = newQueue[newQueue.length - 1];
          if (latestItem) {
            setCurrentQueueItem(latestItem);
            setShowQueuePopup(true);
          }
        }
        setLastQueueCount(newQueue.length);
      }
    } catch (err) {
      console.error('Error fetching attendance queue:', err);
    }
  };

  // Clear attendance queue
  const handleClearQueue = async () => {
    try {
      const response = await fetch(`${API_URL}/api/attendance/queue/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setAttendanceQueue([]);
        setLastQueueCount(0);
        setShowQueuePopup(false);
        setCurrentQueueItem(null);
      }
    } catch (err) {
      console.error('Error clearing queue:', err);
    }
  };

  // Toggle popups enabled/disabled
  const handleTogglePopups = (enabled) => {
    setPopupsEnabled(enabled);
    localStorage.setItem('attendancePopupsEnabled', enabled.toString());
    if (!enabled) {
      setShowQueuePopup(false);
    }
  };

  // Close queue popup
  const handleCloseQueuePopup = () => {
    setShowQueuePopup(false);
    setCurrentQueueItem(null);
  };

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
      safeStopScanner(scannerInstance).then(() => {
        setScannerInstance(null);
      });
    }
    setShowQRScanner(false);
  };

  const getAllAttendanceWithInfo = () => {
    let filtered = attendance;
    
    // Filter by course if selected
    if (selectedCourseFilter) {
      filtered = filtered.filter(record => record.courseId === selectedCourseFilter);
    }
    
    // Filter by month if selected
    if (selectedMonth) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date || record.createdAt);
        const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
        return recordMonth === selectedMonth;
      });
    }
    
    return filtered
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

  // Get available months from attendance data
  const getAvailableMonths = () => {
    const monthsSet = new Set();
    let filteredByCourse = attendance;
    
    if (selectedCourseFilter) {
      filteredByCourse = attendance.filter(record => record.courseId === selectedCourseFilter);
    }
    
    filteredByCourse.forEach(record => {
      const recordDate = new Date(record.date || record.createdAt);
      const month = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(month);
    });
    
    return Array.from(monthsSet).sort().reverse();
  };

  // Format month for display
  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Pagination
  const allAttendance = getAllAttendanceWithInfo();
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedAttendance,
    goToPage,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination(allAttendance, {
    itemsPerPageDesktop: 10,
    itemsPerPageMobile: 5
  });

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.courseName : 'Unknown';
  };

  // Get student's enrolled courses
  const getStudentCourses = (studentId) => {
    return courses.filter(course => 
      course.enrolledStudents && 
      Array.isArray(course.enrolledStudents) && 
      course.enrolledStudents.includes(studentId)
    );
  };

  // Calculate pending payments for a student and specific course
  const calculatePendingPaymentsForCourse = (student, courseId) => {
    if (!student || !courseId) return { pendingAmount: 0, pendingMonths: [] };

    const course = courses.find(c => c.id === courseId);
    if (!course) return { pendingAmount: 0, pendingMonths: [] };

    const studentPayments = payments.filter(p => p.studentId === student.id && p.courseId === courseId);
    const enrollmentDate = new Date(student.createdAt);
    const courseCreatedDate = new Date(course.createdAt);
    const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;
    
    const currentDate = new Date();
    let currentMonth = new Date(enrollmentDateForCourse.getFullYear(), enrollmentDateForCourse.getMonth(), 1);
    const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const pendingMonths = [];
    let totalPending = 0;
    const courseFee = parseFloat(course.courseFee) || 0;

    while (currentMonth <= lastDayOfCurrentMonth) {
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const lastDayOfPaymentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      if (enrollmentDateForCourse <= lastDayOfPaymentMonth) {
        const isPaid = studentPayments.some(
          p => p.monthKey === monthKey
        );
        
        if (!isPaid) {
          const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
          pendingMonths.push({
            month: monthName,
            monthKey: monthKey,
            amount: courseFee
          });
          totalPending += courseFee;
        }
      }
      
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    return {
      pendingAmount: totalPending,
      pendingMonths: pendingMonths
    };
  };

  // Handle attendance record click
  const handleAttendanceRecordClick = (record) => {
    const student = students.find(s => s.id === record.studentId);
    if (student) {
      setSelectedAttendanceRecord({
        ...record,
        student: student
      });
      setShowAttendanceDetailsModal(true);
    }
  };

  // Close attendance details modal
  const handleCloseAttendanceDetailsModal = () => {
    setShowAttendanceDetailsModal(false);
    setSelectedAttendanceRecord(null);
  };

  // Check if user is admin or operator
  const isAdmin = localStorage.getItem('isAuthenticated');
  const isOperator = localStorage.getItem('isOperatorAuthenticated');
  const isAdminOrOperator = isAdmin || isOperator;

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h2 className="dashboard-title">Attendance</h2>
            <p className="dashboard-subtitle">Mark and view student attendance</p>
          </div>
          <div className="d-flex align-items-center gap-3">
            {isAdminOrOperator && (
              <>
                <div className="d-flex align-items-center gap-2">
                  <Form.Check
                    type="switch"
                    id="popup-toggle"
                    label="Show Popups"
                    checked={popupsEnabled}
                    onChange={(e) => handleTogglePopups(e.target.checked)}
                    style={{ whiteSpace: 'nowrap' }}
                  />
                </div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleClearQueue}
                  disabled={attendanceQueue.length === 0}
                >
                  Clear Queue ({attendanceQueue.length})
                </Button>
              </>
            )}
            {!hideMarkButton && (
              <Button
                className="add-operator-btn"
                onClick={() => setShowMarkAttendanceModal(true)}
              >
                + Mark Attendance
              </Button>
            )}
          </div>
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

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6} className="mb-3 mb-md-0">
              <Form.Label><strong>Filter by Course</strong></Form.Label>
              <Form.Select
                value={selectedCourseFilter}
                onChange={(e) => {
                  setSelectedCourseFilter(e.target.value);
                  // Reset to current month when course changes
                  const now = new Date();
                  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  setSelectedMonth(currentMonth);
                }}
                className="form-control-custom"
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.courseName} ({course.subject}) - {course.grade}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label><strong>Filter by Month</strong></Form.Label>
              <Form.Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="form-control-custom"
                disabled={!selectedCourseFilter}
              >
                {selectedCourseFilter ? (
                  getAvailableMonths().length > 0 ? (
                    getAvailableMonths().map(month => (
                      <option key={month} value={month}>
                        {formatMonth(month)}
                      </option>
                    ))
                  ) : (
                    <option value="">No data available</option>
                  )
                ) : (
                  <option value="">Select a course first</option>
                )}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Attendance Records Table */}
      <div className="mb-4">
        <h5 className="mb-3">
          Attendance Records
          {selectedCourseFilter && (
            <span className="text-muted ms-2">
              ({getAllAttendanceWithInfo().length} record{getAllAttendanceWithInfo().length !== 1 ? 's' : ''})
            </span>
          )}
        </h5>
        <div className="operators-table-container">
          {/* Desktop Table View */}
          <Table striped bordered hover className="operators-table d-none d-lg-table">
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
              {paginatedAttendance.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                paginatedAttendance.map((record, index) => (
                  <tr 
                    key={record.id} 
                    onClick={() => handleAttendanceRecordClick(record)}
                    style={{ cursor: 'pointer' }}
                    className="attendance-row-hover"
                  >
                    <td>{startIndex + index + 1}</td>
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

          {/* Mobile Card View */}
          <div className="d-lg-none">
            {paginatedAttendance.length === 0 ? (
              <div className="text-center text-muted py-5">
                <p>No attendance records found.</p>
              </div>
            ) : (
              <div className="student-cards-container">
                {paginatedAttendance.map((record, index) => (
                  <Card 
                    key={record.id} 
                    className="student-card mb-3"
                    onClick={() => handleAttendanceRecordClick(record)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Body>
                      <div className="student-card-header mb-2">
                        <h5 className="student-card-name mb-1">{record.studentName}</h5>
                        <p className="student-card-contact mb-1">
                          <code>{record.studentId}</code>
                        </p>
                        <p className="text-muted small mb-1">
                          <strong>Course:</strong> {record.courseName}
                        </p>
                        <p className="text-muted small mb-1">
                          <strong>Subject:</strong> {record.courseSubject}
                        </p>
                        <p className="text-muted small mb-0">
                          <strong>Date & Time:</strong> {
                            record.date 
                              ? new Date(record.date).toLocaleString() 
                              : new Date(record.createdAt).toLocaleString()
                          }
                        </p>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {allAttendance.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              onNext={nextPage}
              onPrev={prevPage}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
            />
          )}
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
                    safeStopScanner(scannerInstance).then(() => {
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
                          safeStopScanner(scannerInstance).then(() => {
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
                            safeStopScanner(scannerInstance).then(() => {
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

      {/* Attendance Details Modal */}
      <Modal 
        show={showAttendanceDetailsModal} 
        onHide={handleCloseAttendanceDetailsModal} 
        centered 
        size="lg"
        scrollable
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>Student Attendance Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAttendanceRecord && selectedAttendanceRecord.student && (
            <>
              <Row className="mb-4">
                <Col xs={12} md={4} className="text-center mb-3 mb-md-0">
                  {selectedAttendanceRecord.student.imageUrl ? (
                    <img
                      src={`${API_URL}/${selectedAttendanceRecord.student.imageUrl}`}
                      alt={selectedAttendanceRecord.student.fullName}
                      style={{
                        width: '100%',
                        maxWidth: '150px',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '2px solid #dee2e6'
                      }}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '150px',
                        height: '150px',
                        borderRadius: '8px',
                        border: '2px solid #dee2e6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f8f9fa',
                        margin: '0 auto'
                      }}
                    >
                      <span style={{ fontSize: '48px' }}>👤</span>
                    </div>
                  )}
                </Col>
                <Col xs={12} md={8}>
                  <h4 className="mb-2" style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)' }}>
                    {selectedAttendanceRecord.student.fullName}
                  </h4>
                  <p className="mb-1" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                    <strong>Student ID:</strong> <code>{selectedAttendanceRecord.student.id}</code>
                  </p>
                  <p className="mb-1" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                    <strong>Grade:</strong> {selectedAttendanceRecord.student.grade || 'N/A'}
                  </p>
                  <p className="mb-1" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                    <strong>Parent Name:</strong> {selectedAttendanceRecord.student.parentName || 'N/A'}
                  </p>
                  <p className="mb-0" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                    <strong>Contact:</strong> {selectedAttendanceRecord.student.contactNumber || 'N/A'}
                  </p>
                </Col>
              </Row>

              <hr />

              <div className="mb-4">
                <h5 className="mb-3" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
                  Attendance Information
                </h5>
                <Row>
                  <Col xs={12} sm={6} className="mb-2">
                    <strong style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Course:</strong>{' '}
                    <span style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                      {selectedAttendanceRecord.courseName}
                    </span>
                  </Col>
                  <Col xs={12} sm={6} className="mb-2">
                    <strong style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Subject:</strong>{' '}
                    <span style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                      {selectedAttendanceRecord.courseSubject}
                    </span>
                  </Col>
                  <Col xs={12} className="mb-2">
                    <strong style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Date & Time:</strong>{' '}
                    <span style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                      {selectedAttendanceRecord.date
                        ? new Date(selectedAttendanceRecord.date).toLocaleString()
                        : new Date(selectedAttendanceRecord.createdAt).toLocaleString()}
                    </span>
                  </Col>
                </Row>
              </div>

              <hr />

              {/* Pending Payments for Current Course */}
              <div className="mb-4">
                <h5 className="mb-3" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
                  Pending Payments - {selectedAttendanceRecord.courseName}
                </h5>
                {(() => {
                  const pendingInfo = calculatePendingPaymentsForCourse(
                    selectedAttendanceRecord.student,
                    selectedAttendanceRecord.courseId
                  );
                  
                  if (pendingInfo.pendingAmount === 0) {
                    return (
                      <Alert variant="success">
                        <strong>All payments are up to date!</strong>
                      </Alert>
                    );
                  }

                  return (
                    <>
                      <Alert variant="warning">
                        <strong>Total Pending:</strong> ₹{pendingInfo.pendingAmount.toFixed(2)}
                      </Alert>
                      {pendingInfo.pendingMonths.length > 0 && (
                        <div className="table-responsive">
                          <Table striped bordered hover size="sm">
                            <thead>
                              <tr>
                                <th>Month</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pendingInfo.pendingMonths.map((month, idx) => (
                                <tr key={idx}>
                                  <td>{month.month}</td>
                                  <td>₹{month.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <hr />

              {/* Other Enrolled Courses */}
              <div>
                <h5 className="mb-3" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
                  Other Enrolled Courses
                </h5>
                {(() => {
                  const enrolledCourses = getStudentCourses(selectedAttendanceRecord.student.id);
                  const otherCourses = enrolledCourses.filter(
                    c => c.id !== selectedAttendanceRecord.courseId
                  );

                  if (otherCourses.length === 0) {
                    return (
                      <Alert variant="info">
                        <strong>No other enrolled courses.</strong>
                      </Alert>
                    );
                  }

                  return (
                    <div className="table-responsive">
                      <Table striped bordered hover size="sm">
                        <thead>
                          <tr>
                            <th>Course Name</th>
                            <th>Subject</th>
                            <th>Fee</th>
                          </tr>
                        </thead>
                        <tbody>
                          {otherCourses.map((course) => (
                            <tr key={course.id}>
                              <td>{course.courseName}</td>
                              <td>{course.subject}</td>
                              <td>₹{parseFloat(course.courseFee || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-center">
          <Button 
            variant="secondary" 
            onClick={handleCloseAttendanceDetailsModal}
            style={{ minWidth: '100px' }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Queue Popup Modal - Shows latest attendance record */}
      {isAdminOrOperator && (
        <Modal
          show={showQueuePopup && currentQueueItem && popupsEnabled}
          onHide={handleCloseQueuePopup}
          centered
          size="md"
          backdrop={true}
        >
          <Modal.Header closeButton style={{ backgroundColor: '#4A90E2', color: 'white' }}>
            <Modal.Title>✅ Attendance Marked</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {currentQueueItem && (
              <div>
                <Row className="mb-3">
                  <Col xs={12} md={4} className="text-center mb-3 mb-md-0">
                    {currentQueueItem.studentImageUrl ? (
                      <img
                        src={`${API_URL}/${currentQueueItem.studentImageUrl}`}
                        alt={currentQueueItem.studentName}
                        style={{
                          width: '100%',
                          maxWidth: '120px',
                          height: '120px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '2px solid #dee2e6'
                        }}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/120?text=No+Image';
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '120px',
                          height: '120px',
                          borderRadius: '8px',
                          border: '2px solid #dee2e6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8f9fa',
                          margin: '0 auto'
                        }}
                      >
                        <span style={{ fontSize: '40px' }}>👤</span>
                      </div>
                    )}
                  </Col>
                  <Col xs={12} md={8}>
                    <h5 className="mb-2">{currentQueueItem.studentName}</h5>
                    <p className="mb-1">
                      <strong>Course:</strong> {currentQueueItem.courseName}
                    </p>
                    <p className="mb-1">
                      <strong>Subject:</strong> {currentQueueItem.courseSubject}
                    </p>
                    <p className="mb-0">
                      <strong>Time:</strong>{' '}
                      {currentQueueItem.date
                        ? new Date(currentQueueItem.date).toLocaleTimeString()
                        : new Date(currentQueueItem.createdAt).toLocaleTimeString()}
                    </p>
                  </Col>
                </Row>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseQueuePopup}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </Container>
  );
};

export default Attendance;

