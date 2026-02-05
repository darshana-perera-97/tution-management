import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import API_URL from '../config';

const StudentLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    studentId: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({
    studentId: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');

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
      const response = await fetch(`${API_URL}/api/students/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('student', JSON.stringify(data.student));
        localStorage.setItem('isStudentAuthenticated', 'true');
        navigate('/student/dashboard');
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

  const handleOpenChangePassword = () => {
    setShowChangePassword(true);
    setChangePasswordData({
      studentId: '',
      otp: '',
      newPassword: '',
      confirmPassword: ''
    });
    setOtpSent(false);
    setChangePasswordError('');
    setChangePasswordSuccess('');
  };

  const handleChangePasswordInput = (e) => {
    setChangePasswordData({
      ...changePasswordData,
      [e.target.name]: e.target.value
    });
    setChangePasswordError('');
    setChangePasswordSuccess('');
  };

  const handleGenerateOTP = async () => {
    if (!changePasswordData.studentId) {
      setChangePasswordError('Please enter your Student ID');
      return;
    }

    setOtpLoading(true);
    setChangePasswordError('');
    setChangePasswordSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/students/generate-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId: changePasswordData.studentId }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpSent(true);
        setChangePasswordSuccess('OTP sent to your WhatsApp number. Please check your messages.');
      } else {
        setChangePasswordError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('Generate OTP error:', err);
      setChangePasswordError('Unable to connect to server. Please try again later.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (!changePasswordData.studentId || !changePasswordData.otp || !changePasswordData.newPassword) {
      setChangePasswordError('All fields are required');
      return;
    }

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setChangePasswordError('Passwords do not match');
      return;
    }

    if (changePasswordData.newPassword.length < 6) {
      setChangePasswordError('Password must be at least 6 characters long');
      return;
    }

    setChangePasswordLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/students/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: changePasswordData.studentId,
          otp: changePasswordData.otp,
          newPassword: changePasswordData.newPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChangePasswordSuccess('Password changed successfully! You can now login with your new password.');
        setTimeout(() => {
          setShowChangePassword(false);
        }, 2000);
      } else {
        setChangePasswordError(data.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Change password error:', err);
      setChangePasswordError('Unable to connect to server. Please try again later.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <>
      <div className="login-container">
        <Container className="login-wrapper">
          <Card className="login-card">
            <Card.Body className="p-5">
              <div className="login-header mb-4">
                <h2 className="login-title">Student Login</h2>
                <p className="login-subtitle">Sign in to access your learning materials</p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label className="form-label">Student ID</Form.Label>
                  <Form.Control
                    type="text"
                    name="studentId"
                    placeholder="Enter your Student ID"
                    value={formData.studentId}
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
                    placeholder="Enter your password (default: WhatsApp number)"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="form-control-custom"
                  />
                </Form.Group>

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <Form.Check
                    type="checkbox"
                    id="remember-me-student"
                    label="Remember me"
                    className="remember-checkbox"
                  />
                  <Button
                    variant="link"
                    className="forgot-password-link p-0"
                    onClick={handleOpenChangePassword}
                    style={{ textDecoration: 'none' }}
                  >
                    Change password?
                  </Button>
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

      {/* Change Password Modal */}
      <Modal show={showChangePassword} onHide={() => setShowChangePassword(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {changePasswordError && (
            <Alert variant="danger" className="mb-3">
              {changePasswordError}
            </Alert>
          )}
          {changePasswordSuccess && (
            <Alert variant="success" className="mb-3">
              {changePasswordSuccess}
            </Alert>
          )}

          <Form onSubmit={handleChangePassword}>
            <Form.Group className="mb-3">
              <Form.Label>Student ID</Form.Label>
              <Form.Control
                type="text"
                name="studentId"
                value={changePasswordData.studentId}
                onChange={handleChangePasswordInput}
                placeholder="Enter your Student ID"
                required
                disabled={otpSent}
              />
            </Form.Group>

            {!otpSent ? (
              <Button
                variant="primary"
                onClick={handleGenerateOTP}
                disabled={otpLoading || !changePasswordData.studentId}
                className="w-100 mb-3"
              >
                {otpLoading ? 'Sending OTP...' : 'Send OTP to WhatsApp'}
              </Button>
            ) : (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>OTP</Form.Label>
                  <Form.Control
                    type="text"
                    name="otp"
                    value={changePasswordData.otp}
                    onChange={handleChangePasswordInput}
                    placeholder="Enter 6-digit OTP"
                    maxLength="6"
                    required
                  />
                  <Form.Text className="text-muted">
                    OTP sent to your WhatsApp number. Valid for 5 minutes.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="newPassword"
                    value={changePasswordData.newPassword}
                    onChange={handleChangePasswordInput}
                    placeholder="Enter new password (min 6 characters)"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={changePasswordData.confirmPassword}
                    onChange={handleChangePasswordInput}
                    placeholder="Confirm new password"
                    required
                  />
                </Form.Group>

                <div className="d-flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setOtpSent(false);
                      setChangePasswordData(prev => ({ ...prev, otp: '', newPassword: '', confirmPassword: '' }));
                    }}
                    className="flex-fill"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={changePasswordLoading}
                    className="flex-fill"
                  >
                    {changePasswordLoading ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </>
            )}
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default StudentLogin;

