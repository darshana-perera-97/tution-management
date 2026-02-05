import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineUserGroup, 
  HiOutlineAcademicCap, 
  HiOutlineBookOpen, 
  HiOutlineCurrencyDollar 
} from 'react-icons/hi2';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import Operators from './Operators';
import Teachers from './Teachers';
import Courses from './Courses';
import AdminStudents from './AdminStudents';
import Payments from './Payments';
import Attendance from './Attendance';
import Reports from './Reports';
import WhatsAppLink from './WhatsAppLink';
import '../App.css';
import API_URL from '../config';

const Dashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeCourses: 0,
    unpaidFees: 0,
    totalRevenue: 0,
    totalIncome: 0,
    instituteIncome: 0,
    remainingTeacherPayments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const adminData = localStorage.getItem('admin');
    
    if (!isAuthenticated || !adminData) {
      navigate('/admin/login');
    } else {
      setAdmin(JSON.parse(adminData));
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
      const paidPayments = paymentsData.success 
        ? paymentsData.payments.filter(p => p.status === 'Paid')
        : [];
      
      const totalRevenue = paidPayments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

      // Calculate teacher payments and institute income
      let totalTeacherPayments = 0;
      if (coursesData.success && paidPayments.length > 0) {
        const courses = coursesData.courses;
        
        paidPayments.forEach(payment => {
          if (payment.courseId) {
            // Course-specific payment
            const course = courses.find(c => c.id === payment.courseId);
            if (course && course.teacherPaymentPercentage) {
              const paymentAmount = parseFloat(payment.amount || 0);
              const teacherPercentage = parseFloat(course.teacherPaymentPercentage) || 0;
              const teacherPayment = (paymentAmount * teacherPercentage) / 100;
              totalTeacherPayments += teacherPayment;
            }
          } else {
            // Old format - payment for all courses in a month
            // Find the course by matching student and month (this is approximate)
            // For more accuracy, we'd need to know which courses were paid
            // For now, we'll calculate based on average or skip these
            // This handles backward compatibility
          }
        });
      }
      
      const instituteIncome = totalRevenue - totalTeacherPayments;
      
      // Calculate remaining amount to be paid for teachers
      // This is the total teacher payments that should be made from collected revenue
      const remainingTeacherPayments = totalTeacherPayments;

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

      // Calculate total income (expected income from all enrolled students)
      let totalIncome = 0;
      if (studentsData.success && coursesData.success) {
        const students = studentsData.students;
        const courses = coursesData.courses;
        const currentDate = new Date();
        
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
              studentCourses.forEach(course => {
                const courseCreatedDate = new Date(course.createdAt);
                const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;
                const lastDayOfPaymentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                
                if (enrollmentDateForCourse <= lastDayOfPaymentMonth) {
                  const courseFee = parseFloat(course.courseFee) || 0;
                  totalIncome += courseFee;
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
        totalRevenue,
        totalIncome,
        instituteIncome,
        remainingTeacherPayments
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
    if (activeItem === 'dashboard' && admin) {
      fetchDashboardStats();
    }
  }, [activeItem, admin]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin');
    localStorage.removeItem('isAuthenticated');
    navigate('/admin/login');
  };

  if (!admin) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      ></div>
      <Sidebar activeItem={activeItem} onItemClick={handleItemClick} className={sidebarOpen ? 'open' : ''} onLogout={handleLogout} />
      <div className="dashboard-content">
        <TopNavbar admin={admin} onMenuToggle={toggleSidebar} />
        <div className="dashboard-main">
          <Container fluid>
            {activeItem === 'students' ? (
              <AdminStudents />
            ) : activeItem === 'operators' ? (
              <Operators />
            ) : activeItem === 'teachers' ? (
              <Teachers />
            ) : activeItem === 'courses' ? (
              <Courses />
            ) : activeItem === 'payments' ? (
              <Payments />
            ) : activeItem === 'attendance' ? (
              <Attendance />
            ) : activeItem === 'reports' ? (
              <Reports />
            ) : activeItem === 'whatsapp-link' ? (
              <WhatsAppLink />
            ) : (
              <>
                <div className="dashboard-header mb-4">
                  <h2 className="dashboard-title">
                    {activeItem.charAt(0).toUpperCase() + activeItem.slice(1)}
                  </h2>
                  <p className="dashboard-subtitle">Welcome back, {admin.name || admin.email}</p>
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
                <Row className="mt-3">
                  <Col md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineCurrencyDollar />
                        </div>
                        <h3 className="stat-number">
                          {loading ? '...' : `Rs. ${stats.totalRevenue.toFixed(2)}`}
                        </h3>
                        <p className="stat-label">Total Revenue</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineCurrencyDollar />
                        </div>
                        <h3 className="stat-number">
                          {loading ? '...' : `Rs. ${stats.totalIncome.toFixed(2)}`}
                        </h3>
                        <p className="stat-label">Total Income</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineCurrencyDollar />
                        </div>
                        <h3 className="stat-number">
                          {loading ? '...' : `Rs. ${stats.instituteIncome.toFixed(2)}`}
                        </h3>
                        <p className="stat-label">Institute Income</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineCurrencyDollar />
                        </div>
                        <h3 className="stat-number">
                          {loading ? '...' : `Rs. ${stats.remainingTeacherPayments.toFixed(2)}`}
                        </h3>
                        <p className="stat-label">Remaining Amount to be Paid for Teachers</p>
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

export default Dashboard;

