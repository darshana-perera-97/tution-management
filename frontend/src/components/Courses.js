import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Table, Modal, Form, Alert, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  HiOutlineEye, 
  HiOutlineUserGroup, 
  HiOutlineChatBubbleLeftRight, 
  HiOutlineTrash,
  HiOutlineBookOpen,
  HiOutlineAcademicCap,
  HiOutlineUser,
  HiOutlineCurrencyDollar,
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineQrCode,
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineIdentification,
  HiOutlinePaperAirplane,
  HiOutlineDocumentText,
  HiOutlineUsers
} from 'react-icons/hi2';
import '../App.css';
import API_URL from '../config';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanResult, setQrScanResult] = useState('');
  const [scannerInstance, setScannerInstance] = useState(null);
  const qrScannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOperator, setIsOperator] = useState(false);
  const [isAdminOrOperator, setIsAdminOrOperator] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkMessageLoading, setBulkMessageLoading] = useState(false);

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
  const [formData, setFormData] = useState({
    courseName: '',
    teacherId: '',
    grade: '',
    subject: '',
    courseFee: '',
    teacherPaymentPercentage: ''
  });

  useEffect(() => {
    // Check if user is operator (not admin)
    const isOperatorAuth = localStorage.getItem('isOperatorAuthenticated');
    const isAdminAuth = localStorage.getItem('isAuthenticated');
    setIsOperator(!!isOperatorAuth && !isAdminAuth);
    setIsAdminOrOperator(!!isAdminAuth || !!isOperatorAuth);
    
    fetchCourses();
    fetchTeachers();
    fetchStudents();
    
    // Live syncing with minimum delay (5 seconds)
    const SYNC_INTERVAL = 5000; // 5 seconds minimum delay
    const syncInterval = setInterval(() => {
      fetchCourses();
      fetchTeachers();
      fetchStudents();
    }, SYNC_INTERVAL);
    
    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedCourses,
    goToPage,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination(courses, {
    itemsPerPageDesktop: 10,
    itemsPerPageMobile: 5
  });

  // Handle QR Scanner lifecycle
  useEffect(() => {
    let html5QrCode = null;
    let isMounted = true;
    
    if (showQRScanner && selectedCourse) {
      const startScanner = async () => {
        // Wait a bit for the DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isMounted || !qrScannerRef.current) {
          return;
        }
        
        try {
          const scannerId = qrScannerRef.current.id || `qr-reader-${selectedCourse?.id || 'default'}`;
          
          // Ensure the element has an ID
          if (!qrScannerRef.current.id) {
            qrScannerRef.current.id = scannerId;
          }
          
          html5QrCode = new Html5Qrcode(scannerId);
          
          await html5QrCode.start(
            { facingMode: "environment" }, // Use back camera
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              // Successfully scanned
              if (!isMounted) return;
              setQrScanResult(decodedText);
              if (html5QrCode) {
                safeStopScanner(html5QrCode).then(() => {
                  if (isMounted) {
                    setScannerInstance(null);
                    setShowQRScanner(false);
                  }
                  // Auto-add student if valid
                  if (decodedText) {
                    // Use setTimeout to avoid state update issues
                    setTimeout(async () => {
                      const student = students.find(s => s.id === decodedText.trim());
                      if (student && selectedCourse) {
                        if (!gradesMatch(student.grade, selectedCourse.grade)) {
                          setError(`Student grade (${student.grade}) does not match course grade (${selectedCourse.grade})`);
                          return;
                        }
                        const currentEnrolled = selectedCourse.enrolledStudents || [];
                        if (currentEnrolled.includes(decodedText.trim())) {
                          setError('Student is already enrolled in this course.');
                          return;
                        }
                        
                        const updatedEnrolledStudents = [...currentEnrolled, decodedText.trim()];
                        
                        try {
                          const response = await fetch(`${API_URL}/api/courses/${selectedCourse.id}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              enrolledStudents: updatedEnrolledStudents
                            }),
                          });

                          const data = await response.json();

                          if (data.success) {
                            const updatedCourse = {
                              ...selectedCourse,
                              enrolledStudents: updatedEnrolledStudents
                            };
                            setCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c));
                            setSelectedCourse(updatedCourse);
                            setSuccess(`Student ${student.fullName} added successfully!`);
                            setTimeout(() => setSuccess(''), 3000);
                          } else {
                            setError(data.message || 'Failed to add student to course');
                          }
                        } catch (err) {
                          console.error('Error adding student to course:', err);
                          setError('Unable to connect to server. Please try again later.');
                        }
                      } else if (!student) {
                        setError('Student ID not found. Please check and try again.');
                      }
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
            setError('Failed to start camera. Please check permissions and try again.');
            setShowQRScanner(false);
          }
        }
      };

      startScanner();
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (html5QrCode) {
        safeStopScanner(html5QrCode);
      }
    };
  }, [showQRScanner, students, selectedCourse, courses]);

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

  const fetchTeachers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teachers`);
      const data = await response.json();
      if (data.success) {
        setTeachers(data.teachers);
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Course created successfully!');
        setFormData({ courseName: '', teacherId: '', grade: '', subject: '', courseFee: '', teacherPaymentPercentage: '' });
        setShowModal(false);
        fetchCourses();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to create course');
      }
    } catch (err) {
      console.error('Error creating course:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        const response = await fetch(`${API_URL}/api/courses/${id}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          setSuccess('Course deleted successfully!');
          fetchCourses();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(data.message || 'Failed to delete course');
        }
      } catch (err) {
        console.error('Error deleting course:', err);
        setError('Unable to connect to server. Please try again later.');
      }
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setFormData({ courseName: '', teacherId: '', grade: '', subject: '', courseFee: '', teacherPaymentPercentage: '' });
    setError('');
    setSuccess('');
  };

  const handleViewMore = (course) => {
    setSelectedCourse(course);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedCourse(null);
  };

  const handleManageStudents = (course) => {
    setSelectedCourse(course);
    setShowManageStudentsModal(true);
    setStudentIdInput('');
    setShowQRScanner(false);
    setQrScanResult('');
  };

  const handleCloseManageStudentsModal = () => {
    // Stop scanner if running
    if (scannerInstance) {
      safeStopScanner(scannerInstance).then(() => {
        setScannerInstance(null);
      });
    }
    setShowManageStudentsModal(false);
    setSelectedCourse(null);
    setStudentIdInput('');
    setShowQRScanner(false);
    setQrScanResult('');
  };

  const handleBulkMessage = (course) => {
    setSelectedCourse(course);
    setBulkMessage('');
    setShowBulkMessageModal(true);
    setError('');
    setSuccess('');
  };

  const handleCloseBulkMessageModal = () => {
    setShowBulkMessageModal(false);
    setSelectedCourse(null);
    setBulkMessage('');
    setError('');
    setSuccess('');
  };

  const handleSendBulkMessage = async (e) => {
    e.preventDefault();
    if (!bulkMessage.trim() || !selectedCourse) {
      setError('Please enter a message');
      return;
    }

    setError('');
    setSuccess('');
    setBulkMessageLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/courses/${selectedCourse.id}/bulk-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: bulkMessage
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Bulk message sent successfully to ${data.sentCount || 0} student(s)!`);
        setBulkMessage('');
        setTimeout(() => {
          setShowBulkMessageModal(false);
          setSelectedCourse(null);
          setSuccess('');
        }, 2000);
      } else {
        setError(data.message || 'Failed to send bulk message');
      }
    } catch (err) {
      console.error('Error sending bulk message:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setBulkMessageLoading(false);
    }
  };

  const handleAddStudent = async (studentId) => {
    if (!studentId || !studentId.trim()) {
      setError('Please enter a valid Student ID');
      return;
    }

    const student = students.find(s => s.id === studentId.trim());
    if (!student) {
      setError('Student ID not found. Please check and try again.');
      return;
    }

    if (!gradesMatch(student.grade, selectedCourse.grade)) {
      setError(`Student grade (${student.grade}) does not match course grade (${selectedCourse.grade})`);
      return;
    }

    const currentEnrolled = selectedCourse.enrolledStudents || [];
    if (currentEnrolled.includes(studentId.trim())) {
      setError('Student is already enrolled in this course.');
      return;
    }

    const updatedEnrolledStudents = [...currentEnrolled, studentId.trim()];

    try {
      // Update course in backend
      const response = await fetch(`${API_URL}/api/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrolledStudents: updatedEnrolledStudents
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        const updatedCourse = {
          ...selectedCourse,
          enrolledStudents: updatedEnrolledStudents
        };
        setCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c));
        setSelectedCourse(updatedCourse);
        setStudentIdInput('');
        setQrScanResult('');
        setError('');
        setSuccess(`Student ${student.fullName} added successfully!`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to add student to course');
      }
    } catch (err) {
      console.error('Error adding student to course:', err);
      setError('Unable to connect to server. Please try again later.');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    const currentEnrolled = selectedCourse.enrolledStudents || [];
    const updatedEnrolled = currentEnrolled.filter(id => id !== studentId);
    
    try {
      // Update course in backend
      const response = await fetch(`${API_URL}/api/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrolledStudents: updatedEnrolled
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        const updatedCourse = {
          ...selectedCourse,
          enrolledStudents: updatedEnrolled
        };
        setCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c));
        setSelectedCourse(updatedCourse);
        
        const student = students.find(s => s.id === studentId);
        setSuccess(`Student ${student ? student.fullName : 'Unknown'} removed successfully!`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to remove student from course');
      }
    } catch (err) {
      console.error('Error removing student from course:', err);
      setError('Unable to connect to server. Please try again later.');
    }
  };


  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Unknown';
  };

  const normalizeGrade = (grade) => {
    if (!grade) return '';
    // Remove "Grade " prefix if present and trim
    return grade.toString().replace(/^Grade\s+/i, '').trim();
  };

  const gradesMatch = (grade1, grade2) => {
    return normalizeGrade(grade1) === normalizeGrade(grade2);
  };

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="dashboard-title">Courses</h2>
            <p className="dashboard-subtitle">Manage system courses</p>
          </div>
          <Button
            className="add-operator-btn"
            onClick={() => setShowModal(true)}
          >
            + Add Course
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

      <div className="operators-table-container">
        <div className="table-header-section">
          <h3>
            Courses
            <span className="text-muted ms-2" style={{ fontSize: '14px', fontWeight: '400' }}>
              ({courses.length} {courses.length === 1 ? 'course' : 'courses'})
            </span>
          </h3>
        </div>
        <div className="table-responsive">
          <Table striped bordered hover className="operators-table d-none d-lg-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Course Name</th>
                <th>Subject</th>
                <th>Teacher</th>
                <th>Grade</th>
                <th>Course Fee</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCourses.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <HiOutlineBookOpen style={{ fontSize: '48px', color: '#94a3b8', opacity: 0.5 }} />
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                        No courses found. Click "Add Course" to create one.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((course, index) => (
                  <tr key={course.id}>
                    <td style={{ padding: '16px 32px' }}>{startIndex + index + 1}</td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <HiOutlineBookOpen style={{ fontSize: '18px', color: '#3b82f6' }} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                          {course.courseName}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HiOutlineAcademicCap style={{ fontSize: '16px', color: '#64748b' }} />
                        <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                          {course.subject || '-'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HiOutlineUser style={{ fontSize: '16px', color: '#64748b' }} />
                        <span style={{ fontSize: '14px', color: '#475569' }}>
                          {getTeacherName(course.teacherId)}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HiOutlineAcademicCap style={{ fontSize: '16px', color: '#64748b' }} />
                        <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                          {course.grade}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HiOutlineCurrencyDollar style={{ fontSize: '16px', color: '#64748b' }} />
                        <span style={{ fontSize: '14px', color: '#475569' }}>
                          {course.courseFee ? `Rs. ${parseFloat(course.courseFee).toFixed(2)}` : '-'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <div className="d-flex gap-2 flex-wrap">
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>View More</Tooltip>}
                        >
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleViewMore(course)}
                            className="action-btn-icon"
                          >
                            <HiOutlineEye />
                          </Button>
                        </OverlayTrigger>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>Manage Students</Tooltip>}
                        >
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleManageStudents(course)}
                            className="action-btn-icon"
                          >
                            <HiOutlineUserGroup />
                          </Button>
                        </OverlayTrigger>
                        {isAdminOrOperator && (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>Bulk Message</Tooltip>}
                          >
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => handleBulkMessage(course)}
                              className="action-btn-icon"
                            >
                              <HiOutlineChatBubbleLeftRight />
                            </Button>
                          </OverlayTrigger>
                        )}
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>Delete</Tooltip>}
                        >
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(course.id)}
                            className="action-btn-icon"
                          >
                            <HiOutlineTrash />
                          </Button>
                        </OverlayTrigger>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="d-lg-none">
          {paginatedCourses.length === 0 ? (
            <div className="text-center text-muted py-5">
              <p>No courses found. Click "Add Course" to create one.</p>
            </div>
          ) : (
            <div className="student-cards-container">
              {paginatedCourses.map((course, index) => (
                <Card key={course.id} className="student-card mb-3">
                  <Card.Body>
                    <div className="student-card-header mb-0">
                      <h5 className="student-card-name mb-0">{course.courseName}</h5>
                    </div>
                    <div className="student-card-actions">
                      <div className="student-actions-grid">
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>View More</Tooltip>}
                        >
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleViewMore(course)}
                            className="action-btn-icon"
                        >
                            <HiOutlineEye />
                        </Button>
                        </OverlayTrigger>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>Manage Students</Tooltip>}
                        >
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleManageStudents(course)}
                            className="action-btn-icon"
                        >
                            <HiOutlineUserGroup />
                        </Button>
                        </OverlayTrigger>
                        {isAdminOrOperator && (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>Bulk Message</Tooltip>}
                          >
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() => handleBulkMessage(course)}
                              className="action-btn-icon"
                          >
                              <HiOutlineChatBubbleLeftRight />
                          </Button>
                          </OverlayTrigger>
                        )}
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>Delete</Tooltip>}
                        >
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(course.id)}
                            className="action-btn-icon"
                        >
                            <HiOutlineTrash />
                        </Button>
                        </OverlayTrigger>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {courses.length > 0 && (
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

      {/* Add Course Modal */}
      <Modal show={showModal} onHide={handleClose} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Add New Course</h2>
            <p>Create a new course for students</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          <Form onSubmit={handleSubmit}>
            <div className="student-form-body">
              <div className="student-form-grid" style={{ padding: '24px' }}>
                {/* Left Column */}
                <div className="student-form-column">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineBookOpen className="student-form-label-icon" />
                      Course Name
                    </label>
                    <input
                      type="text"
                      name="courseName"
                      placeholder="Enter course name"
                      value={formData.courseName}
                      onChange={handleChange}
                      required
                      className="student-form-input"
                    />
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineAcademicCap className="student-form-label-icon" />
                      Subject
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="student-form-select"
                    >
                      <option value="">Select a subject</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                      <option value="English">English</option>
                      <option value="History">History</option>
                      <option value="Geography">Geography</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Economics">Economics</option>
                      <option value="Business Studies">Business Studies</option>
                      <option value="Accounting">Accounting</option>
                      <option value="Art">Art</option>
                      <option value="Music">Music</option>
                      <option value="Physical Education">Physical Education</option>
                      <option value="Psychology">Psychology</option>
                      <option value="Sociology">Sociology</option>
                      <option value="Political Science">Political Science</option>
                      <option value="Literature">Literature</option>
                      <option value="Foreign Language">Foreign Language</option>
                      <option value="Statistics">Statistics</option>
                    </select>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineUser className="student-form-label-icon" />
                      Select Registered Teacher
                    </label>
                    <select
                      name="teacherId"
                      value={formData.teacherId}
                      onChange={handleChange}
                      required
                      className="student-form-select"
                    >
                      <option value="">Select a teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name} - {teacher.subject}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right Column */}
                <div className="student-form-column">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineAcademicCap className="student-form-label-icon" />
                      Select Grade
                    </label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleChange}
                      required
                      className="student-form-select"
                    >
                      <option value="">Select a grade</option>
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                      <option value="Grade 13">Grade 13</option>
                      <option value="After AL">After AL</option>
                      <option value="After OL">After OL</option>
                    </select>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineCurrencyDollar className="student-form-label-icon" />
                      Course Fee (for Student)
                    </label>
                    <input
                      type="number"
                      name="courseFee"
                      placeholder="Enter course fee (e.g., 100.00)"
                      value={formData.courseFee}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="student-form-input"
                    />
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineCurrencyDollar className="student-form-label-icon" />
                      Teacher Payment Percentage
                    </label>
                    <input
                      type="number"
                      name="teacherPaymentPercentage"
                      placeholder="Enter percentage (e.g., 70)"
                      value={formData.teacherPaymentPercentage}
                      onChange={handleChange}
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      className="student-form-input"
                    />
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#64748b',
                      marginTop: '6px'
                    }}>
                      Percentage of course fee that will be paid to the teacher (0-100%)
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="danger" style={{ 
                  marginTop: '24px',
                  marginLeft: '24px',
                  marginRight: '24px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '8px'
                }}>
                  {error}
                </Alert>
              )}

              <div className="student-form-actions">
                <button 
                  type="button"
                  onClick={handleClose}
                  className="student-form-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="student-form-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : (
                    <>
                      <span>+</span>
                      Create Course
                    </>
                  )}
                </button>
              </div>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* View Course Details Modal - Benchmark Style */}
      <Modal show={showViewModal} onHide={handleCloseViewModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Course Details</h2>
            <p>View complete course information</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedCourse && (
            <div className="student-form-body">
              {/* Details Grid */}
              <div className="student-form-grid" style={{ padding: '24px' }}>
                {/* Left Column */}
                <div className="student-form-column">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineBookOpen className="student-form-label-icon" />
                      Course Name
                    </label>
                    <div className="student-details-value">{selectedCourse.courseName}</div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineAcademicCap className="student-form-label-icon" />
                      Subject
                    </label>
                    <div className="student-details-value">{selectedCourse.subject || '-'}</div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineUser className="student-form-label-icon" />
                      Teacher
                    </label>
                    <div className="student-details-value">{getTeacherName(selectedCourse.teacherId)}</div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineAcademicCap className="student-form-label-icon" />
                      Grade
                    </label>
                    <div className="student-details-value">{selectedCourse.grade}</div>
              </div>
                </div>

                {/* Right Column */}
                <div className="student-form-column">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineCurrencyDollar className="student-form-label-icon" />
                      Course Fee
                    </label>
                    <div className="student-details-value">
                  {selectedCourse.courseFee ? `Rs. ${parseFloat(selectedCourse.courseFee).toFixed(2)}` : '-'}
              </div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineCurrencyDollar className="student-form-label-icon" />
                      Teacher Payment Percentage
                    </label>
                    <div className="student-details-value">
                  {selectedCourse.teacherPaymentPercentage ? `${selectedCourse.teacherPaymentPercentage}%` : '-'}
              </div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineCurrencyDollar className="student-form-label-icon" />
                      Teacher Payment Amount
                    </label>
                    <div className="student-details-value">
                  {selectedCourse.courseFee && selectedCourse.teacherPaymentPercentage 
                    ? `Rs. ${((parseFloat(selectedCourse.courseFee) * parseFloat(selectedCourse.teacherPaymentPercentage)) / 100).toFixed(2)}` 
                    : '-'}
              </div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineClock className="student-form-label-icon" />
                      Created At
                    </label>
                    <div className="student-details-value">
                  {selectedCourse.createdAt 
                    ? new Date(selectedCourse.createdAt).toLocaleString() 
                    : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ 
          background: '#f8fafc', 
          borderTop: '1px solid #e2e8f0', 
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <Button 
            variant="secondary" 
            onClick={handleCloseViewModal}
            style={{
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: '600',
              background: '#e2e8f0',
              color: '#475569',
              border: 'none'
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Manage Students Modal - Benchmark Style */}
      <Modal show={showManageStudentsModal} onHide={handleCloseManageStudentsModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Manage Students</h2>
            <p>{selectedCourse?.courseName} • {selectedCourse?.grade} • {selectedCourse?.subject || 'N/A'}</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedCourse && (
            <div className="student-form-body">
              {error && (
                <Alert variant="danger" style={{ 
                  margin: '24px 24px 0 24px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '8px'
                }} onClose={() => setError('')} dismissible>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" style={{ 
                  margin: '24px 24px 0 24px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  border: 'none',
                  borderRadius: '8px'
                }} onClose={() => setSuccess('')} dismissible>
                  {success}
                </Alert>
              )}

              {/* Add Student Section */}
              <div style={{ 
                padding: '24px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '16px' 
                }}>
                  <HiOutlinePlus style={{ fontSize: '16px', color: '#64748b' }} />
                  <h6 style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    color: '#0f172a', 
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Add Student
                  </h6>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <input
                    type="text"
                    placeholder="Enter Student ID"
                    value={studentIdInput}
                    onChange={(e) => {
                      setStudentIdInput(e.target.value);
                      setError('');
                    }}
                      className="student-form-input"
                      style={{ marginBottom: 0 }}
                  />
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => handleAddStudent(studentIdInput)}
                    style={{
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    <HiOutlinePlus style={{ marginRight: '6px' }} />
                    Add by ID
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
                    style={{
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      background: showQRScanner ? '#ef4444' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: showQRScanner ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(6, 182, 212, 0.3)'
                    }}
                  >
                    <HiOutlineQrCode style={{ marginRight: '6px' }} />
                    {showQRScanner ? 'Cancel Scan' : 'Scan QR Code'}
                  </Button>
                </div>
                
                {showQRScanner && selectedCourse && (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    marginTop: '16px'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label className="student-form-label">
                        <HiOutlineQrCode className="student-form-label-icon" />
                        Camera QR Scanner
                      </label>
                      <div 
                        id={`qr-reader-${selectedCourse.id || 'default'}`}
                        ref={qrScannerRef}
                        style={{ width: '100%', maxWidth: '500px', margin: '16px auto 0 auto' }}
                      ></div>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#94a3b8', 
                        marginTop: '12px',
                        marginBottom: 0
                      }}>
                        Point your camera at the student's QR code. The scanner will automatically detect and add the student.
                      </p>
                    </div>
                    {qrScanResult && (
                      <Alert variant="info" style={{ 
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#2563eb',
                        border: 'none',
                        borderRadius: '8px',
                        marginBottom: '16px'
                      }}>
                        Scanned ID: <strong>{qrScanResult}</strong>
                      </Alert>
                    )}
                    <div style={{ display: 'flex', gap: '12px' }}>
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
                        style={{
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: '600',
                          background: '#e2e8f0',
                          color: '#475569',
                          border: 'none'
                        }}
                      >
                        Stop Scanner
                      </Button>
                      {qrScanResult && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleAddStudent(qrScanResult)}
                          style={{
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          <HiOutlinePlus style={{ marginRight: '4px' }} />
                          Add Student
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Enrolled Students Section */}
              <div style={{ padding: '24px' }}>
                <div className="table-header-section" style={{ marginBottom: '0' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                    Enrolled Students ({selectedCourse.enrolledStudents && Array.isArray(selectedCourse.enrolledStudents) ? selectedCourse.enrolledStudents.length : 0})
                  </h3>
                </div>
                {selectedCourse.enrolledStudents && Array.isArray(selectedCourse.enrolledStudents) && selectedCourse.enrolledStudents.length > 0 ? (
                  <div className="operators-table-container">
                  <div className="table-responsive">
                      <Table className="operators-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Student ID</th>
                          <th>Full Name</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCourse.enrolledStudents.map((studentId, index) => {
                          const student = students.find(s => s.id === studentId);
                          return student ? (
                            <tr key={studentId}>
                              <td>{index + 1}</td>
                                <td>
                                  <code style={{ 
                                    background: '#f8fafc', 
                                    padding: '4px 8px', 
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: '#3b82f6',
                                    fontWeight: '600'
                                  }}>{student.id}</code>
                                </td>
                              <td>{student.fullName}</td>
                              <td>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRemoveStudent(studentId)}
                                    className="action-btn-icon"
                                >
                                    <HiOutlineXMark />
                                </Button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={studentId}>
                              <td>{index + 1}</td>
                                <td>
                                  <code style={{ 
                                    background: '#f8fafc', 
                                    padding: '4px 8px', 
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: '#3b82f6',
                                    fontWeight: '600'
                                  }}>{studentId}</code>
                                </td>
                                <td style={{ color: '#94a3b8' }}>Student not found</td>
                              <td>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRemoveStudent(studentId)}
                                    className="action-btn-icon"
                                >
                                    <HiOutlineXMark />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: '#94a3b8'
                  }}>
                    <HiOutlineUserGroup style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>No students enrolled in this course.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ 
          background: '#f8fafc', 
          borderTop: '1px solid #e2e8f0', 
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <Button 
            variant="secondary" 
            onClick={handleCloseManageStudentsModal}
            style={{
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: '600',
              background: '#e2e8f0',
              color: '#475569',
              border: 'none'
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Message Modal - Benchmark Style */}
      <Modal show={showBulkMessageModal} onHide={handleCloseBulkMessageModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Send Bulk Message</h2>
            <p>{selectedCourse?.courseName} • {selectedCourse?.subject || 'N/A'} • {selectedCourse?.enrolledStudents?.length || 0} student(s)</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedCourse && (
            <div className="student-form-body">
                {error && (
                <Alert variant="danger" style={{ 
                  margin: '0 24px 24px 24px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '8px'
                }} onClose={() => setError('')} dismissible>
                    {error}
                  </Alert>
                )}

                {success && (
                <Alert variant="success" style={{ 
                  margin: '0 24px 24px 24px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  border: 'none',
                  borderRadius: '8px'
                }} onClose={() => setSuccess('')} dismissible>
                    {success}
                  </Alert>
                )}

              <Form onSubmit={handleSendBulkMessage} style={{ padding: '0 24px' }}>
                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlineDocumentText className="student-form-label-icon" />
                    Message
                  </label>
                  <textarea
                    rows={8}
                    placeholder="Enter your message here..."
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    required
                    className="student-form-input"
                    style={{ 
                      resize: 'vertical', 
                      minHeight: '160px',
                      fontFamily: 'inherit'
                    }}
                  />
                  <p style={{ 
                    fontSize: '12px', 
                    color: '#94a3b8', 
                    marginTop: '8px',
                    marginBottom: 0
                  }}>
                    The message will be sent to all enrolled students' WhatsApp numbers.
                  </p>
                </div>

                <div className="student-form-actions" style={{ marginTop: '32px' }}>
                  <button 
                    type="button"
                    onClick={handleCloseBulkMessageModal}
                    className="student-form-cancel-btn"
                    disabled={bulkMessageLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="student-form-submit-btn"
                    disabled={bulkMessageLoading || !bulkMessage.trim()}
                  >
                    {bulkMessageLoading ? (
                      <>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <HiOutlinePaperAirplane style={{ fontSize: '16px' }} />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </Form>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Courses;

