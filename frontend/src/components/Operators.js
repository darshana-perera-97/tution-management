import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Alert, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { 
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineUsers
} from 'react-icons/hi2';
import '../App.css';
import API_URL from '../config';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

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

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedOperators,
    goToPage,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination(operators, {
    itemsPerPageDesktop: 10,
    itemsPerPageMobile: 5
  });

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
        <div className="table-header-section">
          <h3>
            Operators
            <span className="text-muted ms-2" style={{ fontSize: '14px', fontWeight: '400' }}>
              ({operators.length} {operators.length === 1 ? 'operator' : 'operators'})
            </span>
          </h3>
        </div>
        <div className="table-responsive">
          <Table striped bordered hover className="operators-table d-none d-lg-table">
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
              {paginatedOperators.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <HiOutlineUsers style={{ fontSize: '48px', color: '#94a3b8', opacity: 0.5 }} />
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                        No operators found. Click "Add Operator" to create one.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOperators.map((operator, index) => (
                  <tr key={operator.id}>
                    <td style={{ padding: '16px 32px' }}>{startIndex + index + 1}</td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#e0e7ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <HiOutlineUser style={{ fontSize: '18px', color: '#6366f1' }} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                          {operator.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HiOutlineEnvelope style={{ fontSize: '16px', color: '#64748b' }} />
                        <span style={{ fontSize: '14px', color: '#475569' }}>{operator.email}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HiOutlineCalendar style={{ fontSize: '16px', color: '#64748b' }} />
                        <span style={{ fontSize: '14px', color: '#475569' }}>
                          {operator.createdAt ? new Date(operator.createdAt).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HiOutlineClock style={{ fontSize: '16px', color: '#64748b' }} />
                        <span style={{ fontSize: '14px', color: '#475569' }}>
                          {operator.lastLogin ? new Date(operator.lastLogin).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px' }}>
                      <OverlayTrigger
                        placement="top"
                        overlay={<Tooltip>Delete</Tooltip>}
                      >
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(operator.id)}
                          className="action-btn-icon"
                        >
                          <HiOutlineTrash />
                        </Button>
                      </OverlayTrigger>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="d-lg-none">
          {paginatedOperators.length === 0 ? (
            <div className="text-center text-muted py-5">
              <p>No operators found. Click "Add Operator" to create one.</p>
            </div>
          ) : (
            <div className="student-cards-container">
              {paginatedOperators.map((operator, index) => (
                <Card key={operator.id} className="student-card mb-3">
                  <Card.Body>
                    <div className="student-card-header mb-2">
                      <h5 className="student-card-name mb-1">{operator.name}</h5>
                      <p className="student-card-contact mb-0">{operator.email}</p>
                    </div>
                    <div className="student-card-actions">
                      <div className="student-actions-grid single-action">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(operator.id)}
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
        {operators.length > 0 && (
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

