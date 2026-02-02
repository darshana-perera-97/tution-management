import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5253';

const OperatorLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/operators/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Store operator info in localStorage
        localStorage.setItem('operator', JSON.stringify(data.operator));
        localStorage.setItem('isOperatorAuthenticated', 'true');
        
        // Redirect to operator dashboard
        navigate('/operator/dashboard');
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Container className="login-wrapper">
        <Card className="login-card">
          <Card.Body className="p-5">
            <div className="login-header mb-4">
              <h2 className="login-title">Operator Login</h2>
              <p className="login-subtitle">Sign in to access the operator panel</p>
            </div>

            {error && (
              <Alert variant="danger" className="mb-4">
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-4">
                <Form.Label className="form-label">Email Address</Form.Label>
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

              <Form.Group className="mb-4">
                <Form.Label className="form-label">Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="form-control-custom"
                />
              </Form.Group>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <Form.Check
                  type="checkbox"
                  id="remember-me-operator"
                  label="Remember me"
                  className="remember-checkbox"
                />
                <a href="#forgot" className="forgot-password-link">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                className="login-button w-100"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default OperatorLogin;

