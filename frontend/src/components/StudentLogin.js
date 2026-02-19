import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineUser, 
  HiOutlineLockClosed,
  HiOutlineKey,
  HiOutlineAcademicCap
} from 'react-icons/hi2';
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
          <Card className="login-card" style={{
            border: 'none',
            borderRadius: '24px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
            background: '#ffffff',
            overflow: 'hidden'
          }}>
            <Card.Body style={{ padding: '48px' }}>
              <div className="login-header mb-5" style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  color: '#3b82f6'
                }}>
                  <HiOutlineAcademicCap size={40} />
                </div>
                <h2 className="login-title" style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: '8px',
                  letterSpacing: '-0.5px'
                }}>Student Login</h2>
                <p className="login-subtitle" style={{
                  fontSize: '15px',
                  color: '#64748b',
                  margin: 0,
                  fontWeight: '400'
                }}>Sign in to access your learning materials</p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-4 alert-custom" onClose={() => setError('')} dismissible style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 20px'
                }}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label className="form-label-custom" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <HiOutlineUser size={14} />
                    Student ID
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="studentId"
                    placeholder="Enter your Student ID"
                    value={formData.studentId}
                    onChange={handleChange}
                    required
                    className="form-control-custom"
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      fontSize: '15px',
                      color: '#0f172a',
                      background: '#ffffff',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="form-label-custom" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <HiOutlineLockClosed size={14} />
                    Password
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="Enter your password (default: WhatsApp number)"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="form-control-custom"
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      fontSize: '15px',
                      color: '#0f172a',
                      background: '#ffffff',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </Form.Group>

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <Form.Check
                    type="checkbox"
                    id="remember-me-student"
                    label="Remember me"
                    style={{
                      fontSize: '14px',
                      color: '#64748b',
                      fontWeight: '500'
                    }}
                  />
                  <Button
                    variant="link"
                    className="p-0"
                    onClick={handleOpenChangePassword}
                    style={{
                      textDecoration: 'none',
                      fontSize: '14px',
                      color: '#3b82f6',
                      fontWeight: '600',
                      padding: 0,
                      border: 'none',
                      background: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#3b82f6';
                    }}
                  >
                    Change password?
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-100"
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '16px',
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#ffffff',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    height: '52px'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Container>
      </div>

      {/* Change Password Modal - Benchmark Style */}
      <Modal show={showChangePassword} onHide={() => setShowChangePassword(false)} centered backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Change Password</h2>
            <p>Reset your password using OTP sent to WhatsApp</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          <div className="student-form-body">
            {changePasswordError && (
              <Alert variant="danger" className="alert-custom" onClose={() => setChangePasswordError('')} dismissible style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                border: 'none',
                borderRadius: '8px',
                margin: '0 24px 24px 24px'
              }}>
                {changePasswordError}
              </Alert>
            )}
            {changePasswordSuccess && (
              <Alert variant="success" className="alert-custom" onClose={() => setChangePasswordSuccess('')} dismissible style={{
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
                border: 'none',
                borderRadius: '8px',
                margin: '0 24px 24px 24px'
              }}>
                {changePasswordSuccess}
              </Alert>
            )}

            <Form onSubmit={handleChangePassword}>
              <div className="student-form-grid">
                <div className="student-form-column">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineUser className="student-form-label-icon" />
                      Student ID
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      value={changePasswordData.studentId}
                      onChange={handleChangePasswordInput}
                      placeholder="Enter your Student ID"
                      required
                      disabled={otpSent}
                      className="student-form-input"
                    />
                  </div>
                </div>
              </div>

              {!otpSent ? (
                <div className="student-form-actions" style={{ marginTop: '24px' }}>
                  <Button
                    variant="primary"
                    onClick={handleGenerateOTP}
                    disabled={otpLoading || !changePasswordData.studentId}
                    className="w-100"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                      height: '48px'
                    }}
                  >
                    {otpLoading ? 'Sending OTP...' : 'Send OTP to WhatsApp'}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="student-form-grid">
                    <div className="student-form-column">
                      <div className="student-form-field">
                        <label className="student-form-label">
                          <HiOutlineKey className="student-form-label-icon" />
                          OTP
                        </label>
                        <input
                          type="text"
                          name="otp"
                          value={changePasswordData.otp}
                          onChange={handleChangePasswordInput}
                          placeholder="Enter 6-digit OTP"
                          maxLength="6"
                          required
                          className="student-form-input"
                        />
                        <div style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginTop: '8px'
                        }}>
                          OTP sent to your WhatsApp number. Valid for 5 minutes.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="student-form-grid">
                    <div className="student-form-column">
                      <div className="student-form-field">
                        <label className="student-form-label">
                          <HiOutlineLockClosed className="student-form-label-icon" />
                          New Password
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          value={changePasswordData.newPassword}
                          onChange={handleChangePasswordInput}
                          placeholder="Enter new password (min 6 characters)"
                          required
                          className="student-form-input"
                        />
                      </div>
                    </div>
                    <div className="student-form-column">
                      <div className="student-form-field">
                        <label className="student-form-label">
                          <HiOutlineLockClosed className="student-form-label-icon" />
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={changePasswordData.confirmPassword}
                          onChange={handleChangePasswordInput}
                          placeholder="Confirm new password"
                          required
                          className="student-form-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="student-form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setChangePasswordData(prev => ({ ...prev, otp: '', newPassword: '', confirmPassword: '' }));
                      }}
                      className="student-form-cancel-btn"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={changePasswordLoading}
                      className="student-form-submit-btn"
                    >
                      {changePasswordLoading ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </>
              )}
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default StudentLogin;

