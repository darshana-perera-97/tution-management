import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineUserGroup, 
  HiOutlineAcademicCap, 
  HiOutlineBookOpen,
  HiOutlineCurrencyDollar,
  HiOutlineClipboardDocumentCheck
} from 'react-icons/hi2';
import OperatorSidebar from './OperatorSidebar';
import OperatorTopNavbar from './OperatorTopNavbar';
import Students from './Students';
import Teachers from './Teachers';
import Courses from './Courses';
import Payments from './Payments';
import Attendance from './Attendance';
import OnlineCourses from './OnlineCourses';
import DailyReport from './DailyReport';
import '../App.css';
import API_URL from '../config';

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const [operator, setOperator] = useState(null);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeCourses: 0,
    unpaidFees: 0,
    totalRevenue: 0,
    attendancePercentage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isOperatorAuthenticated');
    const operatorData = localStorage.getItem('operator');
    
    if (!isAuthenticated || !operatorData) {
      navigate('/operator/login');
    } else {
      setOperator(JSON.parse(operatorData));
      fetchDashboardStats();
    }
  }, [navigate]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [studentsRes, teachersRes, coursesRes, paymentsRes, attendanceRes] = await Promise.all([
        fetch(`${API_URL}/api/students`),
        fetch(`${API_URL}/api/teachers`),
        fetch(`${API_URL}/api/courses`),
        fetch(`${API_URL}/api/payments`),
        fetch(`${API_URL}/api/attendance`)
      ]);

      const studentsData = await studentsRes.json();
      const teachersData = await teachersRes.json();
      const coursesData = await coursesRes.json();
      const paymentsData = await paymentsRes.json();
      const attendanceData = await attendanceRes.json();

      // Calculate stats
      const totalStudents = studentsData.success ? studentsData.students.length : 0;
      const totalTeachers = teachersData.success ? teachersData.teachers.length : 0;
      const activeCourses = coursesData.success ? coursesData.courses.length : 0;
      
      // Calculate total revenue from paid payments
      const totalRevenue = paymentsData.success 
        ? paymentsData.payments
            .filter(p => p.status === 'Paid')
            .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0)
        : 0;

      // Calculate number of unpaid class fees
      let unpaidFees = 0;
      if (studentsData.success && coursesData.success) {
        const students = studentsData.students;
        const courses = coursesData.courses;
        const currentDate = new Date();
        const allPayments = paymentsData.success ? paymentsData.payments : [];
        
        students.forEach(student => {
          const enrollmentDate = new Date(student.createdAt);
          const studentCourses = courses.filter(course => 
            course.enrolledStudents && 
            Array.isArray(course.enrolledStudents) && 
            course.enrolledStudents.includes(student.id)
          );
          
          if (studentCourses.length > 0) {
            // Calculate from enrollment month to current month
            let currentMonth = new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth(), 1);
            const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            
            while (currentMonth <= lastDayOfCurrentMonth) {
              const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
              
              studentCourses.forEach(course => {
                const courseCreatedDate = new Date(course.createdAt);
                const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;
                const lastDayOfPaymentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                
                if (enrollmentDateForCourse <= lastDayOfPaymentMonth) {
                  // Check if this course payment is paid
                  const isPaid = allPayments.some(
                    p => p.studentId === student.id && 
                         p.monthKey === monthKey && 
                         p.courseId === course.id &&
                         p.status === 'Paid'
                  );
                  
                  if (!isPaid) {
                    unpaidFees++;
                  }
                }
              });
              
              currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
            }
          }
        });
      }

      // Calculate attendance percentage for current month
      let attendancePercentage = 0;
      if (studentsData.success && coursesData.success && attendanceData.success) {
        const students = studentsData.students;
        const courses = coursesData.courses;
        const allAttendance = attendanceData.attendance || [];
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Get all enrolled students
        const enrolledStudents = students.filter(student => {
          return courses.some(course => 
            course.enrolledStudents && 
            Array.isArray(course.enrolledStudents) && 
            course.enrolledStudents.includes(student.id)
          );
        });
        
        if (enrolledStudents.length > 0) {
          // Get attendance records for current month
          const currentMonthAttendance = allAttendance.filter(att => {
            const attDate = new Date(att.date);
            return attDate.getMonth() === currentMonth && attDate.getFullYear() === currentYear;
          });
          
          // Count unique students who attended this month
          const uniqueStudentsAttended = new Set(currentMonthAttendance.map(att => att.studentId)).size;
          
          // Calculate percentage
          attendancePercentage = enrolledStudents.length > 0 
            ? (uniqueStudentsAttended / enrolledStudents.length) * 100 
            : 0;
        }
      }

      setStats({
        totalStudents,
        totalTeachers,
        activeCourses,
        unpaidFees,
        totalRevenue,
        attendancePercentage
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (itemId) => {
    setActiveItem(itemId);
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 992) {
      setSidebarOpen(false);
    }
    // Refresh stats when returning to dashboard
    if (itemId === 'dashboard') {
      fetchDashboardStats();
    }
  };

  // Refresh stats when activeItem changes to dashboard
  useEffect(() => {
    if (activeItem === 'dashboard' && operator) {
      fetchDashboardStats();
    }
  }, [activeItem, operator]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleLogout = () => {
    localStorage.removeItem('operator');
    localStorage.removeItem('isOperatorAuthenticated');
    navigate('/operator/login');
  };

  if (!operator) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      ></div>
      <OperatorSidebar 
        activeItem={activeItem} 
        onItemClick={handleItemClick} 
        className={sidebarOpen ? 'open' : ''} 
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div className={`dashboard-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <OperatorTopNavbar operator={operator} onMenuToggle={toggleSidebar} />
        <div className="dashboard-main">
          <Container fluid>
            {activeItem === 'students' ? (
              <Students />
            ) : activeItem === 'teachers' ? (
              <Teachers />
            ) : activeItem === 'courses' ? (
              <Courses />
            ) : activeItem === 'online-courses' ? (
              <OnlineCourses />
            ) : activeItem === 'payments' ? (
              <Payments />
            ) : activeItem === 'attendance' ? (
              <Attendance />
            ) : activeItem === 'daily-report' ? (
              <DailyReport />
            ) : (
              <>
                <div className="dashboard-header mb-4">
                  <h2 className="dashboard-title">Dashboard</h2>
                  <p className="dashboard-subtitle">Welcome back, {operator.name || operator.email}</p>
                </div>

                <Row className="g-3">
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100" style={{
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}>
                      <Card.Body style={{ padding: '24px' }}>
                        <div className="stat-icon" style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '12px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '16px'
                        }}>
                          <HiOutlineUserGroup style={{ fontSize: '28px', color: '#3b82f6' }} />
                        </div>
                        <h3 className="stat-number" style={{ color: '#0f172a', marginBottom: '8px' }}>{loading ? '...' : stats.totalStudents}</h3>
                        <p className="stat-label" style={{ color: '#64748b', margin: 0 }}>Total Students</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100" style={{
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}>
                      <Card.Body style={{ padding: '24px' }}>
                        <div className="stat-icon" style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '16px'
                        }}>
                          <HiOutlineAcademicCap style={{ fontSize: '28px', color: '#10b981' }} />
                        </div>
                        <h3 className="stat-number" style={{ color: '#0f172a', marginBottom: '8px' }}>{loading ? '...' : stats.totalTeachers}</h3>
                        <p className="stat-label" style={{ color: '#64748b', margin: 0 }}>Total Teachers</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100" style={{
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}>
                      <Card.Body style={{ padding: '24px' }}>
                        <div className="stat-icon" style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '12px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '16px'
                        }}>
                          <HiOutlineBookOpen style={{ fontSize: '28px', color: '#8b5cf6' }} />
                        </div>
                        <h3 className="stat-number" style={{ color: '#0f172a', marginBottom: '8px' }}>{loading ? '...' : stats.activeCourses}</h3>
                        <p className="stat-label" style={{ color: '#64748b', margin: 0 }}>Active Courses</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100" style={{
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}>
                      <Card.Body style={{ padding: '24px' }}>
                        <div className="stat-icon" style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '12px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '16px'
                        }}>
                          <HiOutlineCurrencyDollar style={{ fontSize: '28px', color: '#f59e0b' }} />
                        </div>
                        <h3 className="stat-number" style={{ color: '#0f172a', marginBottom: '8px' }}>{loading ? '...' : stats.unpaidFees}</h3>
                        <p className="stat-label" style={{ color: '#64748b', margin: 0 }}>No. of Class Fees to be Paid</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100" style={{
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}>
                      <Card.Body style={{ padding: '24px' }}>
                        <div className="stat-icon" style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '12px',
                          background: 'rgba(168, 85, 247, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '16px'
                        }}>
                          <HiOutlineClipboardDocumentCheck style={{ fontSize: '28px', color: '#a855f7' }} />
                        </div>
                        <h3 className="stat-number" style={{ color: '#0f172a', marginBottom: '8px' }}>
                          {loading ? '...' : `${stats.attendancePercentage.toFixed(1)}%`}
                        </h3>
                        <p className="stat-label" style={{ color: '#64748b', margin: 0 }}>Students Attendance (This Month)</p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </Container>
        </div>
      </div>
    </div>
  );
};

export default OperatorDashboard;

