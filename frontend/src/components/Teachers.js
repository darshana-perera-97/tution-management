import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Alert, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { 
  HiOutlineEye, 
  HiOutlineCurrencyDollar, 
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineAcademicCap,
  HiOutlineIdentification,
  HiOutlinePhoto,
  HiOutlineMapPin,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineCalendar
} from 'react-icons/hi2';
import '../App.css';
import API_URL from '../config';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [teacherPayments, setTeacherPayments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOperator, setIsOperator] = useState(false);
  const [advancePaymentData, setAdvancePaymentData] = useState({
    amount: '',
    description: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    whatsappNumber: '',
    subject: '',
    educationQualification: '',
    description: ''
  });
  const [teacherImage, setTeacherImage] = useState(null);
  const [teacherImagePreview, setTeacherImagePreview] = useState(null);
  const [showEditImageModal, setShowEditImageModal] = useState(false);
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  useEffect(() => {
    // Check if user is operator (not admin)
    const isOperatorAuth = localStorage.getItem('isOperatorAuthenticated');
    const isAdminAuth = localStorage.getItem('isAuthenticated');
    // User is operator only if operator auth exists AND admin auth does NOT exist
    // If admin auth exists, user is admin (not operator), so isOperator should be false
    setIsOperator(!!isOperatorAuth && !isAdminAuth);
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchCourses();
    fetchPayments();
    fetchStudents();
    fetchTeacherPayments();
    
    // Live syncing with minimum delay (5 seconds)
    const SYNC_INTERVAL = 5000; // 5 seconds minimum delay
    const syncInterval = setInterval(() => {
      fetchTeachers();
      fetchCourses();
      fetchPayments();
      fetchStudents();
      fetchTeacherPayments();
    }, SYNC_INTERVAL);
    
    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedTeachers,
    goToPage,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination(teachers, {
    itemsPerPageDesktop: 10,
    itemsPerPageMobile: 5
  });

  // Refresh teacher payments when payments modal opens
  useEffect(() => {
    if (showPaymentsModal && selectedTeacher) {
      fetchTeacherPayments();
    }
  }, [showPaymentsModal, selectedTeacher]);

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
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
      setTeacherImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeacherImagePreview(reader.result);
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
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('whatsappNumber', formData.whatsappNumber || '');
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('educationQualification', formData.educationQualification);
      formDataToSend.append('description', formData.description || '');
      
      if (teacherImage) {
        formDataToSend.append('image', teacherImage);
      }

      const response = await fetch(`${API_URL}/api/teachers`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Teacher added successfully!');
        setFormData({ name: '', email: '', password: '', whatsappNumber: '', subject: '', educationQualification: '', description: '' });
        setTeacherImage(null);
        setTeacherImagePreview(null);
        setShowModal(false);
        fetchTeachers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to add teacher');
      }
    } catch (err) {
      console.error('Error adding teacher:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        const response = await fetch(`${API_URL}/api/teachers/${id}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          setSuccess('Teacher deleted successfully!');
          fetchTeachers();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(data.message || 'Failed to delete teacher');
        }
      } catch (err) {
        console.error('Error deleting teacher:', err);
        setError('Unable to connect to server. Please try again later.');
      }
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setFormData({ name: '', email: '', password: '', whatsappNumber: '', subject: '', educationQualification: '', description: '' });
    setTeacherImage(null);
    setTeacherImagePreview(null);
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
    if (!editImage || !selectedTeacher) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('image', editImage);

      const response = await fetch(`${API_URL}/api/teachers/${selectedTeacher.id}/image`, {
        method: 'PUT',
        body: formDataToSend,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Teacher photo updated successfully!');
        setEditImage(null);
        setEditImagePreview(null);
        setShowEditImageModal(false);
        fetchTeachers();
        // Update selected teacher in modal
        const updatedTeacher = { ...selectedTeacher, imageUrl: data.imageUrl };
        setSelectedTeacher(updatedTeacher);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update photo');
      }
    } catch (err) {
      console.error('Error updating teacher image:', err);
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

  const handleViewMore = (teacher) => {
    setSelectedTeacher(teacher);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedTeacher(null);
  };

  const handleViewPayments = (teacher) => {
    setSelectedTeacher(teacher);
    setShowPaymentsModal(true);
    // Refresh teacher payments when opening the modal
    fetchTeacherPayments();
  };

  const handleClosePaymentsModal = () => {
    setShowPaymentsModal(false);
    setSelectedTeacher(null);
  };

  const getTeacherCourses = (teacherId) => {
    const teacherCourses = courses.filter(course => course.teacherId === teacherId);
    if (teacherCourses.length === 0) return '-';
    return teacherCourses.map(course => course.courseName).join(', ');
  };

  const calculateTeacherPayments = (teacher) => {
    if (!teacher) return { totalPaid: 0, totalAdvancePayments: 0, remaining: 0, totalPotential: 0, advancePayments: [] };

    // Get all courses taught by this teacher
    const teacherCourses = courses.filter(course => course.teacherId === teacher.id);
    
    if (teacherCourses.length === 0) {
      return { totalPaid: 0, totalAdvancePayments: 0, remaining: 0, totalPotential: 0, advancePayments: [] };
    }

    // Calculate total paid amount (from paid course payments)
    let totalPaid = 0;
    const paidPayments = payments.filter(p => p.status === 'Paid' && p.courseId);
    
    paidPayments.forEach(payment => {
      const course = teacherCourses.find(c => c.id === payment.courseId);
      if (course && course.teacherPaymentPercentage) {
        const paymentAmount = parseFloat(payment.amount || 0);
        const teacherPercentage = parseFloat(course.teacherPaymentPercentage) || 0;
        const teacherPayment = (paymentAmount * teacherPercentage) / 100;
        totalPaid += teacherPayment;
      }
    });

    // Calculate total potential amount (if all fees including pending are paid)
    let totalPotential = 0;
    const currentDate = new Date();
    
    students.forEach(student => {
      const enrollmentDate = new Date(student.createdAt);
      const studentCourses = teacherCourses.filter(course => 
        course.enrolledStudents && 
        Array.isArray(course.enrolledStudents) && 
        course.enrolledStudents.includes(student.id)
      );
      
      if (studentCourses.length > 0) {
        // Calculate from enrollment month to current month
        let currentMonth = new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth(), 1);
        const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        while (currentMonth <= lastDayOfCurrentMonth) {
          studentCourses.forEach(course => {
            const courseCreatedDate = new Date(course.createdAt);
            const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;
            const lastDayOfPaymentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            
            if (enrollmentDateForCourse <= lastDayOfPaymentMonth) {
              const courseFee = parseFloat(course.courseFee) || 0;
              const teacherPercentage = parseFloat(course.teacherPaymentPercentage) || 0;
              const teacherPayment = (courseFee * teacherPercentage) / 100;
              totalPotential += teacherPayment;
            }
          });
          
          currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        }
      }
    });

    // Calculate advance payments for this teacher
    const teacherAdvancePayments = teacherPayments.filter(
      tp => tp.teacherId === teacher.id
    );
    const totalAdvancePayments = teacherAdvancePayments.reduce(
      (sum, payment) => sum + parseFloat(payment.amount || 0), 0
    );

    // Remaining amount = total paid - advance payments given
    const remaining = totalPaid - totalAdvancePayments;

    return {
      totalPaid,
      totalAdvancePayments,
      remaining,
      totalPotential,
      advancePayments: teacherAdvancePayments
    };
  };

  const handleAdvancePayment = (teacher) => {
    setSelectedTeacher(teacher);
    setAdvancePaymentData({ amount: '', description: '' });
    setShowAdvancePaymentModal(true);
  };

  const handleCloseAdvancePaymentModal = () => {
    setShowAdvancePaymentModal(false);
    setShowPaymentsModal(false); // Also close the Teacher Payments modal
    setSelectedTeacher(null);
    setAdvancePaymentData({ amount: '', description: '' });
    setError('');
  };

  const handleAdvancePaymentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/teacher-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: selectedTeacher.id,
          amount: advancePaymentData.amount,
          description: advancePaymentData.description,
          paymentDate: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Advance payment recorded successfully!');
        await fetchTeacherPayments();
        // Close both modals after successful submission
          handleCloseAdvancePaymentModal();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to record advance payment');
      }
    } catch (err) {
      console.error('Error recording advance payment:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="dashboard-title">Teachers</h2>
            <p className="dashboard-subtitle">Manage system teachers</p>
          </div>
          {!isOperator && (
            <Button
              className="add-operator-btn"
              onClick={() => setShowModal(true)}
            >
              + Add Teacher
            </Button>
          )}
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
          <h3>Teachers ({paginatedTeachers.length} {paginatedTeachers.length === 1 ? 'teacher' : 'teachers'})</h3>
        </div>
        <div className="table-responsive">
          {/* Desktop Table View */}
          <Table className="operators-table d-none d-lg-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>Name</th>
                <th>Subject</th>
                <th>Conducting Courses</th>
                <th style={{ width: '200px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTeachers.length === 0 ? (
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
                        No teachers found. Click "Add Teacher" to create one.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((teacher, index) => (
                  <tr key={teacher.id} style={{ transition: 'background-color 0.2s ease' }}>
                    <td style={{ 
                      padding: '16px 32px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#64748b'
                    }}>
                      {startIndex + index + 1}
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px' 
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(139, 92, 246, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#7c3aed',
                          flexShrink: 0
                        }}>
                          <HiOutlineUser size={16} />
                        </div>
                        <div>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '700', 
                            color: '#1e293b'
                          }}>
                            {teacher.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '14px',
                        color: '#64748b',
                        fontWeight: '500'
                      }}>
                        <HiOutlineAcademicCap size={16} style={{ color: '#94a3b8' }} />
                        <span>{teacher.subject || '-'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ 
                        fontSize: '14px',
                        color: '#64748b',
                        fontWeight: '500'
                      }}>
                        {getTeacherCourses(teacher.id)}
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
                            onClick={() => handleViewMore(teacher)}
                            className="action-btn-icon"
                          >
                            <HiOutlineEye />
                          </Button>
                        </OverlayTrigger>
                        {!isOperator && (
                          <>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>View Payments</Tooltip>}
                            >
                              <Button
                                variant="info"
                                size="sm"
                                onClick={() => handleViewPayments(teacher)}
                                className="action-btn-icon"
                              >
                                <HiOutlineCurrencyDollar />
                              </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>Delete</Tooltip>}
                            >
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(teacher.id)}
                                className="action-btn-icon"
                              >
                                <HiOutlineTrash />
                              </Button>
                            </OverlayTrigger>
                          </>
                        )}
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
          {paginatedTeachers.length === 0 ? (
            <div className="text-center text-muted py-5">
              <p>No teachers found. Click "Add Teacher" to create one.</p>
            </div>
          ) : (
            <div className="student-cards-container">
              {paginatedTeachers.map((teacher, index) => (
                <Card key={teacher.id} className="student-card mb-3">
                  <Card.Body>
                    <div className="student-card-header mb-0">
                      <h5 className="student-card-name mb-0">{teacher.name}</h5>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">Subject: </small>
                      <span>{teacher.subject || '-'}</span>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">Conducting Courses: </small>
                      <span>{getTeacherCourses(teacher.id)}</span>
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
                          onClick={() => handleViewMore(teacher)}
                            className="action-btn-icon"
                        >
                            <HiOutlineEye />
                        </Button>
                        </OverlayTrigger>
                        {!isOperator && (
                          <>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>View Payments</Tooltip>}
                            >
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => handleViewPayments(teacher)}
                                className="action-btn-icon"
                            >
                                <HiOutlineCurrencyDollar />
                            </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>Delete</Tooltip>}
                            >
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(teacher.id)}
                                className="action-btn-icon"
                            >
                                <HiOutlineTrash />
                            </Button>
                            </OverlayTrigger>
                          </>
                        )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {teachers.length > 0 && (
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

      {/* Add Teacher Modal - Benchmark Style */}
      <Modal show={showModal} onHide={handleClose} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Create New Teacher Profile</h2>
            <p>Add a new teacher to the system</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          <Form onSubmit={handleSubmit} className="student-form-body">
            <div className="student-form-grid">
              {/* Left Column */}
              <div className="student-form-column">
                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlineUser className="student-form-label-icon" />
                    Teacher Name
                  </label>
                  <input
                type="text"
                name="name"
                    placeholder="e.g. John Smith"
                value={formData.name}
                onChange={handleChange}
                required
                    className="student-form-input"
              />
                </div>

                <div className="student-form-grid-2">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineEnvelope className="student-form-label-icon" />
                      Email
                    </label>
                    <input
                type="email"
                name="email"
                placeholder="teacher@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                      className="student-form-input"
              />
                  </div>
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineIdentification className="student-form-label-icon" />
                      Password
                    </label>
                    <input
                type="password"
                name="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                required
                      className="student-form-input"
              />
                  </div>
                </div>

                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlinePhone className="student-form-label-icon" />
                    WhatsApp Number (Optional)
                  </label>
                  <input
                type="tel"
                name="whatsappNumber"
                    placeholder="+94 77 XXX XXXX"
                value={formData.whatsappNumber}
                onChange={handleChange}
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
              </div>

              {/* Right Column */}
              <div className="student-form-column">
                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlineAcademicCap className="student-form-label-icon" />
                    Education Qualification
                  </label>
                  <input
                type="text"
                name="educationQualification"
                placeholder="e.g., M.Sc., B.Ed., Ph.D."
                value={formData.educationQualification}
                onChange={handleChange}
                required
                    className="student-form-input"
              />
                </div>

                <div className="student-form-field">
                  <label className="student-form-label">
                    Description
                  </label>
                  <textarea
                name="description"
                placeholder="Enter teacher description or bio"
                value={formData.description}
                onChange={handleChange}
                    rows={3}
                    className="student-form-input"
                    style={{ resize: 'vertical', minHeight: '80px' }}
              />
                </div>

                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlinePhoto className="student-form-label-icon" />
                    Teacher Photo (Optional)
                  </label>
                  <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                    className="student-form-input"
              />
              {teacherImagePreview && (
                    <div style={{ marginTop: '12px' }}>
                  <img 
                    src={teacherImagePreview} 
                    alt="Preview" 
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '200px', 
                          objectFit: 'cover', 
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0'
                        }}
                  />
                </div>
              )}
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="danger" style={{ 
                marginTop: '24px',
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
                    Create Teacher
                  </>
                )}
              </button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* View Teacher Details Modal - Benchmark Style */}
      <Modal show={showViewModal} onHide={handleCloseViewModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Teacher Details</h2>
            <p>View complete teacher information</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedTeacher && (
            <div className="student-form-body">
              {/* Teacher Photo Section */}
              <div style={{ textAlign: 'center', padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                {selectedTeacher.imageUrl ? (
                  <img 
                    src={`${API_URL}${selectedTeacher.imageUrl}`} 
                    alt={selectedTeacher.name}
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
                {isOperator && (
                  <div style={{ marginTop: '16px' }}>
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={() => {
                      setEditImagePreview(selectedTeacher.imageUrl ? `${API_URL}${selectedTeacher.imageUrl}` : null);
                      setShowEditImageModal(true);
                      }}
                      style={{
                        borderRadius: '8px',
                        padding: '6px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        borderColor: '#3b82f6',
                        color: '#3b82f6'
                      }}
                    >
                      {selectedTeacher.imageUrl ? 'Change Photo' : 'Add Photo'}
                    </Button>
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
                      Name
                    </label>
                    <div className="student-details-value">{selectedTeacher.name}</div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineEnvelope className="student-form-label-icon" />
                      Email
                    </label>
                    <div className="student-details-value">{selectedTeacher.email}</div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlinePhone className="student-form-label-icon" />
                      WhatsApp Number
                    </label>
                    <div className="student-details-value">
                      {selectedTeacher.whatsappNumber || 'Not provided'}
              </div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineAcademicCap className="student-form-label-icon" />
                      Subject
                    </label>
                    <div className="student-details-value">{selectedTeacher.subject || '-'}</div>
              </div>
                </div>

                {/* Right Column */}
                <div className="student-form-column">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineAcademicCap className="student-form-label-icon" />
                      Education Qualification
                    </label>
                    <div className="student-details-value">
                      {selectedTeacher.educationQualification || '-'}
                    </div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineDocumentText className="student-form-label-icon" />
                      Description
                    </label>
                    <div className="student-details-value" style={{ 
                      minHeight: 'auto',
                      padding: '12px 16px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {selectedTeacher.description || (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          No description provided
                        </span>
                  )}
                </div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineClock className="student-form-label-icon" />
                      Created At
                    </label>
                    <div className="student-details-value">
                  {selectedTeacher.createdAt 
                    ? new Date(selectedTeacher.createdAt).toLocaleString() 
                    : '-'}
              </div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineClock className="student-form-label-icon" />
                      Last Login
                    </label>
                    <div className="student-details-value">
                  {selectedTeacher.lastLogin 
                    ? new Date(selectedTeacher.lastLogin).toLocaleString() 
                    : 'Never'}
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

      {/* View Teacher Payments Modal - Benchmark Style */}
      <Modal show={showPaymentsModal} onHide={handleClosePaymentsModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
              <h2>Teacher Payments</h2>
              <p>{selectedTeacher?.name} {selectedTeacher?.subject && `• ${selectedTeacher.subject}`}</p>
            </div>
                  {!isOperator && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleAdvancePayment(selectedTeacher)}
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
                      Give Advance Payment
                    </Button>
                  )}
                </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedTeacher && (() => {
            const paymentData = calculateTeacherPayments(selectedTeacher);
            return (
              <div className="student-form-body">
                {/* Payment Summary Cards */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '12px' 
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#10b981'
                      }}>
                        <HiOutlineCurrencyDollar style={{ fontSize: '16px' }} />
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Amount Paid
                      </div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                        Rs. {(paymentData.totalPaid || 0).toFixed(2)}
                      </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        From paid course fees
                      </div>
                    </div>

                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '12px' 
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3b82f6'
                      }}>
                        <HiOutlineBanknotes style={{ fontSize: '16px' }} />
                  </div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Advance Payments
                      </div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6', marginBottom: '4px' }}>
                        Rs. {(paymentData.totalAdvancePayments || 0).toFixed(2)}
                      </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Amount given to teacher
                      </div>
                    </div>

                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '12px' 
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: (paymentData.remaining || 0) >= 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: (paymentData.remaining || 0) >= 0 ? '#f59e0b' : '#ef4444'
                      }}>
                        {(paymentData.remaining || 0) >= 0 ? (
                          <HiOutlineArrowTrendingUp style={{ fontSize: '16px' }} />
                        ) : (
                          <HiOutlineArrowTrendingDown style={{ fontSize: '16px' }} />
                        )}
                  </div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Remaining Amount
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: '700', 
                      color: (paymentData.remaining || 0) >= 0 ? '#f59e0b' : '#ef4444', 
                      marginBottom: '4px' 
                    }}>
                        Rs. {(paymentData.remaining || 0).toFixed(2)}
                      </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {(paymentData.remaining || 0) >= 0 ? 'Amount to be paid out' : 'Overpaid amount'}
                      </div>
                    </div>

                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '12px' 
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6366f1'
                      }}>
                        <HiOutlineArrowTrendingUp style={{ fontSize: '16px' }} />
                  </div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Potential
                      </div>
                      </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#6366f1', marginBottom: '4px' }}>
                      Rs. {(paymentData.totalPotential || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      If all fees are paid
                    </div>
                  </div>
                </div>

                {/* Advance Payment History */}
                {paymentData.advancePayments && paymentData.advancePayments.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <div className="table-header-section" style={{ marginBottom: '0' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                        Advance Payment History
                      </h3>
                    </div>
                    <div className="operators-table-container">
                    <div className="table-responsive">
                        <Table className="operators-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentData.advancePayments
                            .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
                            .map((payment) => (
                              <tr key={payment.id}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <HiOutlineCalendar style={{ fontSize: '14px', color: '#94a3b8' }} />
                                      {new Date(payment.paymentDate).toLocaleDateString()}
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#3b82f6' }}>
                                      <HiOutlineCurrencyDollar style={{ fontSize: '14px' }} />
                                      Rs. {parseFloat(payment.amount).toFixed(2)}
                                    </div>
                                  </td>
                                <td>{payment.description || '-'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </Table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Amount Section */}
                <div style={{
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginTop: '24px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#0f172a'
                    }}>
                      <HiOutlineArrowTrendingDown style={{ fontSize: '16px', color: '#ef4444' }} />
                      Pending Amount
                    </div>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#ef4444' 
                    }}>
                      Rs. {((paymentData.totalPotential || 0) - (paymentData.totalPaid || 0)).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#64748b',
                    marginTop: '8px'
                  }}>
                    This is the amount that will be paid to the teacher once all pending student fees are collected.
                  </div>
                </div>
              </div>
            );
          })()}
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

      {/* Give Advance Payment Modal */}
      <Modal show={showAdvancePaymentModal} onHide={handleCloseAdvancePaymentModal} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Give Advance Payment - {selectedTeacher?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTeacher && (
            <Form onSubmit={handleAdvancePaymentSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="form-label">Amount (Rs.)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter amount"
                  value={advancePaymentData.amount}
                  onChange={(e) => setAdvancePaymentData({ ...advancePaymentData, amount: e.target.value })}
                  required
                  className="form-control-custom"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="form-label">Description (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter description or notes"
                  value={advancePaymentData.description}
                  onChange={(e) => setAdvancePaymentData({ ...advancePaymentData, description: e.target.value })}
                  className="form-control-custom"
                />
              </Form.Group>

              {error && (
                <Alert variant="danger" className="mt-3">
                  {error}
                </Alert>
              )}

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Button variant="secondary" onClick={handleCloseAdvancePaymentModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  disabled={loading}
                >
                  {loading ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      {/* Edit Teacher Image Modal */}
      <Modal show={showEditImageModal} onHide={handleCloseEditImageModal} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Update Teacher Photo - {selectedTeacher?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateImage}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Teacher Photo</Form.Label>
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
                Upload a photo of the teacher (max 5MB, JPG/PNG)
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

export default Teachers;

