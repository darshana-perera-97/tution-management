import React, { useState, useEffect, useRef } from 'react';
import { Container, Table, Alert, Modal, Button, Form, Card, Row, Col } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import '../App.css';
import API_URL from '../config';

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
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const qrCodeRef = useRef(null);
  
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
        {loading ? (
          <div className="text-center py-5">
            <p className="text-muted">Loading students...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <Table striped bordered hover className="operators-table d-none d-lg-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Full Name</th>
                  <th>Grade</th>
                  <th>Contact Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      {students.length === 0 ? 'No students found.' : 'No students match your search criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => (
                    <tr key={student.id}>
                      <td>{index + 1}</td>
                      <td>{student.fullName}</td>
                      <td>{student.grade}</td>
                      <td>{student.contactNumber}</td>
                      <td>
                        <div className="d-flex gap-2 flex-wrap">
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
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>

            {/* Mobile Card View */}
            <div className="d-lg-none">
              {filteredStudents.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <p>{students.length === 0 ? 'No students found.' : 'No students match your search criteria.'}</p>
                </div>
              ) : (
                <div className="student-cards-container">
                  {filteredStudents.map((student, index) => (
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
      </div>

      {/* Student Details Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Student Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <div>
              <div className="mb-3">
                <strong>Full Name:</strong>
                <p className="mb-0">{selectedStudent.fullName}</p>
              </div>
              <div className="mb-3">
                <strong>Age (for 2026):</strong>
                <p className="mb-0">{selectedStudent.age} years</p>
              </div>
              <div className="mb-3">
                <strong>Date of Birth:</strong>
                <p className="mb-0">
                  {selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : '-'}
                </p>
              </div>
              <div className="mb-3">
                <strong>Parent Name:</strong>
                <p className="mb-0">{selectedStudent.parentName}</p>
              </div>
              <div className="mb-3">
                <strong>Contact Number:</strong>
                <p className="mb-0">{selectedStudent.contactNumber}</p>
              </div>
              <div className="mb-3">
                <strong>WhatsApp Number:</strong>
                <p className="mb-0">{selectedStudent.whatsappNumber || selectedStudent.contactNumber}</p>
              </div>
              <div className="mb-3">
                <strong>Address:</strong>
                <p className="mb-0">{selectedStudent.address}</p>
              </div>
              <div className="mb-3">
                <strong>Grade:</strong>
                <p className="mb-0">{selectedStudent.grade}</p>
              </div>
              <div className="mb-3">
                <strong>Created At:</strong>
                <p className="mb-0">
                  {selectedStudent.createdAt ? new Date(selectedStudent.createdAt).toLocaleString() : '-'}
                </p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
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
              <p className="mb-3">Student ID: <strong>{selectedStudentId}</strong></p>
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

      {/* View Courses Modal */}
      <Modal show={showCoursesModal} onHide={handleCloseCoursesModal} centered size="lg" backdrop="static" className="courses-modal">
        <Modal.Header closeButton>
          <Modal.Title>Student Courses - {selectedStudent?.fullName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <div>
              <div className="mb-3 student-courses-header">
                <p className="text-muted mb-2">
                  <strong>Student:</strong> {selectedStudent.fullName}
                </p>
                <p className="text-muted mb-0">
                  <strong>Grade:</strong> {selectedStudent.grade}
                </p>
              </div>
              
              {getStudentCourses(selectedStudent.id).length > 0 ? (
                <div className="table-responsive">
                  <Table striped bordered hover size="sm" className="courses-table">
                    <thead>
                      <tr>
                        <th className="d-none d-md-table-cell">#</th>
                        <th>Course Name</th>
                        <th>Subject</th>
                        <th className="d-none d-md-table-cell">Grade</th>
                        <th>Course Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getStudentCourses(selectedStudent.id).map((course, index) => (
                        <tr key={course.id}>
                          <td className="d-none d-md-table-cell">{index + 1}</td>
                          <td>{course.courseName}</td>
                          <td>{course.subject || '-'}</td>
                          <td className="d-none d-md-table-cell">{course.grade}</td>
                          <td>{course.courseFee ? `Rs. ${parseFloat(course.courseFee).toFixed(2)}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="mt-3 p-3 bg-light rounded">
                    <strong>Total Monthly Fee: </strong>
                    Rs. {getStudentCourses(selectedStudent.id).reduce((sum, course) => 
                      sum + (parseFloat(course.courseFee) || 0), 0
                    ).toFixed(2)}
                  </div>
                </div>
              ) : (
                <p className="text-muted text-center py-4">No courses enrolled.</p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseCoursesModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Payments Modal */}
      <Modal show={showPaymentsModal} onHide={handleClosePaymentsModal} centered size="lg" backdrop="static" className="payments-modal">
        <Modal.Header closeButton>
          <Modal.Title>Student Payments - {selectedStudent?.fullName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <div>
              <div className="mb-3 student-payment-header">
                <p className="text-muted mb-2">
                  <strong>Student:</strong> {selectedStudent.fullName}
                </p>
                <p className="text-muted mb-2">
                  <strong>Grade:</strong> {selectedStudent.grade}
                </p>
                <p className="text-muted mb-0">
                  <strong>Enrollment Date:</strong> {new Date(selectedStudent.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              {calculateMonthlyPayments(selectedStudent).length > 0 ? (
                <div className="table-responsive">
                  <Table striped bordered hover size="sm" className="payments-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Courses</th>
                        <th className="d-none d-md-table-cell">Total Fee</th>
                        <th className="d-none d-md-table-cell">Paid</th>
                        <th className="d-none d-md-table-cell">Pending</th>
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
                                  <strong>{course.courseName}</strong> ({course.subject}) - Rs. {course.fee.toFixed(2)}
                                  {course.isPaid && (
                                    <span className="badge bg-success ms-2">Paid</span>
                                  )}
                                  {course.isPaid && course.paymentDate && (
                                    <div className="text-muted small mt-1">
                                      Paid on {new Date(course.paymentDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="d-none d-md-table-cell"><strong>Rs. {payment.totalFee.toFixed(2)}</strong></td>
                          <td className="d-none d-md-table-cell">
                            <span className="text-success">
                              <strong>Rs. {payment.paidAmount.toFixed(2)}</strong>
                            </span>
                          </td>
                          <td className="d-none d-md-table-cell">
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
                  <div className="mt-3 p-3 bg-light rounded payment-summary">
                    <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
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
          <Button variant="secondary" onClick={handleClosePaymentsModal}>
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
    </Container>
  );
};

export default AdminStudents;

