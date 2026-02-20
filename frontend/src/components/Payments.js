import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Table, Modal, Form, Alert, Card, Row, Col } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  HiOutlineCurrencyDollar,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineUser,
  HiOutlineIdentification,
  HiOutlineBookOpen,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineBanknotes,
  HiOutlineMagnifyingGlass,
  HiOutlineQrCode
} from 'react-icons/hi2';
import '../App.css';
import API_URL from '../config';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const Payments = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherPayments, setTeacherPayments] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanResult, setQrScanResult] = useState('');
  const [scannerInstance, setScannerInstance] = useState(null);
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
  const qrScannerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    fetchTeachers();
    fetchTeacherPayments();
    
    // Live syncing with minimum delay (5 seconds)
    const SYNC_INTERVAL = 5000; // 5 seconds minimum delay
    const syncInterval = setInterval(() => {
      fetchStudents();
      fetchCourses();
      fetchPayments();
      fetchTeachers();
      fetchTeacherPayments();
    }, SYNC_INTERVAL);
    
    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  // Handle QR Scanner lifecycle
  useEffect(() => {
    let html5QrCode = null;
    let isMounted = true;
    
    if (showQRScanner && qrScannerRef.current) {
      const startScanner = async () => {
        try {
          const scannerId = qrScannerRef.current.id;
          html5QrCode = new Html5Qrcode(scannerId);
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              if (!isMounted) return;
              setQrScanResult(decodedText);
              if (html5QrCode) {
                safeStopScanner(html5QrCode).then(() => {
                  if (isMounted) {
                    setScannerInstance(null);
                    setShowQRScanner(false);
                  }
                  if (decodedText) {
                    setTimeout(() => {
                      handleStudentLookup(decodedText.trim());
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

    return () => {
      isMounted = false;
      if (html5QrCode) {
        safeStopScanner(html5QrCode);
      }
    };
  }, [showQRScanner]);

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

  const fetchTeacherPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teacher-payments`);
      const data = await response.json();
      if (data.success) {
        setTeacherPayments(data.advancePayments);
      }
    } catch (err) {
      console.error('Error fetching teacher payments:', err);
    }
  };

  const getStudentCourses = (studentId) => {
    return courses.filter(course => 
      course.enrolledStudents && 
      Array.isArray(course.enrolledStudents) && 
      course.enrolledStudents.includes(studentId)
    );
  };

  const normalizeGrade = (grade) => {
    if (!grade) return '';
    return grade.toString().replace(/^Grade\s+/i, '').trim();
  };

  const calculateMonthlyPayments = (student) => {
    const studentCourses = getStudentCourses(student.id);
    if (studentCourses.length === 0) {
      return [];
    }

    const enrollmentDate = new Date(student.createdAt);
    const currentDate = new Date();
    const paymentRecords = [];

    let currentMonth = new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth(), 1);
    const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    while (currentMonth <= lastDayOfCurrentMonth) {
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      let totalFee = 0;
      const courseDetails = [];
      
      studentCourses.forEach(course => {
        const courseCreatedDate = new Date(course.createdAt);
        const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;
        const lastDayOfPaymentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        if (enrollmentDateForCourse <= lastDayOfPaymentMonth) {
          const courseFee = parseFloat(course.courseFee) || 0;
          totalFee += courseFee;
          
          // Check if this specific course is paid for this month
          const coursePayment = payments.find(
            p => p.studentId === student.id && 
                 p.monthKey === monthKey && 
                 p.courseId === course.id
          );
          
          courseDetails.push({
            courseId: course.id,
            courseName: course.courseName,
            fee: courseFee,
            subject: course.subject || '-',
            grade: course.grade,
            isPaid: coursePayment ? true : false,
            paymentDate: coursePayment ? coursePayment.paymentDate : null,
            paymentId: coursePayment ? coursePayment.id : null
          });
        }
      });

      if (totalFee > 0) {
        // Calculate paid amount and pending amount
        const paidAmount = courseDetails
          .filter(c => c.isPaid)
          .reduce((sum, c) => sum + c.fee, 0);
        const pendingAmount = totalFee - paidAmount;
        
        // Check if all courses are paid (for backward compatibility)
        const allPaid = courseDetails.length > 0 && courseDetails.every(c => c.isPaid);
        
        paymentRecords.push({
          month: monthName,
          monthKey: monthKey,
          totalFee: totalFee,
          paidAmount: paidAmount,
          pendingAmount: pendingAmount,
          courses: courseDetails,
          status: allPaid ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending'),
          paymentDate: courseDetails.find(c => c.isPaid)?.paymentDate || null
        });
      }

      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    return paymentRecords;
  };

  const handleStudentLookup = (studentId) => {
    if (!studentId || !studentId.trim()) {
      setError('Please enter a valid Student ID');
      return;
    }

    const student = students.find(s => s.id === studentId.trim());
    if (!student) {
      setError('Student ID not found. Please check and try again.');
      setSelectedStudent(null);
      return;
    }

    setSelectedStudent(student);
    setShowPaymentDetailsModal(true);
    setStudentIdInput('');
    setQrScanResult('');
    setError('');
  };

  const handleMarkAsPaid = async (student, monthKey, amount, courseId, courseName) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          monthKey: monthKey,
          amount: amount,
          courseId: courseId || null,
          paymentDate: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Payment for ${courseName || 'month'} marked as paid successfully!`);
        fetchPayments();
        // Refresh student data
        const updatedStudent = students.find(s => s.id === student.id);
        if (updatedStudent) {
          setSelectedStudent(updatedStudent);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to mark payment as paid');
      }
    } catch (err) {
      console.error('Error marking payment as paid:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getAllPaymentsWithStudentInfo = () => {
    return payments
      .map(payment => {
        const student = students.find(s => s.id === payment.studentId);
        const course = payment.courseId ? courses.find(c => c.id === payment.courseId) : null;
        return {
          ...payment,
          studentName: student ? student.fullName : 'Unknown',
          studentGrade: student ? student.grade : '-',
          courseName: course ? course.courseName : null
        };
      })
      .sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.fullName : 'Unknown';
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Unknown';
  };

  const formatMonthKey = (monthKey) => {
    if (!monthKey) return '-';
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getAllTeacherPaymentsWithInfo = () => {
    return teacherPayments
      .map(payment => {
        const teacher = teachers.find(t => t.id === payment.teacherId);
        return {
          ...payment,
          teacherName: teacher ? teacher.name : 'Unknown',
          teacherSubject: teacher ? teacher.subject : '-'
        };
      })
      .sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));
  };

  const getAllPaymentsCombined = () => {
    // Money In - Student Payments
    const moneyIn = getAllPaymentsWithStudentInfo().map(payment => ({
      ...payment,
      type: 'Money In',
      typeLabel: 'Student Payment',
      fromTo: payment.studentName,
      fromToId: payment.studentId,
      details: payment.courseName || 'All Courses',
      amount: parseFloat(payment.amount),
      date: payment.paymentDate || payment.createdAt
    }));

    // Money Out - Teacher Payments
    const moneyOut = getAllTeacherPaymentsWithInfo().map(payment => ({
      ...payment,
      type: 'Money Out',
      typeLabel: 'Teacher Payment',
      fromTo: payment.teacherName,
      fromToId: payment.teacherId,
      details: payment.teacherSubject,
      amount: parseFloat(payment.amount),
      date: payment.paymentDate || payment.createdAt
    }));

    // Combine and sort by date (most recent first)
    return [...moneyIn, ...moneyOut].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
  };

  // Pagination
  const allPayments = getAllPaymentsCombined();
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedPayments,
    goToPage,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination(allPayments, {
    itemsPerPageDesktop: 10,
    itemsPerPageMobile: 5
  });

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div>
          <h2 className="dashboard-title">Payments</h2>
          <p className="dashboard-subtitle">Manage payment records</p>
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

      {/* Student Lookup Section */}
      <Card className="mb-4" style={{
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        background: '#ffffff'
      }}>
        <Card.Body style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ 
              fontSize: '18px', 
              fontWeight: '700', 
              color: '#1e293b',
              marginBottom: '8px'
            }}>
              Lookup Student Payments
            </h5>
            <p style={{ 
              fontSize: '14px', 
              color: '#64748b',
              margin: 0
            }}>
              Enter a Student ID or scan a QR code to view payment details
            </p>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            flexWrap: 'wrap',
            alignItems: 'stretch'
          }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <div style={{ position: 'relative' }}>
                <HiOutlineIdentification style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                  zIndex: 1
                }} />
                <Form.Control
                  type="text"
                  placeholder="Enter Student ID"
                  value={studentIdInput}
                  onChange={(e) => {
                    setStudentIdInput(e.target.value);
                    setError('');
                  }}
                  className="form-control-custom"
                  style={{ 
                    paddingLeft: '40px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    height: '44px'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleStudentLookup(studentIdInput);
                    }
                  }}
                />
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => handleStudentLookup(studentIdInput)}
              style={{
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                padding: '10px 20px',
                height: '44px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#3b82f6',
                border: 'none',
                boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563eb';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(59, 130, 246, 0.2)';
              }}
            >
              <HiOutlineMagnifyingGlass style={{ fontSize: '18px' }} />
              Lookup
            </Button>
            <Button
              variant={showQRScanner ? "secondary" : "outline-primary"}
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
                whiteSpace: 'nowrap',
                borderRadius: '8px',
                padding: '10px 20px',
                height: '44px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: showQRScanner ? '#e2e8f0' : 'transparent',
                color: showQRScanner ? '#475569' : '#3b82f6',
                border: '1px solid #3b82f6',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!showQRScanner) {
                  e.currentTarget.style.background = '#eff6ff';
                }
              }}
              onMouseLeave={(e) => {
                if (!showQRScanner) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <HiOutlineQrCode style={{ fontSize: '18px' }} />
              {showQRScanner ? 'Cancel Scan' : 'Scan QR Code'}
            </Button>
          </div>
        </Card.Body>
        
        {showQRScanner && (
          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '8px'
              }}>
                <HiOutlineQrCode style={{ fontSize: '20px', color: '#3b82f6' }} />
                <h6 style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  Camera QR Scanner
                </h6>
              </div>
              <p style={{ 
                margin: 0, 
                fontSize: '13px', 
                color: '#64748b'
              }}>
                Point your camera at the student's QR code. The scanner will automatically detect and lookup the student.
              </p>
            </div>
            <div 
              id={`qr-reader-payments`}
              ref={qrScannerRef}
              style={{ 
                width: '100%', 
                maxWidth: '500px', 
                margin: '0 auto 16px',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            ></div>
            {qrScanResult && (
              <Alert variant="info" style={{
                marginBottom: '16px',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#1e40af',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineCheckCircle style={{ fontSize: '18px' }} />
                  <span>Scanned ID: <strong>{qrScanResult}</strong></span>
                </div>
              </Alert>
            )}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
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
                style={{
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: '#e2e8f0',
                  color: '#475569',
                  border: 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                }}
              >
                Stop Scanner
              </Button>
              {qrScanResult && (
                <Button
                  variant="success"
                  onClick={() => handleStudentLookup(qrScanResult)}
                  style={{
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#059669';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#10b981';
                  }}
                >
                  <HiOutlineMagnifyingGlass style={{ fontSize: '16px' }} />
                  Lookup Student
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Combined Payments Table - Money In & Out */}
      <div className="mb-4">
        <div className="operators-table-container">
          <div className="table-header-section">
            <h3>
              All Payment Records (Money In & Out)
              <span className="text-muted ms-2" style={{ fontSize: '14px', fontWeight: '400' }}>
                ({allPayments.length} {allPayments.length === 1 ? 'record' : 'records'})
              </span>
            </h3>
          </div>
          <div className="table-responsive">
            <Table striped bordered hover className="operators-table d-none d-lg-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>From/To</th>
                  <th>Details</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <HiOutlineBanknotes style={{ fontSize: '48px', color: '#94a3b8', opacity: 0.5 }} />
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                          No payment records found.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment, index) => (
                    <tr 
                      key={`${payment.type}-${payment.id}`}
                      style={{
                        backgroundColor: payment.type === 'Money Out' ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '16px 32px' }}>{index + 1}</td>
                      <td style={{ padding: '16px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <HiOutlineUser style={{ fontSize: '16px', color: '#64748b' }} />
                          <span style={{ 
                            fontSize: '14px', 
                            color: payment.type === 'Money In' ? '#10b981' : '#ef4444',
                            fontWeight: '500'
                          }}>
                            {payment.type === 'Money In' ? 'From: ' : 'To: '}{payment.fromTo}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 32px', textAlign: 'left' }}>
                        {payment.type === 'Money In' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HiOutlineBookOpen style={{ fontSize: '16px', color: '#64748b' }} />
                            <span style={{ fontSize: '14px', color: '#475569' }}>
                              {payment.courseName || <span className="text-muted">All Courses</span>}
                            </span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '14px', color: '#475569', textAlign: 'left' }}>
                            {payment.teacherSubject || '-'}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px 32px', textAlign: 'left' }}>
                        {payment.type === 'Money Out' ? (
                          payment.description ? (
                            <div style={{ fontSize: '14px', color: '#475569', textAlign: 'left' }}>
                              {payment.description}
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '14px' }}>-</span>
                          )
                        ) : (
                          payment.monthKey ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                              <HiOutlineCalendar style={{ fontSize: '16px', color: '#64748b' }} />
                              <span style={{ fontSize: '14px', color: '#475569' }}>
                                {formatMonthKey(payment.monthKey)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '14px' }}>-</span>
                          )
                        )}
                      </td>
                      <td style={{ padding: '16px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <HiOutlineCurrencyDollar style={{ 
                            fontSize: '16px', 
                            color: payment.type === 'Money In' ? '#10b981' : '#ef4444'
                          }} />
                          <span style={{ 
                            fontSize: '14px',
                            fontWeight: '600',
                            color: payment.type === 'Money In' ? '#10b981' : '#ef4444'
                          }}>
                            {payment.type === 'Money In' ? '+' : '-'}Rs. {payment.amount.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <HiOutlineClock style={{ fontSize: '16px', color: '#64748b' }} />
                          <span style={{ fontSize: '14px', color: '#475569' }}>
                            {payment.date 
                              ? new Date(payment.date).toLocaleDateString() 
                              : '-'}
                          </span>
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
              {paginatedPayments.length === 0 ? (
              <div className="text-center text-muted py-5">
                <p>No payment records found.</p>
              </div>
            ) : (
              <div className="student-cards-container">
                {paginatedPayments.map((payment, index) => (
                  <Card 
                    key={`${payment.type}-${payment.id}`} 
                    className={`student-card mb-3 ${payment.type === 'Money Out' ? 'border-danger' : ''}`}
                  >
                    <Card.Body>
                      <div className="student-card-header mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <h5 className="student-card-name mb-0">
                            {payment.type === 'Money In' ? 'From: ' : 'To: '}
                            {payment.fromTo}
                          </h5>
                          <span className={`badge ${
                            payment.type === 'Money In' ? 'bg-success' : 'bg-danger'
                          }`}>
                            {payment.type}
                          </span>
                        </div>
                        <p className="student-card-contact mb-1">
                          <code>{payment.fromToId}</code>
                        </p>
                        {payment.type === 'Money In' && payment.courseName && (
                          <p className="text-muted small mb-1">{payment.courseName}</p>
                        )}
                        {payment.type === 'Money Out' && payment.teacherSubject && (
                          <p className="text-muted small mb-1">{payment.teacherSubject}</p>
                        )}
                        {payment.type === 'Money In' && payment.monthKey && (
                          <p className="text-muted small mb-1">
                            {formatMonthKey(payment.monthKey)}
                          </p>
                        )}
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className={payment.type === 'Money In' ? 'text-success' : 'text-danger'}>
                            <strong>
                              {payment.type === 'Money In' ? '+' : '-'}Rs. {payment.amount.toFixed(2)}
                            </strong>
                          </span>
                        </div>
                        <div>
                          {payment.type === 'Money In' ? (
                            <span className={`badge ${payment.status === 'Paid' ? 'bg-success' : 'bg-warning'}`}>
                              {payment.status}
                            </span>
                          ) : (
                            <span className="badge bg-info">Paid</span>
                          )}
                        </div>
                      </div>
                      {payment.date && (
                        <div className="text-muted small mt-2">
                          Date: {new Date(payment.date).toLocaleDateString()}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {allPayments.length > 0 && (
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

      {/* Payment Summary Section */}
      <div className="mb-4">
        <div style={{ marginBottom: '24px' }}>
          <h3 className="dashboard-title" style={{ marginBottom: '8px' }}>Payment Summary</h3>
          <p className="dashboard-subtitle">Overview of all financial transactions</p>
        </div>
        <Row className="g-3">
          <Col md={4}>
            <Card className="dashboard-stat-card" style={{
              borderTop: '4px solid #10b981'
            }}>
              <Card.Body>
                <div className="stat-icon" style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981'
                }}>
                  <HiOutlineArrowTrendingUp style={{ fontSize: '24px' }} />
                </div>
                <div className="stat-number" style={{ color: '#10b981' }}>
                  Rs. {getAllPaymentsCombined()
                    .filter(p => p.type === 'Money In')
                    .reduce((sum, p) => sum + p.amount, 0)
                    .toFixed(2)}
                </div>
                <p className="stat-label">Total Money In</p>
                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <HiOutlineCheckCircle style={{ fontSize: '14px' }} />
                  <span>
                    {getAllPaymentsCombined().filter(p => p.type === 'Money In').length} payment{getAllPaymentsCombined().filter(p => p.type === 'Money In').length !== 1 ? 's' : ''}
                  </span>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="dashboard-stat-card" style={{
              borderTop: '4px solid #ef4444'
            }}>
              <Card.Body>
                <div className="stat-icon" style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444'
                }}>
                  <HiOutlineArrowTrendingDown style={{ fontSize: '24px' }} />
                </div>
                <div className="stat-number" style={{ color: '#ef4444' }}>
                  Rs. {getAllPaymentsCombined()
                    .filter(p => p.type === 'Money Out')
                    .reduce((sum, p) => sum + p.amount, 0)
                    .toFixed(2)}
                </div>
                <p className="stat-label">Total Money Out</p>
                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <HiOutlineXCircle style={{ fontSize: '14px' }} />
                  <span>
                    {getAllPaymentsCombined().filter(p => p.type === 'Money Out').length} payment{getAllPaymentsCombined().filter(p => p.type === 'Money Out').length !== 1 ? 's' : ''}
                  </span>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="dashboard-stat-card" style={{
              borderTop: `4px solid ${(getAllPaymentsCombined()
                .filter(p => p.type === 'Money In')
                .reduce((sum, p) => sum + p.amount, 0) -
              getAllPaymentsCombined()
                .filter(p => p.type === 'Money Out')
                .reduce((sum, p) => sum + p.amount, 0)) >= 0 ? '#10b981' : '#ef4444'}`
            }}>
              <Card.Body>
                <div className="stat-icon" style={{
                  background: (getAllPaymentsCombined()
                    .filter(p => p.type === 'Money In')
                    .reduce((sum, p) => sum + p.amount, 0) -
                  getAllPaymentsCombined()
                    .filter(p => p.type === 'Money Out')
                    .reduce((sum, p) => sum + p.amount, 0)) >= 0 
                    ? 'rgba(16, 185, 129, 0.1)' 
                    : 'rgba(239, 68, 68, 0.1)',
                  color: (getAllPaymentsCombined()
                    .filter(p => p.type === 'Money In')
                    .reduce((sum, p) => sum + p.amount, 0) -
                  getAllPaymentsCombined()
                    .filter(p => p.type === 'Money Out')
                    .reduce((sum, p) => sum + p.amount, 0)) >= 0 
                    ? '#10b981' 
                    : '#ef4444'
                }}>
                  <HiOutlineCurrencyDollar style={{ fontSize: '24px' }} />
                </div>
                <div className="stat-number" style={{
                  color: (getAllPaymentsCombined()
                    .filter(p => p.type === 'Money In')
                    .reduce((sum, p) => sum + p.amount, 0) -
                  getAllPaymentsCombined()
                    .filter(p => p.type === 'Money Out')
                    .reduce((sum, p) => sum + p.amount, 0)) >= 0 
                    ? '#10b981' 
                    : '#ef4444'
                }}>
                  Rs. {(getAllPaymentsCombined()
                    .filter(p => p.type === 'Money In')
                    .reduce((sum, p) => sum + p.amount, 0) -
                  getAllPaymentsCombined()
                    .filter(p => p.type === 'Money Out')
                    .reduce((sum, p) => sum + p.amount, 0))
                    .toFixed(2)}
                </div>
                <p className="stat-label">Net Total</p>
                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <HiOutlineBanknotes style={{ fontSize: '14px' }} />
                  <span>
                    {getAllPaymentsCombined().length} total transaction{getAllPaymentsCombined().length !== 1 ? 's' : ''}
                  </span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Student Payment Details Modal */}
      <Modal show={showPaymentDetailsModal} onHide={() => setShowPaymentDetailsModal(false)} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Payment Details - {selectedStudent?.fullName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <div>
              <div className="mb-3">
                <p className="text-muted">
                  <strong>Student:</strong> {selectedStudent.fullName} | 
                  <strong> Grade:</strong> {selectedStudent.grade} |
                  <strong> Enrollment Date:</strong> {new Date(selectedStudent.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              {calculateMonthlyPayments(selectedStudent).length > 0 ? (
                <div className="table-responsive">
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Courses</th>
                        <th>Total Fee</th>
                        <th>Paid</th>
                        <th>Pending</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateMonthlyPayments(selectedStudent).map((payment, index) => (
                        <tr key={payment.monthKey}>
                          <td><strong>{payment.month}</strong></td>
                          <td>
                            <div className="small">
                              {payment.courses.map((course, idx) => (
                                <div key={idx} className={`mb-2 p-2 rounded ${course.isPaid ? 'bg-light' : 'bg-warning bg-opacity-10'}`}>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span>
                                      <strong>{course.courseName}</strong> ({course.subject}) - Rs. {course.fee.toFixed(2)}
                                      {course.isPaid && (
                                        <span className="badge bg-success ms-2">Paid</span>
                                      )}
                                    </span>
                                    {!course.isPaid && (
                                      <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => handleMarkAsPaid(selectedStudent, payment.monthKey, course.fee, course.courseId, course.courseName)}
                                        disabled={loading}
                                      >
                                        Pay
                                      </Button>
                                    )}
                                  </div>
                                  {course.isPaid && course.paymentDate && (
                                    <div className="text-muted small mt-1">
                                      Paid on {new Date(course.paymentDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td><strong>Rs. {payment.totalFee.toFixed(2)}</strong></td>
                          <td>
                            <span className="text-success">
                              <strong>Rs. {payment.paidAmount.toFixed(2)}</strong>
                            </span>
                          </td>
                          <td>
                            <span className="text-danger">
                              <strong>Rs. {payment.pendingAmount.toFixed(2)}</strong>
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              payment.status === 'Paid' ? 'bg-success' : 
                              payment.status === 'Partial' ? 'bg-info' : 
                              'bg-warning'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="mt-3 p-3 bg-light rounded">
                    <div className="d-flex justify-content-between">
                      <div>
                        <strong>Total Amount: </strong>
                        Rs. {calculateMonthlyPayments(selectedStudent).reduce((sum, payment) => 
                          sum + payment.totalFee, 0
                        ).toFixed(2)}
                      </div>
                      <div>
                        <strong>Total Paid: </strong>
                        <span className="text-success">
                          Rs. {calculateMonthlyPayments(selectedStudent)
                            .reduce((sum, payment) => sum + payment.paidAmount, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <strong>To Be Paid: </strong>
                        <span className="text-danger">
                          Rs. {calculateMonthlyPayments(selectedStudent)
                            .reduce((sum, payment) => sum + payment.pendingAmount, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
        </div>
      </div>
              ) : (
                <p className="text-muted text-center py-4">No payment records found. Student is not enrolled in any courses.</p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Payments;
