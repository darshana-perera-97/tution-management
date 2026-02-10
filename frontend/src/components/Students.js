import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Table, Modal, Form, Alert, Card } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import '../App.css';
import API_URL from '../config';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newStudentId, setNewStudentId] = useState(null);
  const qrCodeRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    parentName: '',
    contactNumber: '',
    studentWhatsAppNumber: '',
    parentWhatsAppNumber: '',
    address: '',
    grade: ''
  });
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [studentImage, setStudentImage] = useState(null);
  const [studentImagePreview, setStudentImagePreview] = useState(null);
  const [showEditImageModal, setShowEditImageModal] = useState(false);
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [isOperator, setIsOperator] = useState(false);

  useEffect(() => {
    // Check if user is operator
    const isOperatorAuth = localStorage.getItem('isOperatorAuthenticated');
    const isAdminAuth = localStorage.getItem('isAuthenticated');
    setIsOperator(!!isOperatorAuth && !isAdminAuth);
    
    fetchStudents();
    fetchCourses();
    fetchPayments();
  }, []);

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
  } = usePagination(students, {
    itemsPerPageDesktop: 10,
    itemsPerPageMobile: 5
  });

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

  const normalizeGrade = (grade) => {
    if (!grade) return '';
    return grade.toString().replace(/^Grade\s+/i, '').trim();
  };

  const gradesMatch = (grade1, grade2) => {
    return normalizeGrade(grade1) === normalizeGrade(grade2);
  };

  const getAvailableCourses = () => {
    if (!formData.grade) return [];
    return courses.filter(course => gradesMatch(course.grade, formData.grade));
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear selected courses when grade changes
    if (e.target.name === 'grade') {
      setSelectedCourses([]);
    }
    setError('');
    setSuccess('');
  };

  const handleCourseToggle = (courseId) => {
    setSelectedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setStudentImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStudentImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('fullName', formData.fullName);
      formDataToSend.append('dob', formData.dob);
      formDataToSend.append('parentName', formData.parentName);
      formDataToSend.append('contactNumber', formData.contactNumber);
      formDataToSend.append('studentWhatsAppNumber', formData.studentWhatsAppNumber || '');
      formDataToSend.append('parentWhatsAppNumber', formData.parentWhatsAppNumber || '');
      formDataToSend.append('address', formData.address);
      formDataToSend.append('grade', formData.grade);
      formDataToSend.append('selectedCourses', JSON.stringify(selectedCourses));
      
      if (studentImage) {
        formDataToSend.append('image', studentImage);
      }

      const response = await fetch(`${API_URL}/api/students`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Student added successfully!');
        setFormData({
          fullName: '',
          dob: '',
          parentName: '',
          contactNumber: '',
          studentWhatsAppNumber: '',
          parentWhatsAppNumber: '',
          address: '',
          grade: ''
        });
        setSelectedCourses([]);
        setStudentImage(null);
        setStudentImagePreview(null);
        setShowModal(false);
        setNewStudentId(data.student.id);
        setShowQRModal(true);
        fetchStudents();
        fetchCourses(); // Refresh courses to get updated enrollment data
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to add student');
      }
    } catch (err) {
      console.error('Error adding student:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        const response = await fetch(`${API_URL}/api/students/${id}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          setSuccess('Student deleted successfully!');
          fetchStudents();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(data.message || 'Failed to delete student');
        }
      } catch (err) {
        console.error('Error deleting student:', err);
        setError('Unable to connect to server. Please try again later.');
      }
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setFormData({
      fullName: '',
      dob: '',
      parentName: '',
      contactNumber: '',
      studentWhatsAppNumber: '',
      parentWhatsAppNumber: '',
      address: '',
      grade: ''
    });
    setSelectedCourses([]);
    setStudentImage(null);
    setStudentImagePreview(null);
    setError('');
    setSuccess('');
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setEditImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleUpdateImage = async (e) => {
    e.preventDefault();
    if (!editImage || !selectedStudent) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('image', editImage);

      const response = await fetch(`${API_URL}/api/students/${selectedStudent.id}/image`, {
        method: 'PUT',
        body: formDataToSend,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Student photo updated successfully!');
        setEditImage(null);
        setEditImagePreview(null);
        setShowEditImageModal(false);
        fetchStudents();
        // Update selected student in modal
        const updatedStudent = { ...selectedStudent, imageUrl: data.imageUrl };
        setSelectedStudent(updatedStudent);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update photo');
      }
    } catch (err) {
      console.error('Error updating student image:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEditImageModal = () => {
    setShowEditImageModal(false);
    setEditImage(null);
    setEditImagePreview(null);
    setError('');
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedStudent(null);
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

  const handleViewQRCode = (student) => {
    setNewStudentId(student.id);
    setShowQRModal(true);
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setNewStudentId(null);
  };

  const downloadQRCode = () => {
    if (qrCodeRef.current && newStudentId) {
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
                link.download = `student-qr-${newStudentId}.png`;
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
            link.download = `student-qr-${newStudentId}.svg`;
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

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="dashboard-title">Students</h2>
            <p className="dashboard-subtitle">Manage system students</p>
          </div>
          <Button
            className="add-operator-btn"
            onClick={() => setShowModal(true)}
            style={{ whiteSpace: 'nowrap' }}
          >
            + Add Student
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
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-muted py-4">
                  No students found. Click "Add Student" to create one.
                </td>
              </tr>
            ) : (
              paginatedStudents.map((student, index) => (
                <tr key={student.id}>
                  <td>{startIndex + index + 1}</td>
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
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(student.id)}
                        className="action-btn"
                      >
                        Delete
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
          {paginatedStudents.length === 0 ? (
            <div className="text-center text-muted py-5">
              <p>No students found. Click "Add Student" to create one.</p>
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
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(student.id)}
                          className="action-btn"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {students.length > 0 && (
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

      {/* Add Student Modal */}
      <Modal show={showModal} onHide={handleClose} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Add New Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Student Full Name</Form.Label>
              <Form.Control
                type="text"
                name="fullName"
                placeholder="Enter student full name"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Date of Birth</Form.Label>
              <Form.Control
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                required
                className="form-control-custom"
              />
              <Form.Text className="text-muted">
                Age for 2026 will be calculated automatically
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Parent Name</Form.Label>
              <Form.Control
                type="text"
                name="parentName"
                placeholder="Enter parent name"
                value={formData.parentName}
                onChange={handleChange}
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Contact Number</Form.Label>
              <Form.Control
                type="tel"
                name="contactNumber"
                placeholder="Enter contact number"
                value={formData.contactNumber}
                onChange={handleChange}
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Student WhatsApp Number (Optional)</Form.Label>
              <Form.Control
                type="tel"
                name="studentWhatsAppNumber"
                placeholder="Enter student WhatsApp number"
                value={formData.studentWhatsAppNumber}
                onChange={handleChange}
                className="form-control-custom"
              />
              <Form.Text className="text-muted">
                WhatsApp number for the student
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Parent WhatsApp Number (Optional)</Form.Label>
              <Form.Control
                type="tel"
                name="parentWhatsAppNumber"
                placeholder="Enter parent WhatsApp number"
                value={formData.parentWhatsAppNumber}
                onChange={handleChange}
                className="form-control-custom"
              />
              <Form.Text className="text-muted">
                WhatsApp number for the parent. If not provided, contact number will be used.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Address</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="address"
                placeholder="Enter address"
                value={formData.address}
                onChange={handleChange}
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Grade</Form.Label>
              <Form.Control
                type="text"
                name="grade"
                placeholder="Enter grade (e.g., Grade 1, Grade 2, etc.)"
                value={formData.grade}
                onChange={handleChange}
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Student Photo (Optional)</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="form-control-custom"
              />
              {studentImagePreview && (
                <div className="mt-2">
                  <img 
                    src={studentImagePreview} 
                    alt="Preview" 
                    style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                </div>
              )}
              <Form.Text className="text-muted">
                Upload a photo of the student (max 5MB, JPG/PNG)
              </Form.Text>
            </Form.Group>

            {formData.grade && (
              <Form.Group className="mb-3">
                <Form.Label className="form-label">Select Courses (Optional)</Form.Label>
                <div className="border rounded p-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {getAvailableCourses().length > 0 ? (
                    <>
                      {getAvailableCourses().map((course) => (
                        <Form.Check
                          key={course.id}
                          type="checkbox"
                          id={`course-${course.id}`}
                          label={
                            <div>
                              <strong>{course.courseName}</strong>
                              <span className="text-muted ms-2">
                                ({course.subject}) - Rs. {parseFloat(course.courseFee || 0).toFixed(2)}
                              </span>
                            </div>
                          }
                          checked={selectedCourses.includes(course.id)}
                          onChange={() => handleCourseToggle(course.id)}
                          className="mb-2"
                        />
                      ))}
                      {selectedCourses.length > 0 && (
                        <div className="mt-3 p-2 bg-light rounded">
                          <small>
                            <strong>Selected: </strong>
                            {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''}
                          </small>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted mb-0">
                      No courses available for grade "{formData.grade}". 
                      Please create courses for this grade first.
                    </p>
                  )}
                </div>
                <Form.Text className="text-muted">
                  Select the courses this student will be enrolled in. You can enroll them in courses later as well.
                </Form.Text>
              </Form.Group>
            )}

            {error && (
              <Alert variant="danger" className="mt-3">
                {error}
              </Alert>
            )}

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Student'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Student Details Modal */}
      <Modal show={showDetailsModal} onHide={handleCloseDetailsModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Student Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <div>
              <div className="mb-3 text-center">
                {selectedStudent.imageUrl ? (
                  <img 
                    src={`${API_URL}${selectedStudent.imageUrl}`} 
                    alt={selectedStudent.fullName}
                    style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #dee2e6' }}
                  />
                ) : (
                  <div style={{ width: '200px', height: '200px', backgroundColor: '#f0f0f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    <span className="text-muted">No Photo</span>
                  </div>
                )}
                {isOperator && (
                  <div className="mt-2">
                    <Button variant="outline-primary" size="sm" onClick={() => {
                      setEditImagePreview(selectedStudent.imageUrl ? `${API_URL}${selectedStudent.imageUrl}` : null);
                      setShowEditImageModal(true);
                    }}>
                      {selectedStudent.imageUrl ? 'Change Photo' : 'Add Photo'}
                    </Button>
                  </div>
                )}
              </div>
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
                <strong>Student WhatsApp Number:</strong>
                <p className="mb-0">{selectedStudent.studentWhatsAppNumber || 'Not provided'}</p>
              </div>
              <div className="mb-3">
                <strong>Parent WhatsApp Number:</strong>
                <p className="mb-0">{selectedStudent.parentWhatsAppNumber || selectedStudent.contactNumber || 'Not provided'}</p>
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
          <Button variant="secondary" onClick={handleCloseDetailsModal}>
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
          {newStudentId && (
            <div>
              <p className="mb-3">Student ID: <strong>{newStudentId}</strong></p>
              <div ref={qrCodeRef} className="d-flex justify-content-center mb-3" style={{ padding: '20px', backgroundColor: 'white' }}>
                <QRCodeSVG
                  value={newStudentId}
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
      <Modal show={showCoursesModal} onHide={handleCloseCoursesModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Student Courses - {selectedStudent?.fullName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <div>
              <div className="mb-3">
                <p className="text-muted">
                  <strong>Student:</strong> {selectedStudent.fullName} | 
                  <strong> Grade:</strong> {selectedStudent.grade}
                </p>
              </div>
              
              {getStudentCourses(selectedStudent.id).length > 0 ? (
                <div className="table-responsive">
                  <Table striped bordered hover size="sm">
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
      <Modal show={showPaymentsModal} onHide={handleClosePaymentsModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Student Payments - {selectedStudent?.fullName}</Modal.Title>
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
          <Button variant="secondary" onClick={handleClosePaymentsModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Student Image Modal */}
      <Modal show={showEditImageModal} onHide={handleCloseEditImageModal} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Update Student Photo - {selectedStudent?.fullName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateImage}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Student Photo</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleEditImageChange}
                className="form-control-custom"
                required
              />
              {editImagePreview && (
                <div className="mt-2">
                  <img 
                    src={editImagePreview} 
                    alt="Preview" 
                    style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                </div>
              )}
              <Form.Text className="text-muted">
                Upload a photo of the student (max 5MB, JPG/PNG)
              </Form.Text>
            </Form.Group>

            {error && (
              <Alert variant="danger" className="mt-3">
                {error}
              </Alert>
            )}

            {success && (
              <Alert variant="success" className="mt-3">
                {success}
              </Alert>
            )}

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={handleCloseEditImageModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !editImage}
              >
                {loading ? 'Updating...' : 'Update Photo'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Students;
