import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Alert } from 'react-bootstrap';
import '../App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5253';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOperator, setIsOperator] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    subject: '',
    educationQualification: '',
    description: ''
  });

  useEffect(() => {
    // Check if user is operator
    const isOperatorAuth = localStorage.getItem('isOperatorAuthenticated');
    setIsOperator(!!isOperatorAuth);
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, []);

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
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(teacher.id)}
                          className="action-btn"
                        >
                          Delete
                        </Button>
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
      <Modal show={showModal} onHide={handleClose} centered>
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
      <Modal show={showViewModal} onHide={handleCloseViewModal} centered size="lg">
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
    </Container>
  );
};

export default Teachers;

