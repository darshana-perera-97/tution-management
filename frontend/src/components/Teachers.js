import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Alert } from 'react-bootstrap';
import '../App.css';
import API_URL from '../config';

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
    subject: '',
    educationQualification: '',
    description: ''
  });

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
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Teacher added successfully!');
        setFormData({ name: '', email: '', password: '', subject: '', educationQualification: '', description: '' });
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
    setFormData({ name: '', email: '', password: '', subject: '', educationQualification: '', description: '' });
    setError('');
    setSuccess('');
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

  const calculateTeacherPayments = (teacher) => {
    if (!teacher) return { totalPaid: 0, remaining: 0, totalPotential: 0 };

    // Get all courses taught by this teacher
    const teacherCourses = courses.filter(course => course.teacherId === teacher.id);
    
    if (teacherCourses.length === 0) {
      return { totalPaid: 0, remaining: 0, totalPotential: 0 };
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
        // Keep the payments modal open and refresh data
        // Don't close the advance payment modal if payments modal is open
        if (!showPaymentsModal) {
          handleCloseAdvancePaymentModal();
        } else {
          // Just close the advance payment modal, keep payments modal open
          setShowAdvancePaymentModal(false);
          setAdvancePaymentData({ amount: '', description: '' });
        }
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
        <Table striped bordered hover className="operators-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Subject</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center text-muted py-4">
                  No teachers found. Click "Add Teacher" to create one.
                </td>
              </tr>
            ) : (
              teachers.map((teacher, index) => (
                <tr key={teacher.id}>
                  <td>{index + 1}</td>
                  <td>{teacher.name}</td>
                  <td>{teacher.subject || '-'}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewMore(teacher)}
                        className="action-btn"
                      >
                        View More
                      </Button>
                      {!isOperator && (
                        <>
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() => handleViewPayments(teacher)}
                            className="action-btn"
                          >
                            View Payments
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(teacher.id)}
                            className="action-btn"
                          >
                            Delete
                          </Button>
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

      {/* Add Teacher Modal */}
      <Modal show={showModal} onHide={handleClose} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Add New Teacher</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder="Enter teacher name"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                placeholder="teacher@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Subject</Form.Label>
              <Form.Select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="form-control-custom"
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
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Education Qualification</Form.Label>
              <Form.Control
                type="text"
                name="educationQualification"
                placeholder="e.g., M.Sc., B.Ed., Ph.D."
                value={formData.educationQualification}
                onChange={handleChange}
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                placeholder="Enter teacher description or bio"
                value={formData.description}
                onChange={handleChange}
                className="form-control-custom"
              />
            </Form.Group>

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
                {loading ? 'Adding...' : 'Add Teacher'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* View Teacher Details Modal */}
      <Modal show={showViewModal} onHide={handleCloseViewModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Teacher Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTeacher && (
            <div className="teacher-details">
              <div className="detail-row mb-3">
                <strong className="detail-label">Name:</strong>
                <span className="detail-value">{selectedTeacher.name}</span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Email:</strong>
                <span className="detail-value">{selectedTeacher.email}</span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Subject:</strong>
                <span className="detail-value">{selectedTeacher.subject || '-'}</span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Education Qualification:</strong>
                <span className="detail-value">{selectedTeacher.educationQualification || '-'}</span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Description:</strong>
                <div className="detail-value">
                  {selectedTeacher.description ? (
                    <p className="mb-0">{selectedTeacher.description}</p>
                  ) : (
                    <span className="text-muted">No description provided</span>
                  )}
                </div>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Created At:</strong>
                <span className="detail-value">
                  {selectedTeacher.createdAt 
                    ? new Date(selectedTeacher.createdAt).toLocaleString() 
                    : '-'}
                </span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Last Login:</strong>
                <span className="detail-value">
                  {selectedTeacher.lastLogin 
                    ? new Date(selectedTeacher.lastLogin).toLocaleString() 
                    : 'Never'}
                </span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseViewModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Teacher Payments Modal */}
      <Modal show={showPaymentsModal} onHide={handleClosePaymentsModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Teacher Payments - {selectedTeacher?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTeacher && (() => {
            const paymentData = calculateTeacherPayments(selectedTeacher);
            return (
              <div>
                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <p className="text-muted mb-0">
                    <strong>Teacher:</strong> {selectedTeacher.name} | 
                    <strong> Subject:</strong> {selectedTeacher.subject || '-'}
                  </p>
                  {!isOperator && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleAdvancePayment(selectedTeacher)}
                    >
                      Give Advance Payment
                    </Button>
                  )}
                </div>
                
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded">
                      <div className="text-muted small mb-1">Total Amount Paid</div>
                      <div className="h4 mb-0 text-success">
                        Rs. {paymentData.totalPaid.toFixed(2)}
                      </div>
                      <div className="small text-muted mt-1">
                        From paid course fees
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded">
                      <div className="text-muted small mb-1">Advance Payments</div>
                      <div className="h4 mb-0 text-primary">
                        Rs. {paymentData.totalAdvancePayments.toFixed(2)}
                      </div>
                      <div className="small text-muted mt-1">
                        Amount given to teacher
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded">
                      <div className="text-muted small mb-1">Remaining Amount</div>
                      <div className={`h4 mb-0 ${paymentData.remaining >= 0 ? 'text-warning' : 'text-danger'}`}>
                        Rs. {paymentData.remaining.toFixed(2)}
                      </div>
                      <div className="small text-muted mt-1">
                        {paymentData.remaining >= 0 ? 'Amount to be paid out' : 'Overpaid amount'}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded">
                      <div className="text-muted small mb-1">Total Potential Amount</div>
                      <div className="h4 mb-0 text-info">
                        Rs. {paymentData.totalPotential.toFixed(2)}
                      </div>
                      <div className="small text-muted mt-1">
                        If all fees (including pending) are paid
                      </div>
                    </div>
                  </div>
                </div>

                {paymentData.advancePayments && paymentData.advancePayments.length > 0 && (
                  <div className="mt-3">
                    <h6 className="mb-2">Advance Payment History</h6>
                    <div className="table-responsive">
                      <Table striped bordered hover size="sm">
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
                                <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                <td>Rs. {parseFloat(payment.amount).toFixed(2)}</td>
                                <td>{payment.description || '-'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="mt-3 p-3 bg-primary bg-opacity-10 rounded">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Pending Amount:</strong>
                    </div>
                    <div className="h5 mb-0 text-danger">
                      Rs. {(paymentData.totalPotential - paymentData.totalPaid).toFixed(2)}
                    </div>
                  </div>
                  <div className="small text-muted mt-2">
                    This is the amount that will be paid to the teacher once all pending student fees are collected.
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClosePaymentsModal}>
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
    </Container>
  );
};

export default Teachers;

