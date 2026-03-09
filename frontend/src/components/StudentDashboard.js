import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Nav, Tab, Badge, Alert, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { HiArrowDownTray, HiOutlineBookOpen, HiOutlineAcademicCap, HiOutlineCurrencyDollar } from 'react-icons/hi2';
import { QRCodeSVG } from 'qrcode.react';
import StudentTopNavbar from './StudentTopNavbar';
import StudentChatbot from './StudentChatbot';
import '../App.css';
import API_URL from '../config';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [lmsContent, setLmsContent] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [chatbotOpen, setChatbotOpen] = useState(false);

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
      fetchAllCourses(parsedStudent.id);
      fetchNotifications(parsedStudent.id);
      fetchPayments(parsedStudent.id);
    } catch (err) {
      console.error('Error parsing student data:', err);
      navigate('/student/login');
    }
  }, [navigate]);

  const fetchAllCourses = async (studentId) => {
    try {
      setLoading(true);
      // Fetch enrolled courses for the student
      const enrolledResponse = await fetch(`${API_URL}/api/students/${studentId}/courses`);
      const enrolledData = await enrolledResponse.json();
      
      if (enrolledData.success) {
        const enrolledCourses = enrolledData.courses || [];
        // Get enrolled course IDs
        const enrolledIds = enrolledCourses.map(c => c.id);
        setEnrolledCourseIds(enrolledIds);
        // Set courses to only enrolled courses
        setCourses(enrolledCourses);
        setAllCourses(enrolledCourses);
        // Fetch attendance after courses are loaded
        if (studentId && enrolledCourses.length > 0) {
          fetchAllAttendance(studentId, enrolledCourses);
        }
      } else {
        // No enrolled courses
        setCourses([]);
        setAllCourses([]);
        setEnrolledCourseIds([]);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setCourses([]);
      setAllCourses([]);
      setEnrolledCourseIds([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter courses based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setCourses(allCourses);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allCourses.filter(course => 
        course.courseName?.toLowerCase().includes(query) ||
        course.subject?.toLowerCase().includes(query) ||
        course.grade?.toLowerCase().includes(query) ||
        course.teacherName?.toLowerCase().includes(query)
      );
      setCourses(filtered);
    }
  }, [searchQuery, allCourses]);

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

  const fetchPayments = async (studentId) => {
    try {
      const response = await fetch(`${API_URL}/api/payments`);
      const data = await response.json();
      if (data.success) {
        // Filter payments for this student and sort by date (newest first)
        const studentPayments = (data.payments || [])
          .filter(p => p.studentId === studentId && p.status === 'Paid')
          .sort((a, b) => {
            const dateA = new Date(a.paymentDate || a.createdAt || 0);
            const dateB = new Date(b.paymentDate || b.createdAt || 0);
            return dateB - dateA;
          })
          .slice(0, 3); // Get last 3 payments
        setPayments(studentPayments);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      setPayments([]);
    }
  };

  const fetchAllAttendance = async (studentId, coursesList) => {
    try {
      // Fetch attendance from all enrolled courses
      const allAttendanceRecords = [];
      
      if (!coursesList || coursesList.length === 0) {
        setAllAttendance([]);
        return;
      }
      
      for (const course of coursesList) {
        try {
          const response = await fetch(`${API_URL}/api/students/${studentId}/courses/${course.id}/attendance`);
          const data = await response.json();
          if (data.success && data.attendance) {
            // Add course name to each attendance record
            const recordsWithCourse = data.attendance.map(record => ({
              ...record,
              courseName: course.courseName,
              courseId: course.id
            }));
            allAttendanceRecords.push(...recordsWithCourse);
          }
        } catch (err) {
          console.error(`Error fetching attendance for course ${course.id}:`, err);
        }
      }
      
      // Sort by date (newest first) and get last 5 records
      const sortedAttendance = allAttendanceRecords.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      }).slice(0, 5);
      
      setAllAttendance(sortedAttendance);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setAllAttendance([]);
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
      <div className="student-dashboard" style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <StudentTopNavbar student={student} />
        <div style={{ marginLeft: 0, padding: '24px', marginTop: '40px' }}>
          <Container fluid style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <Card style={{ 
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              background: 'white',
              marginBottom: '24px'
            }}>
              <Card.Body style={{ padding: '24px' }}>
                <div className="d-flex align-items-center gap-3">
                  <Button 
                    variant="link" 
                    onClick={handleBackToCourses} 
                    className="p-0"
                    style={{ 
                      textDecoration: 'none',
                      color: '#6366f1',
                      fontSize: '16px',
                      fontWeight: '500',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    ← Back
                  </Button>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '24px', 
                      fontWeight: '700', 
                      color: '#1e293b',
                      marginBottom: '4px'
                    }}>
                      {selectedCourse.courseName}
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                      {selectedCourse.subject} • Grade {selectedCourse.grade}
                    </p>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
              <Card style={{ 
                border: 'none',
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                background: 'white',
                marginBottom: '24px'
              }}>
                <Card.Body style={{ padding: '0' }}>
                  <Nav variant="tabs" style={{ 
                    borderBottom: '1px solid #e2e8f0',
                    background: 'transparent',
                    padding: '0 16px'
                  }}>
                    <Nav.Item>
                      <Nav.Link 
                        eventKey="attendance" 
                        style={{ 
                          border: 'none',
                          borderBottom: activeTab === 'attendance' ? '3px solid #6366f1' : '3px solid transparent',
                          color: activeTab === 'attendance' ? '#6366f1' : '#64748b',
                          fontWeight: activeTab === 'attendance' ? '600' : '500',
                          padding: '16px 20px',
                          fontSize: '14px',
                          transition: 'all 0.2s ease'
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
                          borderBottom: activeTab === 'lms' ? '3px solid #6366f1' : '3px solid transparent',
                          color: activeTab === 'lms' ? '#6366f1' : '#64748b',
                          fontWeight: activeTab === 'lms' ? '600' : '500',
                          padding: '16px 20px',
                          fontSize: '14px',
                          transition: 'all 0.2s ease'
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
                          borderBottom: activeTab === 'notifications' ? '3px solid #6366f1' : '3px solid transparent',
                          color: activeTab === 'notifications' ? '#6366f1' : '#64748b',
                          fontWeight: activeTab === 'notifications' ? '600' : '500',
                          padding: '16px 20px',
                          fontSize: '14px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        🔔 Notifications
                        {courseNotifications.length > 0 && (
                          <Badge style={{ 
                            background: '#ef4444',
                            color: 'white',
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            marginLeft: '6px',
                            fontWeight: '600'
                          }}>
                            {courseNotifications.length}
                          </Badge>
                        )}
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                </Card.Body>
              </Card>

              <Tab.Content>
                <Tab.Pane eventKey="attendance">
                  <Card style={{ 
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    background: 'white'
                  }}>
                    <Card.Body style={{ padding: '24px' }}>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 style={{ 
                          margin: 0, 
                          fontSize: '20px', 
                          fontWeight: '700', 
                          color: '#1e293b' 
                        }}>
                          Attendance Records
                        </h2>
                        <Badge style={{ 
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          border: 'none'
                        }}>
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
                          <Table responsive hover style={{ margin: 0 }}>
                            <thead>
                              <tr style={{ 
                                background: '#f8fafc',
                                borderBottom: '2px solid #e2e8f0'
                              }}>
                                <th style={{ 
                                  padding: '12px 16px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#64748b',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  border: 'none',
                                  textAlign: 'left'
                                }}>#</th>
                                <th style={{ 
                                  padding: '12px 16px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#64748b',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  border: 'none',
                                  textAlign: 'left'
                                }}>Date</th>
                                <th style={{ 
                                  padding: '12px 16px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#64748b',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  border: 'none',
                                  textAlign: 'left'
                                }}>Day</th>
                                <th style={{ 
                                  padding: '12px 16px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#64748b',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  border: 'none',
                                  textAlign: 'center'
                                }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendance.map((record, index) => {
                                const date = new Date(record.date);
                                const isPresent = record.status === 'Present' || record.status === 'present';
                                return (
                                  <tr key={record.id} style={{ 
                                    borderBottom: '1px solid #e2e8f0',
                                    transition: 'background 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f8fafc';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                  }}>
                                    <td style={{ 
                                      padding: '16px',
                                      color: '#64748b',
                                      textAlign: 'left',
                                      border: 'none'
                                    }}>
                                      {index + 1}
                                    </td>
                                    <td style={{ 
                                      padding: '16px',
                                      color: '#1e293b',
                                      fontWeight: '500',
                                      textAlign: 'left',
                                      border: 'none'
                                    }}>
                                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td style={{ 
                                      padding: '16px',
                                      color: '#64748b',
                                      textAlign: 'left',
                                      border: 'none'
                                    }}>
                                      {date.toLocaleDateString('en-US', { weekday: 'long' })}
                                    </td>
                                    <td style={{ 
                                      padding: '16px',
                                      textAlign: 'center',
                                      border: 'none'
                                    }}>
                                      <Badge style={{ 
                                        background: isPresent 
                                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                          : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        border: 'none'
                                      }}>
                                        {isPresent ? '✓ Present' : '✗ Absent'}
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
                  <Card style={{ 
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    background: 'white'
                  }}>
                    <Card.Body style={{ padding: '24px' }}>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 style={{ 
                          margin: 0, 
                          fontSize: '20px', 
                          fontWeight: '700', 
                          color: '#1e293b' 
                        }}>
                          Learning Materials
                        </h2>
                        <Badge style={{ 
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          border: 'none'
                        }}>
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
                              border: '1px solid #e2e8f0',
                              borderRadius: '16px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                              transition: 'all 0.3s ease',
                              cursor: 'pointer',
                              background: 'white'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.15)';
                              e.currentTarget.style.borderColor = '#6366f1';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                              e.currentTarget.style.borderColor = '#e2e8f0';
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
                    </Card.Body>
                  </Card>
                </Tab.Pane>

                <Tab.Pane eventKey="notifications">
                  <Card style={{ 
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    background: 'white'
                  }}>
                    <Card.Body style={{ padding: '24px', textAlign: 'left' }}>
                      <div className="d-flex justify-content-between align-items-center mb-4" style={{ textAlign: 'left' }}>
                        <h2 style={{ 
                          margin: 0, 
                          fontSize: '20px', 
                          fontWeight: '700', 
                          color: '#1e293b',
                          textAlign: 'left'
                        }}>
                          Notifications
                        </h2>
                        <Badge style={{ 
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          border: 'none'
                        }}>
                          {courseNotifications.length}
                        </Badge>
                      </div>
                      {courseNotifications.length === 0 ? (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '60px 20px',
                          color: '#94a3b8'
                        }}>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
                          <p style={{ margin: 0, fontSize: '16px' }}>No notifications for this course.</p>
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-3" style={{ textAlign: 'left' }}>
                          {courseNotifications.map((notification) => (
                            <Card 
                              key={notification.id}
                              style={{ 
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: 0,
                                margin: 0,
                                background: getNotificationColor(notification.type) === 'primary' ? '#eff6ff' :
                                          getNotificationColor(notification.type) === 'success' ? '#f0fdf4' :
                                          getNotificationColor(notification.type) === 'info' ? '#f0f9ff' : '#f8fafc',
                                transition: 'all 0.2s ease',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <Card.Body style={{ padding: '16px 20px', textAlign: 'left' }}>
                                <div className="d-flex align-items-start gap-3" style={{ textAlign: 'left' }}>
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: getNotificationColor(notification.type) === 'primary' ? '#dbeafe' :
                                              getNotificationColor(notification.type) === 'success' ? '#dcfce7' :
                                              getNotificationColor(notification.type) === 'info' ? '#cffafe' : '#f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    flexShrink: 0
                                  }}>
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                  <div className="flex-grow-1" style={{ textAlign: 'left' }}>
                                    <h6 style={{ 
                                      margin: '0 0 6px 0',
                                      fontSize: '15px',
                                      fontWeight: '600',
                                      color: '#1e293b',
                                      textAlign: 'left'
                                    }}>
                                      {notification.title}
                                    </h6>
                                    <p style={{ 
                                      margin: '0 0 8px 0',
                                      fontSize: '14px',
                                      color: '#64748b',
                                      lineHeight: '1.5',
                                      textAlign: 'left'
                                    }}>
                                      {notification.message}
                                    </p>
                                    <small style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'left', display: 'block' }}>
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
                              </Card.Body>
                            </Card>
                          ))}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </Container>
        </div>
        <StudentChatbot student={student} isOpen={chatbotOpen} onIsOpenChange={setChatbotOpen} />
      </div>
    );
  }

  // Courses List View
  return (
      <div className="student-dashboard" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <StudentTopNavbar student={student} />
      <div style={{ marginLeft: 0, padding: '24px', marginTop: '40px' }}>
        <Container fluid style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ 
            background: 'white', 
            padding: '24px', 
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '24px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  marginBottom: '4px'
                }}>
                  <img
                    src={require('../images/uni-logo.png')}
                    alt="Institute Logo"
                    style={{
                      width: '180px',
                      height: 'auto',
                      objectFit: 'contain',
                      marginTop: '20px'
                    }}
                  />
                  <div>
                    <h1 style={{ 
                      margin: 0,
                      marginTop:'10px',
                      fontSize: '28px',
                      fontWeight: '700',
                      color: '#1e293b',
                      marginBottom: '4px',
                      textAlign: 'left'
                    }}>
                      My Courses
                    </h1>
                    <p style={{ 
                      margin: 0,
                      color: '#64748b',
                      fontSize: '15px',
                      textAlign: 'left'
                    }}>
                      Welcome back, {student.fullName} 👋
                    </p>
                  </div>
                </div>
              </div>
              <Button
                className="add-operator-btn"
                onClick={() => setChatbotOpen(true)}
                style={{ whiteSpace: 'nowrap', marginTop: '25px' }}
              >
                Learn With "Institute Name" AI Teacher
              </Button>
            </div>
          </div>

          <Row className="g-4">
            {/* First Column - Student ID Card Preview */}
            <Col xs={12} lg={4}>
              {student && (
                <Card style={{ 
                  border: 'none',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  background: 'white',
                  position: 'sticky',
                  top: '70px'
                }}>
                  <Card.Body style={{ padding: '20px' }}>
                    <div style={{
                      width: '100%',
                      aspectRatio: '2/3',
                      background: 'white',
                      borderRadius: '12px',
                      padding: '0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      {/* Template Background Image */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `url(/id-card-template.jpg)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        zIndex: 0
                      }}></div>

                      {/* Content Overlay */}
                      <div style={{ position: 'relative', zIndex: 1, padding: '16px', paddingTop: '0' }}>
                        {/* Student Image */}
                        <div style={{
                          textAlign: 'left',
                          marginBottom: '16px',
                          marginTop: '97px'
                        }}>
                          <div style={{
                            width: '210px',
                            height: '210px',
                            borderRadius: '34px',
                            overflow: 'hidden',
                            margin: '0',
                            marginLeft: '12px',
                            background: '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {student.imageUrl ? (
                              <img
                                src={`${API_URL}${student.imageUrl}`}
                                alt={student.fullName}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div style={{
                              display: student.imageUrl ? 'none' : 'flex',
                              width: '100%',
                              height: '100%',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                              color: 'white',
                              fontSize: '40px',
                              fontWeight: 'bold'
                            }}>
                              {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S'}
                            </div>
                          </div>
                        </div>

                        {/* Student Name */}
                        <div style={{
                          textAlign: 'left',
                          marginBottom: '12px'
                        }}>
                          <h3 style={{
                            margin: 0,
                            marginLeft: '8px',
                            marginTop: '8px',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#237ac6',
                            lineHeight: '1.2'
                          }}>
                            {student.fullName}
                          </h3>
                          {/* Student ID */}
                          <div style={{}}>
                            <p style={{
                              margin: '0',
                              fontSize: '13px',
                              marginLeft: '8px',
                              borderRadius: '100px',
                              color: '#000',
                              fontWeight: '500',
                              display: 'inline-block',
                              marginTop: '8px'
                            }}>
                              Grade {student.grade}
                            </p>
                          </div>
                          <div style={{}}>
                            <p style={{
                              margin: '0',
                              fontSize: '13px',
                              marginLeft: '8px',
                              borderRadius: '100px',
                              color: '#000',
                              fontWeight: '500',
                              display: 'inline-block',
                            }}>
                              Student ID : {student.id}
                            </p>
                          </div>
                        </div>

                        {/* QR Code */}
                        <div style={{
                          textAlign: 'left',
                          marginTop: '30px',
                          marginLeft: '14px'
                        }}>
                          <div style={{
                            display: 'inline-block',
                            background: 'transparent'
                          }}>
                            <QRCodeSVG
                              value={student.id}
                              size={100}
                              level="H"
                              includeMargin={true}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </Col>

            {/* Second and Third Columns - Courses (Horizontal Scroll) */}
            <Col xs={12} lg={8}>
              <Card style={{ 
                border: 'none',
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                background: 'white'
              }}>
                <Card.Body style={{ padding: '20px', textAlign: 'left' }}>
                  <h2 style={{ 
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1e293b',
                    textAlign: 'left',
                    marginBottom: '4px'
                  }}>
                    My Courses
                  </h2>
                  <p style={{ 
                    margin: '0 0 20px 0',
                    color: '#64748b',
                    fontSize: '14px',
                    textAlign: 'left'
                  }}>
                    {courses.length} {courses.length === 1 ? 'course' : 'courses'} enrolled
                  </p>
                  
                  {courses.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '60px 20px',
                      color: '#94a3b8'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
                      <p style={{ margin: 0, fontSize: '16px' }}>You are not enrolled in any courses yet.</p>
                    </div>
                  ) : (
                    <div 
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '20px',
                        maxWidth: '100%'
                      }}
                    >
                      {courses.slice(0, 4).map((course, index) => {
                        // Light background colors array
                        const lightColors = [
                          '#fef3f2', // Light red
                          '#f0fdf4', // Light green
                          '#eff6ff', // Light blue
                          '#faf5ff', // Light purple
                          '#fffbeb', // Light yellow
                          '#f0f9ff', // Light cyan
                          '#fdf2f8', // Light pink
                          '#f5f3ff'  // Light indigo
                        ];
                        
                        // Matching subject badge colors
                        const badgeColors = [
                          { bg: '#fee2e2', text: 'white' }, // Red
                          { bg: '#dcfce7', text: 'white' }, // Green
                          { bg: '#dbeafe', text: 'white' }, // Blue
                          { bg: '#f3e8ff', text: 'white' }, // Purple
                          { bg: '#fef3c7', text: 'white' }, // Yellow
                          { bg: '#cffafe', text: 'white' }, // Cyan
                          { bg: '#fce7f3', text: 'white' }, // Pink
                          { bg: '#ede9fe', text: 'white' }  // Indigo
                        ];
                        
                        const cardColor = lightColors[index % lightColors.length];
                        const badgeColor = badgeColors[index % badgeColors.length];
                        
                        return (
                        <div key={course.id} style={{ width: '100%' }}>
                  <Card 
                    className="h-100" 
                    style={{ 
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: cardColor,
                      overflow: 'hidden'
                    }}
                    onClick={() => handleViewCourse(course)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Card.Body className="d-flex flex-column" style={{ padding: '24px' }}>
                      {/* Subject Badge */}
                      <div style={{ marginBottom: '12px' }}>
                        <Badge style={{ 
                          background: badgeColor.bg,
                          color: badgeColor.text,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          border: 'none'
                        }}>
                          {course.subject}
                        </Badge>
                      </div>

                      {/* Course Name */}
                      <h5 style={{ 
                        margin: '0 0 16px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1e293b',
                        lineHeight: '1.4'
                      }}>
                        {course.courseName}
                      </h5>

                      {/* Spacer */}
                      <div style={{ flex: 1 }}></div>
                      
                      {/* Action Button */}
                      <Button 
                        variant="outline-primary"
                        className="w-100"
                        style={{ 
                          background: 'transparent',
                          border: '1px solid #6366f1',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontWeight: '500',
                          fontSize: '13px',
                          color: '#6366f1',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewCourse(course);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#6366f1';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#6366f1';
                        }}
                      >
                        View Details
                      </Button>
                    </Card.Body>
                  </Card>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Payments Section */}
              <Card style={{ 
                border: 'none',
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                background: 'white',
                marginTop: '20px'
              }}>
                <Card.Body style={{ padding: '24px' }}>
                  <h2 style={{ 
                    margin: '0 0 20px 0',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1e293b',
                    textAlign: 'left'
                  }}>
                    Payments
                  </h2>
                  
                  {payments.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px',
                      color: '#94a3b8'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
                      <p style={{ margin: 0, fontSize: '16px' }}>No payment records found.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <Table responsive hover style={{ margin: 0 }}>
                        <thead>
                          <tr style={{ 
                            background: '#f8fafc',
                            borderBottom: '2px solid #e2e8f0'
                          }}>
                            <th style={{ 
                              padding: '12px 16px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              border: 'none'
                            }}>Date</th>
                            <th style={{ 
                              padding: '12px 16px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              border: 'none'
                            }}>Course</th>
                            <th style={{ 
                              padding: '12px 16px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              border: 'none'
                            }}>Month</th>
                            <th style={{ 
                              padding: '12px 16px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              border: 'none',
                              textAlign: 'right'
                            }}>Amount</th>
                            <th style={{ 
                              padding: '12px 16px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              border: 'none',
                              textAlign: 'center'
                            }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment) => {
                            const [year, month] = payment.monthKey ? payment.monthKey.split('-') : ['', ''];
                            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                              'July', 'August', 'September', 'October', 'November', 'December'];
                            const monthName = month ? monthNames[parseInt(month) - 1] : '-';
                            const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : null;
                            const formattedDate = paymentDate ? paymentDate.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            }) : '-';
                            
                            // Find course name
                            const course = courses.find(c => c.id === payment.courseId);
                            const courseName = course ? course.courseName : (payment.courseName || 'General Payment');
                            
                            return (
                              <tr key={payment.id} style={{ 
                                borderBottom: '1px solid #e2e8f0',
                                transition: 'background 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                              }}>
                                <td style={{ 
                                  padding: '16px',
                                  fontSize: '14px',
                                  color: '#1e293b',
                                  fontWeight: '500',
                                  border: 'none'
                                }}>
                                  {formattedDate}
                                </td>
                                <td style={{ 
                                  padding: '16px',
                                  fontSize: '14px',
                                  color: '#1e293b',
                                  fontWeight: '500',
                                  border: 'none'
                                }}>
                                  {courseName}
                                </td>
                                <td style={{ 
                                  padding: '16px',
                                  fontSize: '14px',
                                  color: '#64748b',
                                  border: 'none'
                                }}>
                                  {monthName} {year}
                                </td>
                                <td style={{ 
                                  padding: '16px',
                                  fontSize: '16px',
                                  color: '#1e293b',
                                  fontWeight: '700',
                                  textAlign: 'right',
                                  border: 'none'
                                }}>
                                  Rs {parseFloat(payment.amount || 0).toFixed(2)}
                                </td>
                                <td style={{ 
                                  padding: '16px',
                                  textAlign: 'center',
                                  border: 'none'
                                }}>
                                  <Badge style={{ 
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    border: 'none'
                                  }}>
                                    {payment.status || 'Paid'}
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

              {/* Attendance Section */}
              <Card style={{ 
                border: 'none',
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                background: 'white',
                marginTop: '20px'
              }}>
                <Card.Body style={{ padding: '24px' }}>
                  <h2 style={{ 
                    margin: '0 0 20px 0',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1e293b',
                    textAlign: 'left'
                  }}>
                    Attendance
                  </h2>
                  
                  {allAttendance.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px',
                      color: '#94a3b8'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                      <p style={{ margin: 0, fontSize: '16px' }}>No attendance records found.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <Table responsive hover style={{ margin: 0 }}>
                        <thead>
                          <tr style={{ 
                            background: '#f8fafc',
                            borderBottom: '2px solid #e2e8f0'
                          }}>
                            <th style={{ 
                              padding: '12px 16px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              border: 'none'
                            }}>Date</th>
                            <th style={{ 
                              padding: '12px 16px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              border: 'none'
                            }}>Day</th>
                            <th style={{ 
                              padding: '12px 16px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              border: 'none'
                            }}>Course</th>
                            <th style={{ 
                              padding: '12px 16px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              border: 'none',
                              textAlign: 'center'
                            }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allAttendance.map((record) => {
                            const date = new Date(record.date);
                            const formattedDate = date.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            });
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                            const isPresent = record.status === 'Present' || record.status === 'present';
                            
                            return (
                              <tr key={record.id} style={{ 
                                borderBottom: '1px solid #e2e8f0',
                                transition: 'background 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                              }}>
                                <td style={{ 
                                  padding: '16px',
                                  fontSize: '14px',
                                  color: '#1e293b',
                                  fontWeight: '500',
                                  border: 'none'
                                }}>
                                  {formattedDate}
                                </td>
                                <td style={{ 
                                  padding: '16px',
                                  fontSize: '14px',
                                  color: '#64748b',
                                  border: 'none'
                                }}>
                                  {dayName}
                                </td>
                                <td style={{ 
                                  padding: '16px',
                                  fontSize: '14px',
                                  color: '#1e293b',
                                  fontWeight: '500',
                                  border: 'none'
                                }}>
                                  {record.courseName || 'N/A'}
                                </td>
                                <td style={{ 
                                  padding: '16px',
                                  textAlign: 'center',
                                  border: 'none'
                                }}>
                                  <Badge style={{ 
                                    background: isPresent 
                                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    border: 'none'
                                  }}>
                                    {record.status || 'Present'}
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

              {/* LMS Notifications Section */}
              <Card style={{ 
                border: 'none',
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                background: 'white',
                marginTop: '20px'
              }}>
                <Card.Body style={{ padding: '24px' }}>
                  <h2 style={{ 
                    margin: '0 0 20px 0',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1e293b',
                    textAlign: 'left'
                  }}>
                    LMS Updates
                  </h2>
                  
                  {(() => {
                    const lmsNotifications = notifications.filter(n => n.type === 'lms').slice(0, 4);
                    return lmsNotifications.length === 0 ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '40px 20px',
                        color: '#94a3b8'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                        <p style={{ margin: 0, fontSize: '16px' }}>No LMS updates available.</p>
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '16px'
                      }}>
                        {lmsNotifications.map((notification) => {
                          const notificationDate = new Date(notification.date);
                          const formattedDate = notificationDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                          const course = courses.find(c => c.id === notification.courseId);
                          
                          return (
                            <Card 
                              key={notification.id}
                              style={{ 
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: 'none',
                                transition: 'all 0.2s ease',
                                background: '#f8fafc',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#6366f1';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.1)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                              onClick={() => {
                                if (course) {
                                  handleViewCourse(course);
                                }
                              }}
                            >
                              <Card.Body style={{ padding: '16px' }}>
                                <div style={{ marginBottom: '12px' }}>
                                  <Badge style={{ 
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    border: 'none'
                                  }}>
                                    📚 LMS
                                  </Badge>
                                </div>
                                
                                <h6 style={{ 
                                  margin: '0 0 8px 0',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#1e293b',
                                  lineHeight: '1.4'
                                }}>
                                  {notification.title}
                                </h6>
                                
                                <p style={{ 
                                  margin: '0 0 12px 0',
                                  fontSize: '13px',
                                  color: '#64748b',
                                  lineHeight: '1.5'
                                }}>
                                  {notification.message}
                                </p>
                                
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '11px',
                                  color: '#94a3b8'
                                }}>
                                  <span>{course ? course.courseName : 'Course'}</span>
                                  <span>{formattedDate}</span>
                                </div>
                              </Card.Body>
                            </Card>
                          );
                        })}
                      </div>
                    );
                  })()}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
      <StudentChatbot student={student} isOpen={chatbotOpen} onIsOpenChange={setChatbotOpen} />
    </div>
  );
};

export default StudentDashboard;
