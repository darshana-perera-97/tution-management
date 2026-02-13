import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Nav, Tab, Badge, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { HiArrowDownTray } from 'react-icons/hi2';
import StudentTopNavbar from './StudentTopNavbar';
import StudentChatbot from './StudentChatbot';
import '../App.css';
import API_URL from '../config';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [lmsContent, setLmsContent] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isStudentAuthenticated');
    const studentData = localStorage.getItem('student');

    if (!isAuthenticated || !studentData) {
      navigate('/student/login');
      return;
    }

    try {
      const parsedStudent = JSON.parse(studentData);
      setStudent(parsedStudent);
      fetchCourses(parsedStudent.id);
      fetchNotifications(parsedStudent.id);
    } catch (err) {
      console.error('Error parsing student data:', err);
      navigate('/student/login');
    }
  }, [navigate]);

  const fetchCourses = async (studentId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/students/${studentId}/courses`);
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (studentId) => {
    try {
      const response = await fetch(`${API_URL}/api/students/${studentId}/notifications`);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleViewCourse = async (course) => {
    setSelectedCourse(course);
    setShowCourseDetails(true);
    setActiveTab('attendance');
    
    if (student) {
      await fetchCourseAttendance(student.id, course.id);
      await fetchCourseLMS(course.id);
    }
  };

  const fetchCourseAttendance = async (studentId, courseId) => {
    try {
      const response = await fetch(`${API_URL}/api/students/${studentId}/courses/${courseId}/attendance`);
      const data = await response.json();
      if (data.success) {
        setAttendance(data.attendance || []);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setAttendance([]);
    }
  };

  const fetchCourseLMS = async (courseId) => {
    try {
      const response = await fetch(`${API_URL}/api/courses/${courseId}/lms`);
      const data = await response.json();
      if (data.success) {
        setLmsContent(data.content || []);
      }
    } catch (err) {
      console.error('Error fetching LMS content:', err);
      setLmsContent([]);
    }
  };

  const handleDownloadFile = async (content) => {
    if (!content.fileUrl) return;
    
    try {
      const fileUrl = `${API_URL}${content.fileUrl}`;
      
      // Get file name with proper extension
      let fileName = content.fileName || content.title || 'download';
      
      // If fileName doesn't have extension, try to get it from fileUrl
      if (!fileName.includes('.')) {
        const urlParts = content.fileUrl.split('/');
        const urlFileName = urlParts[urlParts.length - 1];
        if (urlFileName.includes('.')) {
          fileName = urlFileName;
        } else {
          // Add extension based on content type
          const extension = content.type === 'pdf' ? '.pdf' : 
                           content.type === 'image' ? '.jpg' : '';
          fileName = fileName + extension;
        }
      }
      
      // Fetch the file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }
      const blob = await response.blob();
      
      // Create a temporary URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Failed to download file. Please try again.');
    }
  };

  const handleBackToCourses = () => {
    setShowCourseDetails(false);
    setSelectedCourse(null);
    setAttendance([]);
    setLmsContent([]);
    setActiveTab('attendance');
  };

  const handleLogout = () => {
    localStorage.removeItem('student');
    localStorage.removeItem('isStudentAuthenticated');
    navigate('/student/login');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'enrollment':
        return '🎓';
      case 'payment':
        return '💰';
      case 'lms':
        return '📚';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'enrollment':
        return 'primary';
      case 'payment':
        return 'success';
      case 'lms':
        return 'info';
      default:
        return 'secondary';
    }
  };

  if (!student) {
    return null;
  }

  if (showCourseDetails && selectedCourse) {
    // Course Details View
    const courseNotifications = notifications.filter(n => n.courseId === selectedCourse.id);

    return (
      <div className="student-dashboard" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)' }}>
        <StudentTopNavbar student={student} />
        <div style={{ marginLeft: 0, padding: '24px' }}>
          <Container fluid style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4" style={{ 
              background: 'white', 
              padding: '20px 24px', 
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div className="d-flex align-items-center gap-3">
                <Button 
                  variant="link" 
                  onClick={handleBackToCourses} 
                  className="p-0"
                  style={{ 
                    textDecoration: 'none',
                    color: '#6366f1',
                    fontSize: '18px',
                    fontWeight: '500'
                  }}
                >
                  ← Back
                </Button>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                    {selectedCourse.courseName}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                    {selectedCourse.subject} • {selectedCourse.grade}
                  </p>
                </div>
              </div>
            </div>

            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
              <Nav variant="tabs" className="mb-4" style={{ 
                borderBottom: '2px solid #e2e8f0',
                background: 'white',
                padding: '0 8px',
                borderRadius: '12px 12px 0 0'
              }}>
                <Nav.Item>
                  <Nav.Link 
                    eventKey="attendance" 
                    style={{ 
                      border: 'none',
                      color: activeTab === 'attendance' ? '#6366f1' : '#64748b',
                      fontWeight: activeTab === 'attendance' ? '600' : '400',
                      padding: '12px 20px',
                      borderBottom: activeTab === 'attendance' ? '3px solid #6366f1' : '3px solid transparent'
                    }}
                  >
                    📊 Attendance
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    eventKey="lms"
                    style={{ 
                      border: 'none',
                      color: activeTab === 'lms' ? '#6366f1' : '#64748b',
                      fontWeight: activeTab === 'lms' ? '600' : '400',
                      padding: '12px 20px',
                      borderBottom: activeTab === 'lms' ? '3px solid #6366f1' : '3px solid transparent'
                    }}
                  >
                    📚 Learning Materials
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    eventKey="notifications"
                    style={{ 
                      border: 'none',
                      color: activeTab === 'notifications' ? '#6366f1' : '#64748b',
                      fontWeight: activeTab === 'notifications' ? '600' : '400',
                      padding: '12px 20px',
                      borderBottom: activeTab === 'notifications' ? '3px solid #6366f1' : '3px solid transparent'
                    }}
                  >
                    🔔 Notifications
                    {courseNotifications.length > 0 && (
                      <Badge bg="danger" className="ms-2" style={{ fontSize: '10px', padding: '2px 6px' }}>
                        {courseNotifications.length}
                      </Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              <Tab.Content>
                <Tab.Pane eventKey="attendance">
                  <Card style={{ 
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    background: 'white'
                  }}>
                    <Card.Body style={{ padding: '24px' }}>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 style={{ margin: 0, fontWeight: '600', color: '#1e293b' }}>
                          Attendance Records
                        </h5>
                        <Badge bg="success" style={{ fontSize: '12px', padding: '6px 12px' }}>
                          {attendance.length} Days
                        </Badge>
                      </div>
                      {attendance.length === 0 ? (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '60px 20px',
                          color: '#94a3b8'
                        }}>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                          <p style={{ margin: 0, fontSize: '16px' }}>No attendance records found.</p>
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <Table hover style={{ margin: 0 }}>
                            <thead style={{ background: '#f8fafc' }}>
                              <tr>
                                <th style={{ border: 'none', padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>#</th>
                                <th style={{ border: 'none', padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Date</th>
                                <th style={{ border: 'none', padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Day</th>
                                <th style={{ border: 'none', padding: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendance.map((record, index) => {
                                const date = new Date(record.date);
                                return (
                                  <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px 12px', color: '#64748b' }}>{index + 1}</td>
                                    <td style={{ padding: '16px 12px', color: '#1e293b', fontWeight: '500' }}>
                                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '16px 12px', color: '#64748b' }}>
                                      {date.toLocaleDateString('en-US', { weekday: 'long' })}
                                    </td>
                                    <td style={{ padding: '16px 12px' }}>
                                      <Badge bg="success" style={{ 
                                        background: '#10b981',
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '500'
                                      }}>
                                        ✓ Present
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Tab.Pane>

                <Tab.Pane eventKey="lms">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 style={{ margin: 0, fontWeight: '600', color: '#1e293b' }}>
                        Learning Materials
                      </h5>
                      <Badge bg="info" style={{ fontSize: '12px', padding: '6px 12px' }}>
                        {lmsContent.length} Items
                      </Badge>
                    </div>
                    {lmsContent.length === 0 ? (
                      <Card style={{ 
                        border: 'none',
                        borderRadius: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        background: 'white'
                      }}>
                        <Card.Body style={{ 
                          textAlign: 'center', 
                          padding: '60px 20px',
                          color: '#94a3b8'
                        }}>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                          <p style={{ margin: 0, fontSize: '16px' }}>No learning materials available yet.</p>
                        </Card.Body>
                      </Card>
                    ) : (
                      <Row className="g-4">
                        {lmsContent.map((content) => (
                          <Col key={content.id} xs={12} sm={6} md={4} lg={3}>
                            <Card className="h-100" style={{ 
                              border: 'none',
                              borderRadius: '16px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              transition: 'all 0.3s ease',
                              cursor: 'pointer',
                              background: 'white'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                            }}
                            >
                              <Card.Body className="d-flex flex-column" style={{ padding: '20px' }}>
                                <div className="mb-3">
                                  <h6 style={{ 
                                    margin: '0 0 8px 0', 
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    lineHeight: '1.4'
                                  }}>
                                    {content.title}
                                  </h6>
                                  <Badge style={{ 
                                    background: content.type === 'text' ? '#3b82f6' :
                                              content.type === 'image' ? '#10b981' :
                                              content.type === 'pdf' ? '#ef4444' : '#8b5cf6',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    textTransform: 'uppercase'
                                  }}>
                                    {content.type}
                                  </Badge>
                                </div>
                                <div className="flex-grow-1">
                                  {content.type === 'text' && (
                                    <p style={{ 
                                      color: '#64748b',
                                      fontSize: '13px',
                                      margin: '0 0 12px 0',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 3,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      lineHeight: '1.5'
                                    }}>
                                      {content.content}
                                    </p>
                                  )}
                                  {content.type === 'link' && (
                                    <a 
                                      href={content.link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      style={{ 
                                        color: '#3b82f6',
                                        fontSize: '13px',
                                        wordBreak: 'break-all',
                                        textDecoration: 'none'
                                      }}
                                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                    >
                                      {content.link}
                                    </a>
                                  )}
                                  {(content.type === 'image' || content.type === 'pdf') && content.fileUrl && (
                                    <div>
                                      {content.type === 'image' ? (
                                        <img 
                                          src={`${API_URL}${content.fileUrl}`} 
                                          alt={content.title}
                                          style={{ 
                                            width: '100%', 
                                            height: '140px', 
                                            objectFit: 'cover',
                                            borderRadius: '12px'
                                          }}
                                        />
                                      ) : (
                                        <div style={{ 
                                          background: '#f8fafc',
                                          borderRadius: '12px',
                                          padding: '20px',
                                          textAlign: 'center'
                                        }}>
                                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                                          <a 
                                            href={`${API_URL}${content.fileUrl}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{ 
                                              color: '#3b82f6',
                                              fontSize: '13px',
                                              textDecoration: 'none',
                                              fontWeight: '500'
                                            }}
                                          >
                                            View PDF
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {(content.type === 'image' || content.type === 'pdf') && content.fileUrl && (
                                    <div style={{ marginTop: '12px' }}>
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => handleDownloadFile(content)}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '6px',
                                          borderColor: '#6366f1',
                                          color: '#6366f1',
                                          fontSize: '12px',
                                          fontWeight: '500',
                                          padding: '8px'
                                        }}
                                      >
                                        <HiArrowDownTray size={16} />
                                        Download
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                <div style={{ 
                                  marginTop: '12px',
                                  paddingTop: '12px',
                                  borderTop: '1px solid #f1f5f9'
                                }}>
                                  <small style={{ color: '#94a3b8', fontSize: '12px' }}>
                                    {content.createdAt ? new Date(content.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                                  </small>
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </div>
                </Tab.Pane>

                <Tab.Pane eventKey="notifications">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 style={{ margin: 0, fontWeight: '600', color: '#1e293b' }}>
                        Notifications
                      </h5>
                      <Badge bg="primary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                        {courseNotifications.length}
                      </Badge>
                    </div>
                    {courseNotifications.length === 0 ? (
                      <Card style={{ 
                        border: 'none',
                        borderRadius: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        background: 'white'
                      }}>
                        <Card.Body style={{ 
                          textAlign: 'center', 
                          padding: '60px 20px',
                          color: '#94a3b8'
                        }}>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
                          <p style={{ margin: 0, fontSize: '16px' }}>No notifications for this course.</p>
                        </Card.Body>
                      </Card>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {courseNotifications.map((notification) => (
                          <Alert 
                            key={notification.id} 
                            variant={getNotificationColor(notification.type)}
                            style={{ 
                              border: 'none',
                              borderRadius: '12px',
                              padding: '16px 20px',
                              margin: 0,
                              background: getNotificationColor(notification.type) === 'primary' ? '#eff6ff' :
                                        getNotificationColor(notification.type) === 'success' ? '#f0fdf4' :
                                        getNotificationColor(notification.type) === 'info' ? '#f0f9ff' : '#f8fafc'
                            }}
                          >
                            <div className="d-flex align-items-start gap-3">
                              <span style={{ fontSize: '24px' }}>{getNotificationIcon(notification.type)}</span>
                              <div className="flex-grow-1">
                                <h6 style={{ 
                                  margin: '0 0 4px 0',
                                  fontSize: '15px',
                                  fontWeight: '600',
                                  color: '#1e293b'
                                }}>
                                  {notification.title}
                                </h6>
                                <p style={{ 
                                  margin: '0 0 8px 0',
                                  fontSize: '14px',
                                  color: '#64748b',
                                  lineHeight: '1.5'
                                }}>
                                  {notification.message}
                                </p>
                                <small style={{ color: '#94a3b8', fontSize: '12px' }}>
                                  {new Date(notification.date).toLocaleString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </small>
                              </div>
                            </div>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </div>
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </Container>
        </div>
        <StudentChatbot student={student} />
      </div>
    );
  }

  // Courses List View
  return (
    <div className="student-dashboard" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)' }}>
      <StudentTopNavbar student={student} />
      <div style={{ marginLeft: 0, padding: '24px' }}>
        <Container fluid style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ 
            background: 'white', 
            padding: '24px', 
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '24px'
          }}>
            <div>
              <h1 style={{ 
                margin: 0,
                fontSize: '28px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '4px'
              }}>
                My Courses
              </h1>
              <p style={{ 
                margin: 0,
                color: '#64748b',
                fontSize: '15px'
              }}>
                Welcome back, {student.fullName} 👋
              </p>
            </div>
          </div>

          {loading ? (
            <Card style={{ 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              background: 'white'
            }}>
              <Card.Body style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                color: '#94a3b8'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <p style={{ margin: 0, fontSize: '16px' }}>Loading courses...</p>
              </Card.Body>
            </Card>
          ) : courses.length === 0 ? (
            <Card style={{ 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              background: 'white'
            }}>
              <Card.Body style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                color: '#94a3b8'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
                <p style={{ margin: 0, fontSize: '16px' }}>You are not enrolled in any courses yet.</p>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-4">
              {courses.map((course) => (
                <Col key={course.id} xs={12} sm={6} md={4} lg={3}>
                  <Card 
                    className="h-100" 
                    style={{ 
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: 'white',
                      overflow: 'hidden'
                    }}
                    onClick={() => handleViewCourse(course)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)';
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                    }}
                  >
                    <Card.Body className="d-flex flex-column" style={{ padding: '24px' }}>
                      <div className="mb-3">
                        <h5 style={{ 
                          margin: '0 0 12px 0',
                          fontSize: '20px',
                          fontWeight: '700',
                          color: '#1e293b',
                          lineHeight: '1.3'
                        }}>
                          {course.courseName}
                        </h5>
                        <Badge style={{ 
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          marginBottom: '12px',
                          display: 'inline-block'
                        }}>
                          {course.subject}
                        </Badge>
                        <div style={{ marginTop: '12px' }}>
                          <p style={{ 
                            margin: '4px 0',
                            color: '#64748b',
                            fontSize: '13px'
                          }}>
                            📚 Grade: {course.grade}
                          </p>
                          <p style={{ 
                            margin: '4px 0',
                            color: '#64748b',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}>
                            💰 Rs. {parseFloat(course.courseFee).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <Button 
                          variant="primary"
                          className="w-100"
                          style={{ 
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCourse(course);
                          }}
                        >
                          View Details →
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </div>
      <StudentChatbot student={student} />
    </div>
  );
};

export default StudentDashboard;
