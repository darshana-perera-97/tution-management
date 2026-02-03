import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Table, Modal, Form, Alert, Card } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import '../App.css';
import API_URL from '../config';

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
  const [formData, setFormData] = useState({
    courseName: '',
    teacherId: '',
    grade: '',
    subject: '',
    courseFee: '',
    teacherPaymentPercentage: ''
  });

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
    fetchStudents();
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
                html5QrCode.stop().then(() => {
                  if (html5QrCode) {
                    html5QrCode.clear();
                  }
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
                }).catch((err) => {
                  // Ignore errors if scanner is already stopped
                  if (err.message && !err.message.includes('not running')) {
                    console.error('Error stopping scanner:', err);
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
        html5QrCode.stop().then(() => {
          if (html5QrCode) {
            html5QrCode.clear();
          }
        }).catch((err) => {
          // Ignore errors if scanner is not running
          if (err.message && !err.message.includes('not running') && !err.message.includes('not paused')) {
            console.error('Error in cleanup:', err);
          }
        });
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
      scannerInstance.stop().then(() => {
        if (scannerInstance) {
          scannerInstance.clear();
        }
        setScannerInstance(null);
      }).catch((err) => {
        // Ignore errors if scanner is not running
        if (err.message && !err.message.includes('not running') && !err.message.includes('not paused')) {
          console.error('Error stopping scanner:', err);
        }
        setScannerInstance(null);
      });
    }
    setShowManageStudentsModal(false);
    setSelectedCourse(null);
    setStudentIdInput('');
    setShowQRScanner(false);
    setQrScanResult('');
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
        {/* Desktop Table View */}
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
            {courses.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  No courses found. Click "Add Course" to create one.
                </td>
              </tr>
            ) : (
              courses.map((course, index) => (
                <tr key={course.id}>
                  <td>{index + 1}</td>
                  <td>{course.courseName}</td>
                  <td>{course.subject || '-'}</td>
                  <td>{getTeacherName(course.teacherId)}</td>
                  <td>{course.grade}</td>
                  <td>{course.courseFee ? `Rs. ${parseFloat(course.courseFee).toFixed(2)}` : '-'}</td>
                  <td>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewMore(course)}
                        className="action-btn"
                      >
                        View More
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleManageStudents(course)}
                        className="action-btn"
                      >
                        Manage Students
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(course.id)}
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
          {courses.length === 0 ? (
            <div className="text-center text-muted py-5">
              <p>No courses found. Click "Add Course" to create one.</p>
            </div>
          ) : (
            <div className="student-cards-container">
              {courses.map((course, index) => (
                <Card key={course.id} className="student-card mb-3">
                  <Card.Body>
                    <div className="student-card-header mb-0">
                      <h5 className="student-card-name mb-0">{course.courseName}</h5>
                    </div>
                    <div className="student-card-actions">
                      <div className="student-actions-grid">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleViewMore(course)}
                          className="action-btn"
                        >
                          View More
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleManageStudents(course)}
                          className="action-btn"
                        >
                          Manage Students
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(course.id)}
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
      </div>

      {/* Add Course Modal */}
      <Modal show={showModal} onHide={handleClose} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Add New Course</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Course Name</Form.Label>
              <Form.Control
                type="text"
                name="courseName"
                placeholder="Enter course name"
                value={formData.courseName}
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
              <Form.Label className="form-label">Select Registered Teacher</Form.Label>
              <Form.Select
                name="teacherId"
                value={formData.teacherId}
                onChange={handleChange}
                required
                className="form-control-custom"
              >
                <option value="">Select a teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} - {teacher.subject}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Select Grade</Form.Label>
              <Form.Select
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                required
                className="form-control-custom"
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
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Course Fee (for Student)</Form.Label>
              <Form.Control
                type="number"
                name="courseFee"
                placeholder="Enter course fee (e.g., 100.00)"
                value={formData.courseFee}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Teacher Payment Percentage</Form.Label>
              <Form.Control
                type="number"
                name="teacherPaymentPercentage"
                placeholder="Enter percentage (e.g., 70)"
                value={formData.teacherPaymentPercentage}
                onChange={handleChange}
                required
                min="0"
                max="100"
                step="0.01"
                className="form-control-custom"
              />
              <Form.Text className="text-muted">
                Percentage of course fee that will be paid to the teacher (0-100%)
              </Form.Text>
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
                {loading ? 'Creating...' : 'Add Course'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* View Course Details Modal */}
      <Modal show={showViewModal} onHide={handleCloseViewModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Course Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCourse && (
            <div className="teacher-details">
              <div className="detail-row mb-3">
                <strong className="detail-label">Course Name:</strong>
                <span className="detail-value">{selectedCourse.courseName}</span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Subject:</strong>
                <span className="detail-value">{selectedCourse.subject || '-'}</span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Teacher:</strong>
                <span className="detail-value">{getTeacherName(selectedCourse.teacherId)}</span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Grade:</strong>
                <span className="detail-value">{selectedCourse.grade}</span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Course Fee:</strong>
                <span className="detail-value">
                  {selectedCourse.courseFee ? `Rs. ${parseFloat(selectedCourse.courseFee).toFixed(2)}` : '-'}
                </span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Teacher Payment Percentage:</strong>
                <span className="detail-value">
                  {selectedCourse.teacherPaymentPercentage ? `${selectedCourse.teacherPaymentPercentage}%` : '-'}
                </span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Teacher Payment Amount:</strong>
                <span className="detail-value">
                  {selectedCourse.courseFee && selectedCourse.teacherPaymentPercentage 
                    ? `Rs. ${((parseFloat(selectedCourse.courseFee) * parseFloat(selectedCourse.teacherPaymentPercentage)) / 100).toFixed(2)}` 
                    : '-'}
                </span>
              </div>
              <div className="detail-row mb-3">
                <strong className="detail-label">Created At:</strong>
                <span className="detail-value">
                  {selectedCourse.createdAt 
                    ? new Date(selectedCourse.createdAt).toLocaleString() 
                    : '-'}
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

      {/* Manage Students Modal */}
      <Modal show={showManageStudentsModal} onHide={handleCloseManageStudentsModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Manage Students - {selectedCourse?.courseName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCourse && (
            <div>
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

              <div className="mb-3">
                <p className="text-muted">
                  <strong>Course:</strong> {selectedCourse.courseName} | 
                  <strong> Grade:</strong> {selectedCourse.grade} | 
                  <strong> Subject:</strong> {selectedCourse.subject || '-'}
                </p>
              </div>

              {/* Add Student Section */}
              <div className="mb-4 p-3 border rounded">
                <h6 className="mb-3">Add Student</h6>
                <div className="d-flex gap-2 mb-2" style={{ flexWrap: 'nowrap' }}>
                  <Form.Control
                    type="text"
                    placeholder="Enter Student ID"
                    value={studentIdInput}
                    onChange={(e) => {
                      setStudentIdInput(e.target.value);
                      setError('');
                    }}
                    className="form-control-custom"
                    style={{ flex: '1', minWidth: '0' }}
                  />
                  <Button
                    variant="primary"
                    onClick={() => handleAddStudent(studentIdInput)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Add by ID
                  </Button>
                  <Button
                    variant="info"
                    onClick={() => {
                      if (showQRScanner && scannerInstance) {
                        // Stop scanner if it's running
                        scannerInstance.stop().then(() => {
                          if (scannerInstance) {
                            scannerInstance.clear();
                          }
                          setScannerInstance(null);
                        }).catch((err) => {
                          // Ignore errors if scanner is not running
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
                
                {showQRScanner && (
                  <div className="mt-3 p-3 bg-light rounded">
                    <Form.Group className="mb-3">
                      <Form.Label>Camera QR Scanner</Form.Label>
                      <div 
                        id={`qr-reader-${selectedCourse?.id || 'default'}`}
                        ref={qrScannerRef}
                        style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}
                      ></div>
                      <Form.Text className="text-muted d-block mt-2">
                        Point your camera at the student's QR code. The scanner will automatically detect and add the student.
                      </Form.Text>
                    </Form.Group>
                    {qrScanResult && (
                      <Alert variant="info" className="mb-2">
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
                              // Ignore errors if scanner is not running
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
                          onClick={() => handleAddStudent(qrScanResult)}
                        >
                          Add Student
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Enrolled Students Section */}
              <div className="mb-3">
                <h6>Enrolled Students ({selectedCourse.enrolledStudents && Array.isArray(selectedCourse.enrolledStudents) ? selectedCourse.enrolledStudents.length : 0})</h6>
                {selectedCourse.enrolledStudents && Array.isArray(selectedCourse.enrolledStudents) && selectedCourse.enrolledStudents.length > 0 ? (
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
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
                              <td><code>{student.id}</code></td>
                              <td>{student.fullName}</td>
                              <td>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRemoveStudent(studentId)}
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={studentId}>
                              <td>{index + 1}</td>
                              <td><code>{studentId}</code></td>
                              <td className="text-muted">Student not found</td>
                              <td>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRemoveStudent(studentId)}
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted">No students enrolled in this course.</p>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseManageStudentsModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Courses;

