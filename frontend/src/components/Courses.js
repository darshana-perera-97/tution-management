import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Alert } from 'react-bootstrap';
import '../App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5253';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
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
  }, []);

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

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Unknown';
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
        <Table striped bordered hover className="operators-table">
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
                  <td>{course.courseFee ? `$${parseFloat(course.courseFee).toFixed(2)}` : '-'}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewMore(course)}
                        className="action-btn"
                      >
                        View More
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
      </div>

      {/* Add Course Modal */}
      <Modal show={showModal} onHide={handleClose} centered>
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
      <Modal show={showViewModal} onHide={handleCloseViewModal} centered size="lg">
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
                  {selectedCourse.courseFee ? `$${parseFloat(selectedCourse.courseFee).toFixed(2)}` : '-'}
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
                    ? `$${((parseFloat(selectedCourse.courseFee) * parseFloat(selectedCourse.teacherPaymentPercentage)) / 100).toFixed(2)}` 
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
    </Container>
  );
};

export default Courses;

