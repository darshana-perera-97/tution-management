import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Alert } from 'react-bootstrap';
import '../App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5253';

const Operators = () => {
  const [operators, setOperators] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      const response = await fetch(`${API_URL}/api/operators`);
      const data = await response.json();
      if (data.success) {
        setOperators(data.operators);
      }
    } catch (err) {
      console.error('Error fetching operators:', err);
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
      const response = await fetch(`${API_URL}/api/operators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Operator added successfully!');
        setFormData({ name: '', email: '', password: '' });
        setShowModal(false);
        fetchOperators();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to add operator');
      }
    } catch (err) {
      console.error('Error adding operator:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this operator?')) {
      try {
        const response = await fetch(`${API_URL}/api/operators/${id}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          setSuccess('Operator deleted successfully!');
          fetchOperators();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(data.message || 'Failed to delete operator');
        }
      } catch (err) {
        console.error('Error deleting operator:', err);
        setError('Unable to connect to server. Please try again later.');
      }
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setFormData({ name: '', email: '', password: '' });
    setError('');
    setSuccess('');
  };

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="dashboard-title">Operators</h2>
            <p className="dashboard-subtitle">Manage system operators</p>
          </div>
          <Button
            className="add-operator-btn"
            onClick={() => setShowModal(true)}
          >
            + Add Operator
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
              <th>Name</th>
              <th>Email</th>
              <th>Created At</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {operators.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-muted py-4">
                  No operators found. Click "Add Operator" to create one.
                </td>
              </tr>
            ) : (
              operators.map((operator, index) => (
                <tr key={operator.id}>
                  <td>{index + 1}</td>
                  <td>{operator.name}</td>
                  <td>{operator.email}</td>
                  <td>{operator.createdAt ? new Date(operator.createdAt).toLocaleDateString() : '-'}</td>
                  <td>{operator.lastLogin ? new Date(operator.lastLogin).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(operator.id)}
                      className="action-btn"
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Add Operator Modal */}
      <Modal show={showModal} onHide={handleClose} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Add New Operator</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder="Enter operator name"
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
                placeholder="operator@example.com"
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
                {loading ? 'Adding...' : 'Add Operator'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Operators;

