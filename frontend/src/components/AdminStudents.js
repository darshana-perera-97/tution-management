import React, { useState, useEffect, useRef } from 'react';
import { Container, Table, Alert, Modal, Button, Form, Card, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  HiOutlineEye, 
  HiOutlineQrCode, 
  HiOutlineBookOpen, 
  HiOutlineCurrencyDollar, 
  HiOutlineIdentification,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineHome,
  HiOutlineAcademicCap,
  HiOutlineCalendar,
  HiOutlinePhoto,
  HiOutlineMapPin,
  HiOutlineClock
} from 'react-icons/hi2';
import '../App.css';
import API_URL from '../config';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showIDCardModal, setShowIDCardModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const qrCodeRef = useRef(null);
  const idCardRef = useRef(null);

  // Search states
  const [searchName, setSearchName] = useState('');
  const [searchContact, setSearchContact] = useState('');
  const [searchQRCode, setSearchQRCode] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);
  const qrScannerRef = useRef(null);

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    fetchPayments();
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
              setSearchQRCode(decodedText.trim());
              if (html5QrCode) {
                html5QrCode.stop().then(() => {
                  if (html5QrCode) {
                    html5QrCode.clear();
                  }
                  if (isMounted) {
                    setScannerInstance(null);
                    setShowQRScanner(false);
                  }
                }).catch((err) => {
                  // Silently ignore errors about scanner not running or cannot stop
                  const errorMsg = err?.message || err?.toString() || '';
                  if (errorMsg &&
                    !errorMsg.includes('not running') &&
                    !errorMsg.includes('not paused') &&
                    !errorMsg.includes('Scanner is not running') &&
                    !errorMsg.includes('Cannot stop')) {
                    console.error('Error stopping scanner:', err);
                  }
                  if (isMounted) {
                    setScannerInstance(null);
                    setShowQRScanner(false);
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
        html5QrCode.stop().then(() => {
          if (html5QrCode) {
            html5QrCode.clear();
          }
        }).catch((err) => {
          // Silently ignore errors about scanner not running or cannot stop
          const errorMsg = err?.message || err?.toString() || '';
          if (errorMsg &&
            !errorMsg.includes('not running') &&
            !errorMsg.includes('not paused') &&
            !errorMsg.includes('Scanner is not running') &&
            !errorMsg.includes('Cannot stop')) {
            console.error('Error in cleanup:', err);
          }
          // Try to clear anyway
          if (html5QrCode) {
            try {
              html5QrCode.clear();
            } catch (clearErr) {
              // Ignore clear errors
            }
          }
        });
      }
    };
  }, [showQRScanner]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/students`);
      const data = await response.json();
      if (data.success) {
        setStudents(data.students);
      } else {
        setError(data.message || 'Failed to fetch students');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
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

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
  };

  const handleViewQRCode = (student) => {
    setSelectedStudentId(student.id);
    setShowQRModal(true);
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setSelectedStudentId(null);
  };

  const handleViewCourses = (student) => {
    setSelectedStudent(student);
    setShowCoursesModal(true);
  };

  const handleCloseCoursesModal = () => {
    setShowCoursesModal(false);
    setSelectedStudent(null);
  };

  const handleViewPayments = (student) => {
    setSelectedStudent(student);
    setShowPaymentsModal(true);
  };

  const handleClosePaymentsModal = () => {
    setShowPaymentsModal(false);
    setSelectedStudent(null);
  };

  const handleGenerateIDCard = (student) => {
    setSelectedStudent(student);
    setShowIDCardModal(true);
  };

  const handleCloseIDCardModal = () => {
    setShowIDCardModal(false);
    setSelectedStudent(null);
  };

  const handleDownloadIDCard = async () => {
    if (!idCardRef.current || !selectedStudent) return;

    try {
      // Dynamically import html2canvas and jspdf
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      const canvas = await html2canvas(idCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false
      });

      // Get canvas dimensions
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate PDF dimensions (A4 ratio or maintain aspect ratio)
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });
      
      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/png');
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Download PDF
      pdf.save(`student-id-card-${selectedStudent.id}.pdf`);
    } catch (error) {
      console.error('Error downloading ID card:', error);
      alert('Failed to download ID card. Please try again.');
    }
  };

  const getStudentCourses = (studentId) => {
    return courses.filter(course =>
      course.enrolledStudents &&
      Array.isArray(course.enrolledStudents) &&
      course.enrolledStudents.includes(studentId)
    );
  };

  const calculateMonthlyPayments = (student) => {
    const studentCourses = getStudentCourses(student.id);
    if (studentCourses.length === 0) {
      return [];
    }

    const enrollmentDate = new Date(student.createdAt);
    const currentDate = new Date();
    const payments = [];

    // Start from the 1st of the enrollment month (month 1st is considered a new month)
    let currentMonth = new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth(), 1);

    // Calculate the last day of current month
    const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    while (currentMonth <= lastDayOfCurrentMonth) {
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

      // Calculate total fee for this month
      let totalFee = 0;
      const courseDetails = [];

      studentCourses.forEach(course => {
        // Check if student was enrolled in this course before or during this month
        // Course enrollment date (when course was created or student was added)
        const courseCreatedDate = new Date(course.createdAt);
        const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;

        // Last day of current payment month
        const lastDayOfPaymentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        // Student should pay if they were enrolled before or during this month
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
            paymentDate: coursePayment ? coursePayment.paymentDate : null
          });
        }
      });

      if (totalFee > 0) {
        // Calculate paid amount and pending amount
        const paidAmount = courseDetails
          .filter(c => c.isPaid)
          .reduce((sum, c) => sum + c.fee, 0);
        const pendingAmount = totalFee - paidAmount;

        // Check if all courses are paid
        const allPaid = courseDetails.length > 0 && courseDetails.every(c => c.isPaid);

        payments.push({
          month: monthName,
          monthKey: monthKey,
          totalFee: totalFee,
          paidAmount: paidAmount,
          pendingAmount: pendingAmount,
          courses: courseDetails,
          status: allPaid ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending')
        });
      }

      // Move to next month (1st of next month)
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    return payments;
  };

  const downloadQRCode = () => {
    if (qrCodeRef.current && selectedStudentId) {
      const svg = qrCodeRef.current.querySelector('svg');
      if (svg) {
        try {
          const svgData = new XMLSerializer().serializeToString(svg);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const svgUrl = URL.createObjectURL(svgBlob);

          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // Fill white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw the QR code
            ctx.drawImage(img, 0, 0);

            // Convert to blob and download
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `student-qr-${selectedStudentId}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                URL.revokeObjectURL(svgUrl);
              }
            }, 'image/png');
          };

          img.onerror = () => {
            // Fallback: download as SVG
            const link = document.createElement('a');
            link.href = svgUrl;
            link.download = `student-qr-${selectedStudentId}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(svgUrl);
          };

          img.src = svgUrl;
        } catch (error) {
          console.error('Error downloading QR code:', error);
          alert('Failed to download QR code. Please try again.');
        }
      }
    }
  };

  // Filter students based on search criteria
  const filteredStudents = students.filter(student => {
    const nameMatch = !searchName ||
      student.fullName.toLowerCase().includes(searchName.toLowerCase());
    const contactMatch = !searchContact ||
      student.contactNumber.includes(searchContact) ||
      (student.whatsappNumber && student.whatsappNumber.includes(searchContact));
    const qrMatch = !searchQRCode ||
      student.id.toString().includes(searchQRCode);

    return nameMatch && contactMatch && qrMatch;
  });

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedStudents,
    goToPage,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination(filteredStudents, {
    itemsPerPageDesktop: 10,
    itemsPerPageMobile: 5
  });

  const handleClearSearch = () => {
    setSearchName('');
    setSearchContact('');
    setSearchQRCode('');
  };

  const handleCloseQRScanner = () => {
    if (scannerInstance) {
      scannerInstance.stop().then(() => {
        if (scannerInstance) {
          scannerInstance.clear();
        }
        setScannerInstance(null);
        setShowQRScanner(false);
      }).catch((err) => {
        // Silently ignore errors about scanner not running
        const errorMsg = err?.message || err?.toString() || '';
        if (errorMsg &&
          !errorMsg.includes('not running') &&
          !errorMsg.includes('not paused') &&
          !errorMsg.includes('Scanner is not running') &&
          !errorMsg.includes('Cannot stop')) {
          console.error('Error stopping scanner:', err);
        }
        // Try to clear anyway
        if (scannerInstance) {
          try {
            scannerInstance.clear();
          } catch (clearErr) {
            // Ignore clear errors
          }
        }
        setScannerInstance(null);
        setShowQRScanner(false);
      });
    } else {
      setShowQRScanner(false);
    }
  };

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div>
          <h2 className="dashboard-title">Students</h2>
          <p className="dashboard-subtitle">View all students in the system</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {/* Search Section */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">Search Students</h5>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search by Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter student name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search by Contact Number</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter contact number"
                  value={searchContact}
                  onChange={(e) => setSearchContact(e.target.value)}
                  className="form-control-custom"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search by QR Code / Student ID</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    placeholder="Enter or scan QR code"
                    value={searchQRCode}
                    onChange={(e) => setSearchQRCode(e.target.value)}
                    className="form-control-custom"
                  />
                  <Button
                    variant="outline-primary"
                    onClick={() => setShowQRScanner(true)}
                    title="Scan QR Code"
                  >
                    📷
                  </Button>
                </div>
              </Form.Group>
            </Col>
          </Row>
          {(searchName || searchContact || searchQRCode) && (
            <div className="mt-3">
              <Button variant="outline-secondary" size="sm" onClick={handleClearSearch}>
                Clear Search
              </Button>
              <span className="ms-2 text-muted">
                Showing {filteredStudents.length} of {students.length} students
              </span>
            </div>
          )}
        </Card.Body>
      </Card>

      <div className="operators-table-container">
        <div className="table-header-section">
          <h3>Students ({paginatedStudents.length} {paginatedStudents.length === 1 ? 'student' : 'students'})</h3>
        </div>
        {loading ? (
          <div className="text-center py-5">
            <p style={{ color: '#64748b' }}>Loading students...</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              {/* Desktop Table View */}
              <Table className="operators-table d-none d-lg-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Full Name</th>
                    <th style={{ width: '180px' }}>Grade</th>
                    <th>Contact Number</th>
                    <th style={{ width: '280px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-5" style={{ color: '#64748b' }}>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          gap: '12px' 
                        }}>
                          <HiOutlineUser size={48} style={{ opacity: 0.3 }} />
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                            {students.length === 0 ? 'No students found.' : 'No students match your search criteria.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student, index) => (
                      <tr key={student.id} style={{ transition: 'all 0.2s ease' }}>
                        <td style={{ 
                          padding: '16px 24px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#64748b'
                        }}>
                          {startIndex + index + 1}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px' 
                          }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#3b82f6',
                              flexShrink: 0
                            }}>
                              <HiOutlineUser size={20} />
                            </div>
                            <div>
                              <div style={{ 
                                fontSize: '15px', 
                                fontWeight: '700', 
                                color: '#0f172a',
                                marginBottom: '2px'
                              }}>
                                {student.fullName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#475569'
                          }}>
                            <HiOutlineAcademicCap size={16} style={{ color: '#94a3b8' }} />
                            <span>{student.grade}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            fontSize: '14px',
                            color: '#475569'
                          }}>
                            <HiOutlinePhone size={16} style={{ color: '#94a3b8' }} />
                            <span>{student.contactNumber}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div className="d-flex gap-2 flex-wrap">
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>View Details</Tooltip>}
                            >
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleViewDetails(student)}
                                className="action-btn-icon"
                              >
                                <HiOutlineEye />
                              </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>View QR Code</Tooltip>}
                            >
                              <Button
                                variant="info"
                                size="sm"
                                onClick={() => handleViewQRCode(student)}
                                className="action-btn-icon"
                              >
                                <HiOutlineQrCode />
                              </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>View Courses</Tooltip>}
                            >
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleViewCourses(student)}
                                className="action-btn-icon"
                              >
                                <HiOutlineBookOpen />
                              </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>View Payments</Tooltip>}
                            >
                              <Button
                                variant="warning"
                                size="sm"
                                onClick={() => handleViewPayments(student)}
                                className="action-btn-icon"
                              >
                                <HiOutlineCurrencyDollar />
                              </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>Generate ID Card</Tooltip>}
                            >
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleGenerateIDCard(student)}
                                className="action-btn-icon"
                              >
                                <HiOutlineIdentification />
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
              {paginatedStudents.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <p>{students.length === 0 ? 'No students found.' : 'No students match your search criteria.'}</p>
                </div>
              ) : (
                <div className="student-cards-container">
                  {paginatedStudents.map((student, index) => (
                    <Card key={student.id} className="student-card mb-3">
                      <Card.Body>
                        <div className="student-card-header mb-0">
                          <h5 className="student-card-name mb-0">{student.fullName}</h5>
                        </div>
                        <div className="student-card-actions">
                          <div className="student-actions-grid">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleViewDetails(student)}
                              className="action-btn"
                            >
                              View Details
                            </Button>
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => handleViewQRCode(student)}
                              className="action-btn"
                            >
                              View QR Code
                            </Button>
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleViewCourses(student)}
                              className="action-btn"
                            >
                              View Courses
                            </Button>
                            <Button
                              variant="warning"
                              size="sm"
                              onClick={() => handleViewPayments(student)}
                              className="action-btn"
                            >
                              View Payments
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleGenerateIDCard(student)}
                              className="action-btn"
                            >
                              Generate ID Card
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Pagination */}
        {filteredStudents.length > 0 && (
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

      {/* Student Details Modal - Benchmark Style */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Student Details</h2>
            <p>View complete student information</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedStudent && (
            <div className="student-form-body">
              {/* Student Photo Section */}
              <div style={{ textAlign: 'center', padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                {selectedStudent.imageUrl ? (
                  <img 
                    src={`${API_URL}${selectedStudent.imageUrl}`} 
                    alt={selectedStudent.fullName}
                    style={{ 
                      maxWidth: '180px', 
                      maxHeight: '180px', 
                      objectFit: 'cover', 
                      borderRadius: '16px', 
                      border: '2px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}
                  />
                ) : (
                  <div style={{ 
                    width: '180px', 
                    height: '180px', 
                    backgroundColor: '#f8fafc', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto',
                    border: '2px solid #e2e8f0'
                  }}>
                    <HiOutlinePhoto style={{ fontSize: '48px', color: '#94a3b8' }} />
              </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="student-form-grid" style={{ padding: '24px' }}>
                {/* Left Column */}
                <div className="student-form-column">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineUser className="student-form-label-icon" />
                      Full Name
                    </label>
                    <div className="student-details-value">{selectedStudent.fullName}</div>
                  </div>

                  <div className="student-form-grid-2">
                    <div className="student-form-field">
                      <label className="student-form-label">
                        <HiOutlineCalendar className="student-form-label-icon" />
                        Date of Birth
                      </label>
                      <div className="student-details-value">
                  {selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : '-'}
              </div>
              </div>
                    <div className="student-form-field">
                      <label className="student-form-label">
                        Age (for 2026)
                      </label>
                      <div className="student-details-value">{selectedStudent.age} years</div>
              </div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineUser className="student-form-label-icon" />
                      Parent Name
                    </label>
                    <div className="student-details-value">{selectedStudent.parentName}</div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlinePhone className="student-form-label-icon" />
                      Contact Number
                    </label>
                    <div className="student-details-value">{selectedStudent.contactNumber}</div>
              </div>
                </div>

                {/* Right Column */}
                <div className="student-form-column">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlinePhone className="student-form-label-icon" />
                      WhatsApp Number
                    </label>
                    <div className="student-details-value">
                      {selectedStudent.whatsappNumber || selectedStudent.contactNumber || 'Not provided'}
                    </div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineMapPin className="student-form-label-icon" />
                      Address
                    </label>
                    <div className="student-details-value">{selectedStudent.address}</div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineAcademicCap className="student-form-label-icon" />
                      Grade
                    </label>
                    <div className="student-details-value">{selectedStudent.grade}</div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineClock className="student-form-label-icon" />
                      Created At
                    </label>
                    <div className="student-details-value">
                  {selectedStudent.createdAt ? new Date(selectedStudent.createdAt).toLocaleString() : '-'}
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
            onClick={handleCloseModal}
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

      {/* QR Code Modal */}
      <Modal show={showQRModal} onHide={handleCloseQRModal} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Student QR Code</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedStudentId && (
            <div>
              <p className="mb-3"><strong>{selectedStudentId}</strong></p>
              <div ref={qrCodeRef} className="d-flex justify-content-center mb-3" style={{ padding: '20px', backgroundColor: 'white' }}>
                <QRCodeSVG
                  value={selectedStudentId}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-muted small">Scan this QR code to get the Student ID</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseQRModal}>
            Close
          </Button>
          <Button variant="primary" onClick={downloadQRCode}>
            Download QR Code
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Courses Modal - Benchmark Style */}
      <Modal show={showCoursesModal} onHide={handleCloseCoursesModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Student Courses</h2>
            <p>{selectedStudent?.fullName} • Grade {selectedStudent?.grade}</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedStudent && (
            <div className="student-form-body">
              {getStudentCourses(selectedStudent.id).length > 0 ? (
                <>
                  <div className="operators-table-container">
                    <div className="table-header-section">
                      <h3>Enrolled Courses ({getStudentCourses(selectedStudent.id).length})</h3>
                    </div>
                <div className="table-responsive">
                      <Table className="operators-table">
                    <thead>
                      <tr>
                            <th>#</th>
                        <th>Course Name</th>
                        <th>Subject</th>
                            <th>Grade</th>
                        <th>Course Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getStudentCourses(selectedStudent.id).map((course, index) => (
                        <tr key={course.id}>
                              <td>{index + 1}</td>
                          <td>{course.courseName}</td>
                          <td>{course.subject || '-'}</td>
                              <td>{course.grade}</td>
                              <td>
                                {course.courseFee ? (
                                  <span style={{ 
                                    fontWeight: '600', 
                                    color: '#3b82f6' 
                                  }}>
                                    Rs. {parseFloat(course.courseFee).toFixed(2)}
                                  </span>
                                ) : '-'}
                              </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                    </div>
                  </div>
                  <div style={{
                    margin: '24px',
                    padding: '20px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#64748b',
                          marginBottom: '8px'
                        }}>
                          Total Monthly Fee
                        </div>
                        <div style={{ 
                          fontSize: '28px', 
                          fontWeight: '700',
                          color: '#0f172a'
                        }}>
                    Rs. {getStudentCourses(selectedStudent.id).reduce((sum, course) =>
                      sum + (parseFloat(course.courseFee) || 0), 0
                    ).toFixed(2)}
                  </div>
                </div>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3b82f6'
                      }}>
                        <HiOutlineCurrencyDollar style={{ 
                          fontSize: '28px'
                        }} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  color: '#94a3b8'
                }}>
                  <HiOutlineBookOpen style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No courses enrolled.</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                    This student is not enrolled in any courses yet.
                  </p>
                </div>
              )}
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
            onClick={handleCloseCoursesModal}
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

      {/* View Payments Modal - Benchmark Style */}
      <Modal show={showPaymentsModal} onHide={handleClosePaymentsModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Student Payments</h2>
            <p>{selectedStudent?.fullName} • Grade {selectedStudent?.grade} • Enrolled {selectedStudent?.createdAt ? new Date(selectedStudent.createdAt).toLocaleDateString() : 'N/A'}</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedStudent && (
            <div className="student-form-body">
              {calculateMonthlyPayments(selectedStudent).length > 0 ? (
                <>
                  <div className="operators-table-container">
                    <div className="table-header-section">
                      <h3>Payment Records ({calculateMonthlyPayments(selectedStudent).length} months)</h3>
                    </div>
                <div className="table-responsive">
                      <Table className="operators-table">
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {payment.courses.map((course, idx) => (
                                    <div key={idx} style={{
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      background: course.isPaid ? '#f8fafc' : 'rgba(245, 158, 11, 0.1)',
                                      border: `1px solid ${course.isPaid ? '#e2e8f0' : 'rgba(245, 158, 11, 0.2)'}`,
                                      fontSize: '13px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <strong>{course.courseName}</strong>
                                        <span style={{ color: '#64748b' }}>({course.subject})</span>
                                        <span style={{ fontWeight: '600', color: '#3b82f6' }}>Rs. {course.fee.toFixed(2)}</span>
                                  {course.isPaid && (
                                          <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            color: '#059669'
                                          }}>
                                            Paid
                                          </span>
                                  )}
                                      </div>
                                  {course.isPaid && course.paymentDate && (
                                        <div style={{ 
                                          fontSize: '11px', 
                                          color: '#94a3b8',
                                          marginTop: '4px'
                                        }}>
                                      Paid on {new Date(course.paymentDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                              <td>
                                <strong style={{ color: '#0f172a' }}>Rs. {payment.totalFee.toFixed(2)}</strong>
                              </td>
                              <td>
                                <span style={{ fontWeight: '600', color: '#059669' }}>
                                  Rs. {payment.paidAmount.toFixed(2)}
                            </span>
                          </td>
                              <td>
                                <span style={{ fontWeight: '600', color: '#dc2626' }}>
                                  Rs. {payment.pendingAmount.toFixed(2)}
                            </span>
                          </td>
                          <td>
                                <span style={{
                                  padding: '4px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  background: payment.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 
                                             payment.status === 'Partial' ? 'rgba(59, 130, 246, 0.1)' : 
                                             'rgba(245, 158, 11, 0.1)',
                                  color: payment.status === 'Paid' ? '#059669' : 
                                         payment.status === 'Partial' ? '#2563eb' : 
                                         '#d97706'
                                }}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                    </div>
                  </div>
                  <div style={{
                    margin: '24px',
                    padding: '20px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '20px' 
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#64748b',
                          marginBottom: '8px'
                        }}>
                          Total Amount
                        </div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: '700',
                          color: '#0f172a'
                        }}>
                        Rs. {calculateMonthlyPayments(selectedStudent).reduce((sum, payment) =>
                          sum + payment.totalFee, 0
                        ).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#64748b',
                          marginBottom: '8px'
                        }}>
                          Total Paid
                        </div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: '700',
                          color: '#059669'
                        }}>
                          Rs. {calculateMonthlyPayments(selectedStudent)
                            .reduce((sum, payment) => sum + payment.paidAmount, 0)
                            .toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#64748b',
                          marginBottom: '8px'
                        }}>
                          To Be Paid
                        </div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: '700',
                          color: '#dc2626'
                        }}>
                          Rs. {calculateMonthlyPayments(selectedStudent)
                            .reduce((sum, payment) => sum + payment.pendingAmount, 0)
                            .toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                </>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  color: '#94a3b8'
                }}>
                  <HiOutlineCurrencyDollar style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No payment records found.</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                    Student is not enrolled in any courses yet.
                  </p>
                </div>
              )}
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
            onClick={handleClosePaymentsModal}
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

      {/* QR Scanner Modal */}
      <Modal show={showQRScanner} onHide={handleCloseQRScanner} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Scan QR Code</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <div id="qr-reader-search" ref={qrScannerRef} style={{ width: '100%' }}></div>
            <p className="text-muted mt-3">Position the QR code within the frame to scan</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseQRScanner}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ID Card Modal */}
      <Modal show={showIDCardModal} onHide={handleCloseIDCardModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Generate Student ID Card</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <div>
              <div
                ref={idCardRef}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  aspectRatio: '2/3',
                  margin: '0 auto',
                  background: 'white',
                  borderRadius: '16px',
                  padding: '0',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {/* Template Background Image */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `url(/id-card-template.jpg)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  zIndex: 0
                }}></div>

                {/* Content Overlay */}
                <div style={{ position: 'relative', zIndex: 1, padding: '20px', paddingTop: '0' }}>
                  {/* Student Image at the top */}
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    marginTop: '39px'
                  }}>
                    <div style={{
                      width: '225px',
                      height: '225px',
                      borderRadius: '1200px',
                      overflow: 'hidden',
                      margin: '0 auto',
                      background: '#f8f9fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {selectedStudent.imageUrl ? (
                        <img
                          src={`${API_URL}${selectedStudent.imageUrl}`}
                          alt={selectedStudent.fullName}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div style={{
                        display: selectedStudent.imageUrl ? 'none' : 'flex',
                        width: '100%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white',
                        fontSize: '48px',
                        fontWeight: 'bold'
                      }}>
                        {selectedStudent.fullName ? selectedStudent.fullName.charAt(0).toUpperCase() : 'S'}
                      </div>
                    </div>
                  </div>

                  {/* Student Name */}
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '15px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      marginTop: '10px',
                      fontSize: '29px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                      lineHeight: '1.2'
                    }}>
                      {selectedStudent.fullName}
                    </h3>
                    {/* Student ID */}
                    <div style={{}}>

                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '26px',
                        borderRadius: '100px',
                        color: '#fff',
                        fontWeight: '700',
                        background: '#66be36',
                        display: 'inline-block',
                        padding: '6px 22px'
                      }}>
                        {selectedStudent.id}
                      </p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div style={{
                    textAlign: 'center',
                    marginTop: '-10px'
                  }}>
                    <div style={{
                      display: 'inline-block',
                      background: 'transparent'
                    }}>
                      <QRCodeSVG
                        value={selectedStudent.id}
                        size={220}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-muted text-center mt-3 small">
                Preview of the student ID card. Click download to save as PDF.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseIDCardModal}>
            Close
          </Button>
          <Button variant="primary" onClick={handleDownloadIDCard}>
            Download ID Card
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminStudents;

