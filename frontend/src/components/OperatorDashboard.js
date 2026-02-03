import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineUserGroup, 
  HiOutlineAcademicCap, 
  HiOutlineBookOpen,
  HiOutlineCurrencyDollar
} from 'react-icons/hi2';
import OperatorSidebar from './OperatorSidebar';
import OperatorTopNavbar from './OperatorTopNavbar';
import Students from './Students';
import Teachers from './Teachers';
import Courses from './Courses';
import Payments from './Payments';
import Attendance from './Attendance';
import '../App.css';
import API_URL from '../config';

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const [operator, setOperator] = useState(null);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeCourses: 0,
    unpaidFees: 0,
    totalRevenue: 0
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
      const [studentsRes, teachersRes, coursesRes, paymentsRes] = await Promise.all([
        fetch(`${API_URL}/api/students`),
        fetch(`${API_URL}/api/teachers`),
        fetch(`${API_URL}/api/courses`),
        fetch(`${API_URL}/api/payments`)
      ]);

      const studentsData = await studentsRes.json();
      const teachersData = await teachersRes.json();
      const coursesData = await coursesRes.json();
      const paymentsData = await paymentsRes.json();

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

      setStats({
        totalStudents,
        totalTeachers,
        activeCourses,
        unpaidFees,
        totalRevenue
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
      <OperatorSidebar activeItem={activeItem} onItemClick={handleItemClick} className={sidebarOpen ? 'open' : ''} onLogout={handleLogout} />
      <div className="dashboard-content">
        <OperatorTopNavbar operator={operator} onMenuToggle={toggleSidebar} />
        <div className="dashboard-main">
          <Container fluid>
            {activeItem === 'students' ? (
              <Students />
            ) : activeItem === 'teachers' ? (
              <Teachers />
            ) : activeItem === 'courses' ? (
              <Courses />
            ) : activeItem === 'payments' ? (
              <Payments />
            ) : activeItem === 'attendance' ? (
              <Attendance />
            ) : (
              <>
                <div className="dashboard-header mb-4">
                  <h2 className="dashboard-title">Dashboard</h2>
                  <p className="dashboard-subtitle">Welcome back, {operator.name || operator.email}</p>
                </div>

                <Row className="g-3">
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineUserGroup />
                        </div>
                        <h3 className="stat-number">{loading ? '...' : stats.totalStudents}</h3>
                        <p className="stat-label">Total Students</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineAcademicCap />
                        </div>
                        <h3 className="stat-number">{loading ? '...' : stats.totalTeachers}</h3>
                        <p className="stat-label">Total Teachers</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineBookOpen />
                        </div>
                        <h3 className="stat-number">{loading ? '...' : stats.activeCourses}</h3>
                        <p className="stat-label">Active Courses</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineCurrencyDollar />
                        </div>
                        <h3 className="stat-number">{loading ? '...' : stats.unpaidFees}</h3>
                        <p className="stat-label">No. of Class Fees to be Paid</p>
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

