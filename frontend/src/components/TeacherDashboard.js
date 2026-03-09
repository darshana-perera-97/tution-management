import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Card, Table, Alert, Button, Nav, Tab, Form, Spinner, OverlayTrigger, Tooltip, Modal, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineBookOpen, 
  HiOutlineUserGroup, 
  HiOutlineCurrencyDollar,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCog6Tooth,
  HiOutlineMagnifyingGlass,
  HiOutlineUser,
  HiOutlineAcademicCap,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineIdentification,
  HiOutlineArrowTrendingDown,
  HiOutlineEye,
  HiOutlineArrowTrendingUp,
  HiOutlineChartBar,
  HiOutlineDocumentArrowDown,
  HiOutlineCalendar,
  HiOutlineClock
} from 'react-icons/hi2';
import TeacherSidebar from './TeacherSidebar';
import TeacherTopNavbar from './TeacherTopNavbar';
import Attendance from './Attendance';
import '../App.css';
import API_URL from '../config';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';
import jsPDF from 'jspdf';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    myCourses: 0,
    myStudents: 0,
    totalIncome: 0,
    paidIncome: 0,
    pendingIncome: 0,
    attendanceRecords: 0,
    advancePayments: 0,
    remainingAmount: 0,
    totalCollectedFees: 0,
    amountToBePaid: 0
  });
  const [myCourses, setMyCourses] = useState([]);
  const [myStudents, setMyStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [lmsContent, setLmsContent] = useState([]);
  const [uploadForm, setUploadForm] = useState({
    type: 'text',
    title: '',
    content: '',
    link: '',
    file: null
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showCourseSelectModal, setShowCourseSelectModal] = useState(false);
  const [pendingPaymentsPage, setPendingPaymentsPage] = useState(1);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isTeacherAuthenticated');
    const teacherData = localStorage.getItem('teacher');
    
    if (!isAuthenticated || !teacherData) {
      navigate('/teacher/login');
    } else {
      const teacherInfo = JSON.parse(teacherData);
      setTeacher(teacherInfo);
      fetchTeacherData(teacherInfo.id);
    }
  }, [navigate]);

  const fetchTeacherData = async (teacherId) => {
    try {
      setLoading(true);
      setError('');
      setError('');
      
      // Fetch all data in parallel
      const [coursesRes, studentsRes, attendanceRes, paymentsRes, teacherPaymentsRes] = await Promise.all([
        fetch(`${API_URL}/api/courses`),
        fetch(`${API_URL}/api/students`),
        fetch(`${API_URL}/api/attendance`),
        fetch(`${API_URL}/api/payments`),
        fetch(`${API_URL}/api/teacher-payments`)
      ]);

      // Check for HTTP errors
      if (!coursesRes.ok) throw new Error(`Failed to fetch courses: ${coursesRes.status}`);
      if (!studentsRes.ok) throw new Error(`Failed to fetch students: ${studentsRes.status}`);
      if (!attendanceRes.ok) throw new Error(`Failed to fetch attendance: ${attendanceRes.status}`);
      if (!paymentsRes.ok) throw new Error(`Failed to fetch payments: ${paymentsRes.status}`);
      if (!teacherPaymentsRes.ok) throw new Error(`Failed to fetch teacher payments: ${teacherPaymentsRes.status}`);

      const coursesData = await coursesRes.json();
      const studentsData = await studentsRes.json();
      const attendanceData = await attendanceRes.json();
      const paymentsData = await paymentsRes.json();
      const teacherPaymentsData = await teacherPaymentsRes.json();

      // Check for API errors
      if (!coursesData.success) throw new Error(coursesData.message || 'Failed to load courses');
      if (!studentsData.success) throw new Error(studentsData.message || 'Failed to load students');
      if (!attendanceData.success) throw new Error(attendanceData.message || 'Failed to load attendance');
      if (!paymentsData.success) throw new Error(paymentsData.message || 'Failed to load payments');
      if (!teacherPaymentsData.success) throw new Error(teacherPaymentsData.message || 'Failed to load teacher payments');

      // Filter courses for this teacher
      const teacherCourses = coursesData.success 
        ? coursesData.courses.filter(course => course.teacherId === teacherId)
        : [];
      
      setCourses(coursesData.success ? coursesData.courses : []);
      setMyCourses(teacherCourses);

      // Get students enrolled in teacher's courses
      const enrolledStudentIds = new Set();
      teacherCourses.forEach(course => {
        if (course.enrolledStudents && Array.isArray(course.enrolledStudents)) {
          course.enrolledStudents.forEach(studentId => enrolledStudentIds.add(studentId));
        }
      });
      
      const teacherStudents = studentsData.success
        ? studentsData.students.filter(student => enrolledStudentIds.has(student.id))
        : [];
      
      setStudents(studentsData.success ? studentsData.students : []);
      setMyStudents(teacherStudents);

      // Filter attendance for teacher's courses
      const teacherCourseIds = teacherCourses.map(c => c.id);
      const teacherAttendance = attendanceData.success
        ? attendanceData.attendance.filter(record => teacherCourseIds.includes(record.courseId))
        : [];
      
      setAttendance(teacherAttendance);

      // Calculate income
      const paidPayments = paymentsData.success 
        ? paymentsData.payments.filter(p => p.status === 'Paid' && p.courseId && teacherCourseIds.includes(p.courseId))
        : [];
      
      let totalIncome = 0;
      let paidIncome = 0;
      let totalCollectedFees = 0;
      let amountToBePaid = 0;
      
      paidPayments.forEach(payment => {
        const course = teacherCourses.find(c => c.id === payment.courseId);
        if (course && course.teacherPaymentPercentage) {
          const paymentAmount = parseFloat(payment.amount || 0);
          totalCollectedFees += paymentAmount; // Total collected fees (full course fee amount)
          const teacherPercentage = parseFloat(course.teacherPaymentPercentage) || 0;
          const teacherPayment = (paymentAmount * teacherPercentage) / 100;
          amountToBePaid += teacherPayment; // Amount to be paid to teacher from collected fees
          totalIncome += teacherPayment;
          paidIncome += teacherPayment;
        }
      });

      // Calculate pending income (expected but not paid)
      const currentDate = new Date();
      let pendingIncome = 0;
      
      teacherCourses.forEach(course => {
        const enrolledStudents = course.enrolledStudents || [];
        enrolledStudents.forEach(studentId => {
          const student = studentsData.success 
            ? studentsData.students.find(s => s.id === studentId)
            : null;
          
          if (student) {
            const enrollmentDate = new Date(student.createdAt);
            const courseCreatedDate = new Date(course.createdAt);
            const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;
            
            let currentMonth = new Date(enrollmentDateForCourse.getFullYear(), enrollmentDateForCourse.getMonth(), 1);
            const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            
            while (currentMonth <= lastDayOfCurrentMonth) {
              const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
              const lastDayOfPaymentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
              
              if (enrollmentDateForCourse <= lastDayOfPaymentMonth) {
                const isPaid = paidPayments.some(
                  p => p.studentId === studentId && 
                       p.monthKey === monthKey && 
                       p.courseId === course.id
                );
                
                if (!isPaid) {
                  const courseFee = parseFloat(course.courseFee) || 0;
                  const teacherPercentage = parseFloat(course.teacherPaymentPercentage) || 0;
                  const teacherPayment = (courseFee * teacherPercentage) / 100;
                  pendingIncome += teacherPayment;
                }
              }
              
              currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
            }
          }
        });
      });

      // Get advance payments for this teacher
      const advancePayments = teacherPaymentsData.success
        ? teacherPaymentsData.advancePayments.filter(p => p.teacherId === teacherId)
        : [];
      
      const totalAdvancePayments = advancePayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      paidIncome += totalAdvancePayments;

      // Calculate remaining amount (pending income minus advance payments)
      const remainingAmount = pendingIncome - totalAdvancePayments;

      setPayments(paidPayments);
      
      setStats({
        myCourses: teacherCourses.length,
        myStudents: teacherStudents.length,
        totalIncome: totalIncome + pendingIncome,
        paidIncome: paidIncome,
        pendingIncome: pendingIncome,
        attendanceRecords: teacherAttendance.length,
        advancePayments: totalAdvancePayments,
        remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
        totalCollectedFees: totalCollectedFees,
        amountToBePaid: amountToBePaid
      });
      setError(''); // Clear any previous errors on success
    } catch (err) {
      console.error('Error fetching teacher data:', err);
      const errorMessage = err.message || 'Failed to load data. Please check your connection and try again.';
      setError(errorMessage);
      // Set empty arrays on error to prevent crashes
      setMyCourses([]);
      setMyStudents([]);
      setAttendance([]);
      setPayments([]);
      setStats({
        myCourses: 0,
        myStudents: 0,
        totalIncome: 0,
        paidIncome: 0,
        pendingIncome: 0,
        attendanceRecords: 0,
        advancePayments: 0,
        remainingAmount: 0,
        totalCollectedFees: 0,
        amountToBePaid: 0
      });
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
    // Refresh data when returning to dashboard
    if (itemId === 'dashboard' && teacher) {
      fetchTeacherData(teacher.id);
    }
  };

  // Refresh stats when activeItem changes to dashboard
  useEffect(() => {
    if (activeItem === 'dashboard' && teacher) {
      fetchTeacherData(teacher.id);
    }
  }, [activeItem, teacher]);

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
    localStorage.removeItem('teacher');
    localStorage.removeItem('isTeacherAuthenticated');
    navigate('/teacher/login');
  };

  // Pagination for my courses
  const {
    currentPage: coursesPage,
    totalPages: coursesTotalPages,
    paginatedData: paginatedCourses,
    goToPage: goToCoursesPage,
    nextPage: nextCoursesPage,
    prevPage: prevCoursesPage,
    startIndex: coursesStartIndex,
    endIndex: coursesEndIndex,
    totalItems: coursesTotalItems
  } = usePagination(myCourses, {
    itemsPerPageDesktop: 10,
    itemsPerPageMobile: 5
  });

  // Get student courses helper
  const getStudentCourses = (studentId) => {
    return courses.filter(course =>
      course.enrolledStudents && 
      Array.isArray(course.enrolledStudents) && 
      course.enrolledStudents.includes(studentId)
    );
  };

  // Filter students based on search query (name, Student ID, grade)
  const filteredMyStudents = myStudents.filter(student => {
    if (!studentSearchQuery.trim()) return true;
    
    const query = studentSearchQuery.toLowerCase().trim();
    
    // Search by name
    const nameMatch = student.fullName?.toLowerCase().includes(query);
    
    // Search by Student ID
    const idMatch = student.id?.toLowerCase().includes(query) || 
                   student.id?.toString().includes(query);
    
    // Search by grade
    const gradeMatch = student.grade?.toLowerCase().includes(query);
    
    return nameMatch || idMatch || gradeMatch;
  });

  // Pagination for my students
  const {
    currentPage: studentsPage,
    totalPages: studentsTotalPages,
    paginatedData: paginatedStudents,
    goToPage: goToStudentsPage,
    nextPage: nextStudentsPage,
    prevPage: prevStudentsPage,
    startIndex: studentsStartIndex,
    endIndex: studentsEndIndex,
    totalItems: studentsTotalItems
  } = usePagination(filteredMyStudents, {
    itemsPerPageDesktop: 10,
    itemsPerPageMobile: 5
  });

  if (!teacher) {
    return null;
  }

  const handleViewCourse = async (course) => {
    setSelectedCourse(course);
    setShowCourseDetails(true);
    setActiveTab('details');
    // Fetch LMS content for this course
    await fetchLmsContent(course.id);
  };

  const handleBackToCourses = () => {
    setShowCourseDetails(false);
    setSelectedCourse(null);
    setLmsContent([]);
    setActiveTab('details');
  };

  const fetchLmsContent = async (courseId) => {
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

  const handleUploadFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setUploadForm({
        ...uploadForm,
        file: files[0] || null
      });
    } else {
      setUploadForm({
        ...uploadForm,
        [name]: value
      });
    }
    setUploadError('');
    setUploadSuccess('');
  };

  const handleUploadContent = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');
    setUploadLoading(true);

    try {
      const formData = new FormData();
      formData.append('courseId', selectedCourse.id);
      formData.append('type', uploadForm.type);
      formData.append('title', uploadForm.title);

      if (uploadForm.type === 'text') {
        formData.append('content', uploadForm.content);
      } else if (uploadForm.type === 'link') {
        formData.append('link', uploadForm.link);
      } else if (uploadForm.type === 'image' || uploadForm.type === 'pdf') {
        if (!uploadForm.file) {
          setUploadError('Please select a file to upload');
          setUploadLoading(false);
          return;
        }
        formData.append('file', uploadForm.file);
      }

      const response = await fetch(`${API_URL}/api/courses/${selectedCourse.id}/lms`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setUploadSuccess('Content uploaded successfully!');
        setUploadForm({
          type: 'text',
          title: '',
          content: '',
          link: '',
          file: null
        });
        // Reset file input
        const fileInput = document.getElementById('lms-file-input');
        if (fileInput) fileInput.value = '';
        await fetchLmsContent(selectedCourse.id);
        setTimeout(() => {
          setUploadSuccess('');
        }, 3000);
      } else {
        setUploadError(data.message || 'Failed to upload content');
      }
    } catch (err) {
      console.error('Error uploading content:', err);
      setUploadError('Unable to upload content. Please try again later.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteLmsContent = async (contentId) => {
    if (!window.confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/courses/${selectedCourse.id}/lms/${contentId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setUploadSuccess('Content deleted successfully!');
        await fetchLmsContent(selectedCourse.id);
        setTimeout(() => setUploadSuccess(''), 3000);
      } else {
        setUploadError(data.message || 'Failed to delete content');
      }
    } catch (err) {
      console.error('Error deleting content:', err);
      setUploadError('Unable to delete content. Please try again later.');
    }
  };

  const getCourseStudents = () => {
    if (!selectedCourse || !selectedCourse.enrolledStudents) return [];
    return students.filter(student => selectedCourse.enrolledStudents.includes(student.id));
  };

  const renderMyCourses = () => {
    // Show full-screen course details if a course is selected
    if (showCourseDetails && selectedCourse) {
      return (
        <div>
          <div className="operators-header mb-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <Button
                  variant="outline-secondary"
                  onClick={handleBackToCourses}
                  className="mb-3"
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    fontWeight: '500',
                    padding: '8px 16px'
                  }}
                >
                  ← Back to Courses
                </Button>
                <h2 className="dashboard-title" style={{ marginTop: '8px' }}>
                  {selectedCourse.courseName}
                </h2>
                <p className="dashboard-subtitle">
                  Grade {selectedCourse.grade} {selectedCourse.subject || 'Course'}
                </p>
              </div>
            </div>
          </div>

          <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'details')}>
            <Nav variant="tabs" className="mb-4" style={{
              borderBottom: '2px solid #e2e8f0'
            }}>
              <Nav.Item>
                <Nav.Link 
                  eventKey="details"
                  style={{
                    color: activeTab === 'details' ? '#3b82f6' : '#64748b',
                    fontWeight: activeTab === 'details' ? '600' : '400',
                    borderBottom: activeTab === 'details' ? '2px solid #3b82f6' : 'none',
                    marginBottom: '-2px',
                    padding: '12px 20px'
                  }}
                >
                  Course Details & Students
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  eventKey="lms"
                  style={{
                    color: activeTab === 'lms' ? '#3b82f6' : '#64748b',
                    fontWeight: activeTab === 'lms' ? '600' : '400',
                    borderBottom: activeTab === 'lms' ? '2px solid #3b82f6' : 'none',
                    marginBottom: '-2px',
                    padding: '12px 20px'
                  }}
                >
                  LMS - Learning Materials
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content>
              <Tab.Pane eventKey="details">
                <Card style={{
                  border: 'none',
                  borderRadius: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                  <Card.Body style={{ padding: '24px', textAlign: 'left' }}>
                    <div className="mb-4" style={{ textAlign: 'left' }}>
                      <Row>
                        <Col md={6} style={{ textAlign: 'left' }}>
                          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                            <div style={{ 
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '6px',
                              textAlign: 'left'
                            }}>
                              Course Name
                          </div>
                            <div style={{ 
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#0f172a',
                              textAlign: 'left'
                            }}>
                              {selectedCourse.courseName}
                          </div>
                          </div>
                          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                            <div style={{ 
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '6px',
                              textAlign: 'left'
                            }}>
                              Subject
                            </div>
                            <div style={{ 
                              fontSize: '16px',
                              fontWeight: '500',
                              color: '#1e293b',
                              textAlign: 'left'
                            }}>
                              {selectedCourse.subject || '-'}
                            </div>
                          </div>
                          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                            <div style={{ 
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '6px',
                              textAlign: 'left'
                            }}>
                              Grade
                            </div>
                            <div style={{ 
                              fontSize: '16px',
                              fontWeight: '500',
                              color: '#1e293b',
                              textAlign: 'left'
                            }}>
                              {selectedCourse.grade}
                            </div>
                          </div>
                          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                            <div style={{ 
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '6px',
                              textAlign: 'left'
                            }}>
                              Course Fee
                            </div>
                            <div style={{ 
                              fontSize: '16px',
                              fontWeight: '500',
                              color: '#1e293b',
                              textAlign: 'left'
                            }}>
                              {selectedCourse.courseFee ? `Rs ${parseFloat(selectedCourse.courseFee).toFixed(2)}` : '-'}
                            </div>
                          </div>
                        </Col>
                        <Col md={6} style={{ textAlign: 'left' }}>
                          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                            <div style={{ 
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '6px',
                              textAlign: 'left'
                            }}>
                              Teacher Payment Percentage
                            </div>
                            <div style={{ 
                              fontSize: '16px',
                              fontWeight: '500',
                              color: '#1e293b',
                              textAlign: 'left'
                            }}>
                              {selectedCourse.teacherPaymentPercentage ? `${selectedCourse.teacherPaymentPercentage}%` : '-'}
                          </div>
                          </div>
                          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                            <div style={{ 
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '6px',
                              textAlign: 'left'
                            }}>
                              Teacher Payment Amount
                            </div>
                            <div style={{ 
                              fontSize: '16px',
                              fontWeight: '500',
                              color: '#1e293b',
                              textAlign: 'left'
                            }}>
                              {selectedCourse.courseFee && selectedCourse.teacherPaymentPercentage 
                                ? `Rs ${((parseFloat(selectedCourse.courseFee) * parseFloat(selectedCourse.teacherPaymentPercentage)) / 100).toFixed(2)}` 
                                : '-'}
                          </div>
                          </div>
                          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                            <div style={{ 
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '6px',
                              textAlign: 'left'
                            }}>
                              Enrolled Students
                            </div>
                            <div style={{ 
                              fontSize: '16px',
                              fontWeight: '500',
                              color: '#1e293b',
                              textAlign: 'left'
                            }}>
                              {selectedCourse.enrolledStudents ? selectedCourse.enrolledStudents.length : 0}
                          </div>
                          </div>
                          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                            <div style={{ 
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '6px',
                              textAlign: 'left'
                            }}>
                              Created At
                            </div>
                            <div style={{ 
                              fontSize: '16px',
                              fontWeight: '500',
                              color: '#1e293b',
                              textAlign: 'left'
                            }}>
                              {selectedCourse.createdAt 
                                ? new Date(selectedCourse.createdAt).toLocaleString() 
                                : '-'}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>

                    <div className="mt-4" style={{ textAlign: 'left' }}>
                      <div className="operators-table-container">
                        <div className="table-header-section" style={{ textAlign: 'left' }}>
                          <h3 style={{ margin: 0, textAlign: 'left' }}>
                            Enrolled Students ({getCourseStudents().length} {getCourseStudents().length === 1 ? 'student' : 'students'})
                          </h3>
                        </div>
                      {getCourseStudents().length > 0 ? (
                        <>
                          <div className="table-responsive" style={{ marginTop: '16px' }}>
                            <Table className="operators-table d-none d-lg-table" style={{ margin: 0 }}>
                            <thead>
                              <tr>
                                  <th style={{ width: '60px' }} className="text-start">#</th>
                                  <th className="text-start">Full Name</th>
                                  <th style={{ width: '180px' }} className="text-start">Grade</th>
                                  <th className="text-start">Contact Number</th>
                                  <th className="text-start">Parent Name</th>
                                  <th className="text-start">Student ID</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getCourseStudents().map((student, index) => (
                                <tr key={student.id} style={{ transition: 'all 0.2s ease' }}>
                                  <td style={{ 
                                    padding: '16px 24px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    textAlign: 'left'
                                  }}>
                                    {index + 1}
                                  </td>
                                  <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '12px' 
                                    }}>
                                      {student.imageUrl ? (
                                        <img
                                          src={`${API_URL}${student.imageUrl}`}
                                          alt={student.fullName}
                                          style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            objectFit: 'cover',
                                            border: '2px solid #e2e8f0',
                                            flexShrink: 0
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
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: student.imageUrl ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                                        display: student.imageUrl ? 'none' : 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#3b82f6',
                                        flexShrink: 0
                                      }}>
                                        <HiOutlineUser size={20} />
                                      </div>
                                      <div>
                                        <div style={{ 
                                          fontSize: '15px', 
                                          fontWeight: '700', 
                                          color: '#0f172a',
                                          marginBottom: '2px'
                                        }}>
                                          {student.fullName}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      color: '#475569'
                                    }}>
                                      <HiOutlineAcademicCap size={16} style={{ color: '#94a3b8' }} />
                                      <span>{student.grade}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      fontSize: '14px',
                                      color: '#475569'
                                    }}>
                                      <HiOutlinePhone size={16} style={{ color: '#94a3b8' }} />
                                      <span>{student.contactNumber}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                                    <div style={{ 
                                      fontSize: '14px',
                                      color: '#475569'
                                    }}>
                                      {student.parentName || 'N/A'}
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                                    <code style={{ 
                                      background: '#f1f5f9',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '13px',
                                      color: '#475569',
                                      fontWeight: '600'
                                    }}>
                                      {student.id}
                                    </code>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="d-lg-none" style={{ marginTop: '16px' }}>
                          <div className="student-cards-container">
                            {getCourseStudents().map((student, index) => (
                              <Card key={student.id} className="student-card mb-3">
                                <Card.Body>
                                  <div className="student-card-header mb-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {student.imageUrl ? (
                                      <img
                                        src={`${API_URL}${student.imageUrl}`}
                                        alt={student.fullName}
                                        style={{
                                          width: '40px',
                                          height: '40px',
                                          borderRadius: '10px',
                                          objectFit: 'cover',
                                          border: '2px solid #e2e8f0',
                                          flexShrink: 0
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
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '10px',
                                      background: student.imageUrl ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                                      display: student.imageUrl ? 'none' : 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#3b82f6',
                                      flexShrink: 0
                                    }}>
                                      <HiOutlineUser size={20} />
                                    </div>
                                    <h5 className="student-card-name mb-0">{student.fullName}</h5>
                                  </div>
                                  <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '12px',
                                    paddingTop: '12px',
                                    borderTop: '1px solid #e2e8f0'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <HiOutlineAcademicCap size={16} style={{ color: '#94a3b8' }} />
                                      <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>Grade: {student.grade}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <HiOutlinePhone size={16} style={{ color: '#94a3b8' }} />
                                      <span style={{ fontSize: '14px', color: '#475569' }}>{student.contactNumber}</span>
                                    </div>
                                    {student.parentName && (
                                      <div style={{ fontSize: '14px', color: '#475569' }}>
                                        <strong>Parent:</strong> {student.parentName}
                                      </div>
                                    )}
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                                      <strong>Student ID:</strong> <code style={{ 
                                        background: '#f1f5f9',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        color: '#475569',
                                        fontWeight: '600'
                                      }}>{student.id}</code>
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                            ))}
                          </div>
                        </div>
                        </>
                      ) : (
                        <div className="table-responsive" style={{ marginTop: '16px' }}>
                          <Table className="operators-table" style={{ margin: 0 }}>
                            <thead>
                              <tr>
                                <th style={{ width: '60px' }} className="text-start">#</th>
                                <th className="text-start">Full Name</th>
                                <th style={{ width: '180px' }} className="text-start">Grade</th>
                                <th className="text-start">Contact Number</th>
                                <th className="text-start">Parent Name</th>
                                <th className="text-start">Student ID</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td colSpan="6" className="text-center py-5" style={{ color: '#64748b' }}>
                                  <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    gap: '12px' 
                                  }}>
                                    <HiOutlineUser size={48} style={{ opacity: 0.3 }} />
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                                      No students enrolled in this course.
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </Table>
                        </div>
                      )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Tab.Pane>

              <Tab.Pane eventKey="lms">
                <Card style={{
                  border: 'none',
                  borderRadius: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  marginBottom: '24px'
                }}>
                  <Card.Body style={{ padding: '24px' }}>
                    <h5 style={{ 
                      marginBottom: '24px',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#0f172a'
                    }}>
                      Upload Learning Material
                    </h5>
                    {uploadError && (
                      <Alert variant="danger" className="mb-3" onClose={() => setUploadError('')} dismissible>
                        {uploadError}
                      </Alert>
                    )}
                    {uploadSuccess && (
                      <Alert variant="success" className="mb-3" onClose={() => setUploadSuccess('')} dismissible>
                        {uploadSuccess}
                      </Alert>
                    )}

                    <Form onSubmit={handleUploadContent}>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Content Type</Form.Label>
                            <Form.Select
                              name="type"
                              value={uploadForm.type}
                              onChange={handleUploadFormChange}
                              required
                              className="form-control-custom"
                            >
                              <option value="text">Text Content</option>
                              <option value="image">Image</option>
                              <option value="pdf">PDF Document</option>
                              <option value="link">Link/URL</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Title</Form.Label>
                            <Form.Control
                              type="text"
                              name="title"
                              value={uploadForm.title}
                              onChange={handleUploadFormChange}
                              placeholder="Enter content title"
                              required
                              className="form-control-custom"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      {uploadForm.type === 'text' && (
                        <Form.Group className="mb-3">
                          <Form.Label>Text Content</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={5}
                            name="content"
                            value={uploadForm.content}
                            onChange={handleUploadFormChange}
                            placeholder="Enter your text content here..."
                            required
                            className="form-control-custom"
                          />
                        </Form.Group>
                      )}

                      {uploadForm.type === 'link' && (
                        <Form.Group className="mb-3">
                          <Form.Label>Link/URL</Form.Label>
                          <Form.Control
                            type="url"
                            name="link"
                            value={uploadForm.link}
                            onChange={handleUploadFormChange}
                            placeholder="https://example.com"
                            required
                            className="form-control-custom"
                          />
                        </Form.Group>
                      )}

                      {(uploadForm.type === 'image' || uploadForm.type === 'pdf') && (
                        <Form.Group className="mb-3">
                          <Form.Label>
                            {uploadForm.type === 'image' ? 'Image File' : 'PDF File'}
                          </Form.Label>
                          <Form.Control
                            type="file"
                            id="lms-file-input"
                            name="file"
                            onChange={handleUploadFormChange}
                            accept={uploadForm.type === 'image' ? 'image/*' : 'application/pdf'}
                            required
                            className="form-control-custom"
                          />
                          <Form.Text className="text-muted">
                            {uploadForm.type === 'image' 
                              ? 'Supported formats: JPG, PNG, GIF, etc.' 
                              : 'PDF documents only'}
                          </Form.Text>
                        </Form.Group>
                      )}

                      <Button
                        type="submit"
                        variant="primary"
                        disabled={uploadLoading}
                        className="login-button"
                      >
                        {uploadLoading ? 'Uploading...' : 'Upload Content'}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>

                <div className="mt-4">
                  <div className="operators-table-container">
                    <div className="table-header-section">
                      <h3 style={{ margin: 0 }}>
                        Learning Materials ({lmsContent.length} {lmsContent.length === 1 ? 'item' : 'items'})
                      </h3>
                    </div>
                  {lmsContent.length === 0 ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '48px 24px',
                        color: '#64748b'
                      }}>
                        <HiOutlineBookOpen size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                        <p style={{ margin: 0 }}>No learning materials uploaded yet.</p>
                      </div>
                  ) : (
                      <Row className="g-3 mt-3">
                      {lmsContent.map((content, index) => (
                        <Col key={content.id} xs={12} sm={6} md={4} lg={3}>
                            <Card style={{
                              border: 'none',
                              borderRadius: '16px',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                              height: '100%'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                            }}>
                              <Card.Body style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                  <h6 style={{ 
                                    margin: 0, 
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: '#0f172a',
                                    flex: 1,
                                    marginRight: '8px'
                                  }}>
                                    {content.title}
                                  </h6>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteLmsContent(content.id)}
                                    style={{ 
                                      flexShrink: 0,
                                      borderRadius: '8px',
                                      padding: '4px 8px',
                                      fontSize: '18px',
                                      lineHeight: '1'
                                    }}
                                >
                                  ×
                                </Button>
                              </div>
                                <div style={{ marginBottom: '12px' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    backgroundColor: content.type === 'text' ? 'rgba(59, 130, 246, 0.1)' :
                                                    content.type === 'image' ? 'rgba(16, 185, 129, 0.1)' :
                                                    content.type === 'pdf' ? 'rgba(239, 68, 68, 0.1)' :
                                                    'rgba(139, 92, 246, 0.1)',
                                    color: content.type === 'text' ? '#3b82f6' :
                                           content.type === 'image' ? '#10b981' :
                                           content.type === 'pdf' ? '#ef4444' :
                                           '#8b5cf6'
                                  }}>
                                  {content.type.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-grow-1">
                                {content.type === 'text' && (
                                  <p className="text-muted small mb-2" style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                  }}>
                                    {content.content}
                                  </p>
                                )}
                                {content.type === 'link' && (
                                  <p className="mb-2">
                                    <a 
                                      href={content.link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="small text-break"
                                      style={{ wordBreak: 'break-all' }}
                                    >
                                      {content.link}
                                    </a>
                                  </p>
                                )}
                                {(content.type === 'image' || content.type === 'pdf') && content.fileUrl && (
                                  <div className="mb-2">
                                    {content.type === 'image' ? (
                                      <img 
                                        src={`${API_URL}${content.fileUrl}`} 
                                        alt={content.title}
                                        style={{ 
                                          width: '100%', 
                                          height: '150px', 
                                          objectFit: 'cover',
                                          borderRadius: '4px'
                                        }}
                                        className="img-thumbnail"
                                      />
                                    ) : (
                                      <div className="text-center">
                                        <a 
                                          href={`${API_URL}${content.fileUrl}`} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="btn btn-sm btn-outline-primary w-100"
                                        >
                                          📄 View PDF
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="mt-auto pt-2 border-top">
                                <small className="text-muted">
                                  {content.createdAt ? new Date(content.createdAt).toLocaleDateString() : '-'}
                                </small>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                  </div>
                </div>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </div>
      );
    }

    // Show courses list
    return (
      <div>
        <div className="operators-header mb-4">
          <div>
            <h2 className="dashboard-title">My Courses</h2>
            <p className="dashboard-subtitle">Courses assigned to you</p>
          </div>
        </div>

        <div className="operators-table-container">
          <div className="table-header-section">
            <h3>My Courses</h3>
          </div>
          <Table striped bordered hover className="operators-table d-none d-lg-table">
            <thead>
              <tr>
                <th className="text-start">#</th>
                <th className="text-start">Course Name</th>
                <th className="text-start">Subject</th>
                <th className="text-start">Grade</th>
                <th className="text-start">Course Fee</th>
                <th className="text-start">Payment %</th>
                <th className="text-start">Students</th>
                <th className="text-start">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCourses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-4">
                    No courses assigned to you.
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((course, index) => (
                  <tr key={course.id}>
                    <td className="text-start">{coursesStartIndex + index + 1}</td>
                    <td className="text-start">{course.courseName}</td>
                    <td className="text-start">{course.subject || '-'}</td>
                    <td className="text-start">{course.grade}</td>
                    <td className="text-start">{course.courseFee ? `Rs ${parseFloat(course.courseFee).toFixed(2)}` : '-'}</td>
                    <td className="text-start">{course.teacherPaymentPercentage ? `${course.teacherPaymentPercentage}%` : '-'}</td>
                    <td className="text-start">{course.enrolledStudents ? course.enrolledStudents.length : 0}</td>
                    <td className="text-start">
                      <OverlayTrigger
                        placement="top"
                        overlay={<Tooltip>Manage</Tooltip>}
                      >
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewCourse(course)}
                          className="action-btn-icon"
                      >
                          <HiOutlineCog6Tooth />
                      </Button>
                      </OverlayTrigger>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          <div className="d-lg-none">
            {paginatedCourses.length === 0 ? (
              <div className="text-center text-muted py-5">
                <p>No courses assigned to you.</p>
              </div>
            ) : (
              <div className="student-cards-container">
                {paginatedCourses.map((course, index) => (
                  <Card key={course.id} className="student-card mb-3">
                    <Card.Body>
                      <div className="student-card-header mb-2">
                        <h5 className="student-card-name mb-1">{course.courseName}</h5>
                        <p className="text-muted small mb-1">
                          <strong>Subject:</strong> {course.subject || '-'} | <strong>Grade:</strong> {course.grade}
                        </p>
                        <p className="text-muted small mb-1">
                          <strong>Fee:</strong> {course.courseFee ? `Rs ${parseFloat(course.courseFee).toFixed(2)}` : '-'}
                        </p>
                        <p className="text-muted small mb-2">
                          <strong>Payment %:</strong> {course.teacherPaymentPercentage ? `${course.teacherPaymentPercentage}%` : '-'} | 
                          <strong> Students:</strong> {course.enrolledStudents ? course.enrolledStudents.length : 0}
                        </p>
                        <div className="student-card-actions">
                          <div className="student-actions-grid">
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>Manage</Tooltip>}
                            >
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleViewCourse(course)}
                                className="action-btn-icon"
                            >
                                <HiOutlineCog6Tooth />
                            </Button>
                            </OverlayTrigger>
                          </div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {myCourses.length > 0 && (
            <Pagination
              currentPage={coursesPage}
              totalPages={coursesTotalPages}
              onPageChange={goToCoursesPage}
              onNext={nextCoursesPage}
              onPrev={prevCoursesPage}
              totalItems={coursesTotalItems}
              startIndex={coursesStartIndex}
              endIndex={coursesEndIndex}
            />
          )}
        </div>

      </div>
    );
  };

  const renderMyStudents = () => {
    return (
      <div>
        <div className="operators-header mb-4">
          <div>
            <h2 className="dashboard-title">My Students</h2>
            <p className="dashboard-subtitle">Students enrolled in your courses</p>
          </div>
        </div>

        <div className="operators-table-container">
          <div className="table-header-section">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <h3>Enrolled Students ({filteredMyStudents.length} {filteredMyStudents.length === 1 ? 'student' : 'students'})</h3>
              <div className="d-flex gap-2" style={{ minWidth: '300px', maxWidth: '500px', flex: '1' }}>
                <div className="position-relative" style={{ flex: '1' }}>
                  <HiOutlineMagnifyingGlass 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      fontSize: '18px',
                      pointerEvents: 'none'
                    }} 
                  />
                  <Form.Control
                    type="text"
                    placeholder="Search by name, ID, or grade..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    style={{
                      paddingLeft: '40px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px'
                    }}
                  />
                </div>
                {studentSearchQuery && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setStudentSearchQuery('')}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="table-responsive">
            <Table className="operators-table d-none d-lg-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                  <th style={{ width: '60px' }} className="text-start">#</th>
                  <th className="text-start">Full Name</th>
                  <th style={{ width: '180px' }} className="text-start">Grade</th>
                  <th className="text-start">Contact Number</th>
                  <th className="text-start">Parent Name</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length === 0 ? (
                <tr>
                    <td colSpan="5" className="text-center py-5" style={{ color: '#64748b' }}>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '12px' 
                      }}>
                        <HiOutlineUser size={48} style={{ opacity: 0.3 }} />
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                          {filteredMyStudents.length === 0 ? 'No students enrolled in your courses.' : 'No students match your search criteria.'}
                        </p>
                      </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, index) => (
                    <tr key={student.id} style={{ transition: 'all 0.2s ease' }}>
                      <td style={{ 
                        padding: '16px 24px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#64748b',
                        textAlign: 'left'
                      }}>
                        {studentsStartIndex + index + 1}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px' 
                        }}>
                          {student.imageUrl ? (
                            <img
                              src={`${API_URL}${student.imageUrl}`}
                              alt={student.fullName}
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                objectFit: 'cover',
                                border: '2px solid #e2e8f0',
                                flexShrink: 0
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
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: student.imageUrl ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                            display: student.imageUrl ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3b82f6',
                            flexShrink: 0
                          }}>
                            <HiOutlineUser size={20} />
                          </div>
                          <div>
                            <div style={{ 
                              fontSize: '15px', 
                              fontWeight: '700', 
                              color: '#0f172a',
                              marginBottom: '2px'
                            }}>
                              {student.fullName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#475569'
                        }}>
                          <HiOutlineAcademicCap size={16} style={{ color: '#94a3b8' }} />
                          <span>{student.grade}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '14px',
                          color: '#475569'
                        }}>
                          <HiOutlinePhone size={16} style={{ color: '#94a3b8' }} />
                          <span>{student.contactNumber}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'left' }}>
                        <div style={{ 
                          fontSize: '14px',
                          color: '#475569'
                        }}>
                          {student.parentName || 'N/A'}
                        </div>
                      </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
          </div>

          {/* Mobile Card View */}
          <div className="d-lg-none">
            {paginatedStudents.length === 0 ? (
              <div className="text-center text-muted py-5">
                <p>{filteredMyStudents.length === 0 ? 'No students enrolled in your courses.' : 'No students match your search criteria.'}</p>
              </div>
            ) : (
              <div className="student-cards-container">
                {paginatedStudents.map((student, index) => (
                  <Card key={student.id} className="student-card mb-3">
                    <Card.Body>
                      <div className="student-card-header mb-0" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {student.imageUrl ? (
                          <img
                            src={`${API_URL}${student.imageUrl}`}
                            alt={student.fullName}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              objectFit: 'cover',
                              border: '2px solid #e2e8f0',
                              flexShrink: 0
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
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: student.imageUrl ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                          display: student.imageUrl ? 'none' : 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#3b82f6',
                          flexShrink: 0
                        }}>
                          <HiOutlineUser size={20} />
                        </div>
                        <h5 className="student-card-name mb-0">{student.fullName}</h5>
                      </div>
                      <div style={{ 
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid #e2e8f0'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HiOutlineAcademicCap size={16} style={{ color: '#94a3b8' }} />
                            <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>Grade: {student.grade}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HiOutlinePhone size={16} style={{ color: '#94a3b8' }} />
                            <span style={{ fontSize: '14px', color: '#475569' }}>{student.contactNumber}</span>
                          </div>
                          {student.parentName && (
                            <div style={{ fontSize: '14px', color: '#475569' }}>
                          <strong>Parent:</strong> {student.parentName}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {filteredMyStudents.length > 0 && (
            <Pagination
              currentPage={studentsPage}
              totalPages={studentsTotalPages}
              onPageChange={goToStudentsPage}
              onNext={nextStudentsPage}
              onPrev={prevStudentsPage}
              totalItems={studentsTotalItems}
              startIndex={studentsStartIndex}
              endIndex={studentsEndIndex}
            />
          )}
        </div>
      </div>
    );
  };

  const renderIncome = () => {
    // Calculate monthly earnings (paid)
    const monthlyEarnings = {};
    payments.forEach(payment => {
      if (payment.monthKey) {
        const course = myCourses.find(c => c.id === payment.courseId);
        if (course && course.teacherPaymentPercentage) {
          const paymentAmount = parseFloat(payment.amount || 0);
          const teacherPercentage = parseFloat(course.teacherPaymentPercentage) || 0;
          const teacherPayment = (paymentAmount * teacherPercentage) / 100;
          monthlyEarnings[payment.monthKey] = (monthlyEarnings[payment.monthKey] || 0) + teacherPayment;
        }
      }
    });

    // Calculate student pending payments
    const allStudentPendingPayments = [];
    myCourses.forEach(course => {
      const enrolledStudents = course.enrolledStudents || [];
      enrolledStudents.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (student) {
          const currentDate = new Date();
          const enrollmentDate = new Date(student.createdAt);
          const courseCreatedDate = new Date(course.createdAt);
          const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;
          
          let currentMonth = new Date(enrollmentDateForCourse.getFullYear(), enrollmentDateForCourse.getMonth(), 1);
          const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          
          let pendingAmount = 0;
          let pendingMonths = [];
          
          while (currentMonth <= lastDayOfCurrentMonth) {
            const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
            const lastDayOfPaymentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            
            if (enrollmentDateForCourse <= lastDayOfPaymentMonth) {
              const isPaid = payments.some(
                p => p.studentId === studentId && 
                     p.monthKey === monthKey && 
                     p.courseId === course.id &&
                     p.status === 'Paid'
              );
              
              if (!isPaid) {
                const courseFee = parseFloat(course.courseFee) || 0;
                const teacherPercentage = parseFloat(course.teacherPaymentPercentage) || 0;
                const teacherPayment = (courseFee * teacherPercentage) / 100;
                pendingAmount += teacherPayment;
                pendingMonths.push(monthKey);
              }
            }
            
            currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
          }
          
          if (pendingAmount > 0) {
            allStudentPendingPayments.push({
              studentId: student.id,
              studentName: student.fullName,
              courseId: course.id,
              courseName: course.courseName,
              pendingAmount: pendingAmount,
              pendingMonths: pendingMonths.length
            });
          }
        }
      });
    });

    // Manual pagination for student pending payments (6 items per page)
    const itemsPerPage = 6;
    const pendingPaymentsTotalPages = Math.ceil(allStudentPendingPayments.length / itemsPerPage);
    const pendingPaymentsStartIndex = (pendingPaymentsPage - 1) * itemsPerPage;
    const pendingPaymentsEndIndex = pendingPaymentsStartIndex + itemsPerPage;
    const paginatedPendingPayments = allStudentPendingPayments.slice(pendingPaymentsStartIndex, pendingPaymentsEndIndex);
    const pendingPaymentsTotalItems = allStudentPendingPayments.length;

    const goToPendingPaymentsPage = (page) => {
      if (page >= 1 && page <= pendingPaymentsTotalPages) {
        setPendingPaymentsPage(page);
      }
    };

    const nextPendingPaymentsPage = () => {
      if (pendingPaymentsPage < pendingPaymentsTotalPages) {
        setPendingPaymentsPage(pendingPaymentsPage + 1);
      }
    };

    const prevPendingPaymentsPage = () => {
      if (pendingPaymentsPage > 1) {
        setPendingPaymentsPage(pendingPaymentsPage - 1);
      }
    };

    // Calculate conversion/retention rate (simplified)
    const totalEnrolled = myStudents.length;
    const paidStudents = new Set(payments.map(p => p.studentId)).size;
    const retentionRate = totalEnrolled > 0 ? ((paidStudents / totalEnrolled) * 100).toFixed(1) : 0;

    // Prepare payment history
    const paymentHistory = payments.map(payment => {
      const course = myCourses.find(c => c.id === payment.courseId);
      const student = students.find(s => s.id === payment.studentId);
      let teacherPayment = 0;
      if (course && course.teacherPaymentPercentage) {
        const paymentAmount = parseFloat(payment.amount || 0);
        const teacherPercentage = parseFloat(course.teacherPaymentPercentage) || 0;
        teacherPayment = (paymentAmount * teacherPercentage) / 100;
      }
      return {
        ...payment,
        courseName: course ? course.courseName : 'N/A',
        studentName: student ? student.fullName : 'N/A',
        teacherPayment: teacherPayment
      };
    }).sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));

    // Download payslip function
    const downloadPayslip = async (monthKey, amount) => {
      try {
        const [year, month] = monthKey.split('-');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[parseInt(month) - 1];
        
        // Get payments for this month
        const monthPayments = paymentHistory.filter(p => p.monthKey === monthKey);
        
        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Header
        pdf.setFontSize(20);
        pdf.setTextColor(99, 102, 241); // Indigo color
        pdf.text('PAYSLIP', 105, 20, { align: 'center' });
        
        // Teacher Info
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Teacher: ${teacher ? teacher.name : 'N/A'}`, 20, 35);
        pdf.text(`Teacher ID: ${teacher ? teacher.teacherId : 'N/A'}`, 20, 42);
        pdf.text(`Email: ${teacher ? teacher.email : 'N/A'}`, 20, 49);
        
        // Period
        pdf.setFontSize(14);
        pdf.text(`Period: ${monthName} ${year}`, 20, 60);
        
        // Line
        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, 65, 190, 65);
        
        // Earnings Summary
        pdf.setFontSize(12);
        pdf.text('Earnings Summary', 20, 75);
        
        pdf.setFontSize(10);
        pdf.text(`Total Earnings for ${monthName} ${year}:`, 25, 85);
        pdf.setFontSize(14);
        pdf.setTextColor(16, 185, 129); // Green color
        pdf.text(`Rs ${amount.toFixed(2)}`, 180, 85, { align: 'right' });
        
        // Payment Details
        if (monthPayments.length > 0) {
          pdf.setFontSize(12);
          pdf.setTextColor(0, 0, 0);
          pdf.text('Payment Details', 20, 100);
          
          let yPos = 110;
          pdf.setFontSize(9);
          monthPayments.forEach((payment, index) => {
            if (yPos > 270) {
              pdf.addPage();
              yPos = 20;
            }
            pdf.text(`${index + 1}. ${payment.studentName} - ${payment.courseName}`, 25, yPos);
            pdf.text(`   Amount: Rs ${payment.teacherPayment.toFixed(2)}`, 30, yPos + 6);
            yPos += 15;
          });
        }
        
        // Footer
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(128, 128, 128);
          pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 285, { align: 'center' });
          pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        }
        
        // Download
        const filename = `Payslip_${teacher ? teacher.name.replace(/\s+/g, '_') : 'Teacher'}_${monthName}_${year}.pdf`;
        pdf.save(filename);
      } catch (error) {
        console.error('Error generating payslip:', error);
        alert('Failed to generate payslip. Please try again.');
      }
    };

    return (
      <div>
        <div className="operators-header mb-4" style={{ textAlign: 'left' }}>
          <div style={{ textAlign: 'left' }}>
            <h2 className="dashboard-title" style={{ textAlign: 'left' }}>Income</h2>
            <p className="dashboard-subtitle" style={{ textAlign: 'left' }}>Your payment and income information</p>
          </div>
        </div>

        {/* Summary Cards */}
        <Row className="g-3 mb-4" style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col xs={12} md style={{ flex: '1 1 0', minWidth: '200px' }}>
            <Card className="dashboard-stat-card h-100">
              <Card.Body>
                <div className="stat-icon">
                  <HiOutlineCurrencyDollar />
                </div>
                <h3 className="stat-number">{loading ? '...' : `Rs ${stats.totalIncome.toFixed(2)}`}</h3>
                <p className="stat-label">Total Expected Income</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md style={{ flex: '1 1 0', minWidth: '200px' }}>
            <Card className="dashboard-stat-card h-100">
              <Card.Body>
                <div className="stat-icon text-danger">
                  <HiOutlineCurrencyDollar />
                </div>
                <h3 className="stat-number text-danger">{loading ? '...' : `Rs ${stats.pendingIncome.toFixed(2)}`}</h3>
                <p className="stat-label">Pending Income</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md style={{ flex: '1 1 0', minWidth: '200px' }}>
            <Card className="dashboard-stat-card h-100">
              <Card.Body>
                <div className="stat-icon text-info">
                  <HiOutlineCurrencyDollar />
                </div>
                <h3 className="stat-number text-info">{loading ? '...' : `Rs ${stats.advancePayments.toFixed(2)}`}</h3>
                <p className="stat-label">Advance Payments</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Total Monthly Earnings - Paid */}
        <Card style={{
          border: 'none',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          background: 'white',
          marginBottom: '24px'
        }}>
          <Card.Body style={{ padding: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <HiOutlineArrowTrendingUp size={24} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b', textAlign: 'left' }}>
                  Total Monthly Earnings - Paid
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b', textAlign: 'left' }}>
                  Breakdown of your paid earnings by month
                </p>
              </div>
            </div>
            {Object.keys(monthlyEarnings).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <HiOutlineCurrencyDollar size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No monthly earnings recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {Object.entries(monthlyEarnings).sort((a, b) => b[0].localeCompare(a[0])).map(([monthKey, amount]) => {
                  const [year, month] = monthKey.split('-');
                  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                  const monthName = monthNames[parseInt(month) - 1];
                  return (
                    <div key={monthKey} style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'left'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', textAlign: 'left' }}>
                        {monthName} {year}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', textAlign: 'left' }}>
                        Rs {amount.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Student Pending Payments */}
        <Card style={{
          border: 'none',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          background: 'white',
          marginBottom: '24px'
        }}>
          <Card.Body style={{ padding: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <HiOutlineClock size={24} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b', textAlign: 'left' }}>
                  Student Pending Payments
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b', textAlign: 'left' }}>
                  Students with outstanding payment obligations
                </p>
              </div>
            </div>
            {allStudentPendingPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <HiOutlineUserGroup size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No pending payments from students.</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <Table responsive hover style={{ margin: 0 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', border: 'none', textAlign: 'left' }}>Student</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', border: 'none', textAlign: 'left' }}>Course</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', border: 'none', textAlign: 'left' }}>Pending Months</th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', border: 'none', textAlign: 'left' }}>Pending Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPendingPayments.map((item, index) => (
                        <tr key={`${item.studentId}-${item.courseId}`} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                          <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#1e293b', border: 'none', textAlign: 'left' }}>
                            {item.studentName}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: '#475569', border: 'none', textAlign: 'left' }}>
                            {item.courseName}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: '#475569', border: 'none', textAlign: 'left' }}>
                            {item.pendingMonths} {item.pendingMonths === 1 ? 'month' : 'months'}
                          </td>
                          <td style={{ padding: '16px', fontSize: '16px', fontWeight: '700', color: '#ef4444', textAlign: 'left', border: 'none' }}>
                            Rs {item.pendingAmount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                {allStudentPendingPayments.length > 6 && (
                  <Pagination
                    currentPage={pendingPaymentsPage}
                    totalPages={pendingPaymentsTotalPages}
                    onPageChange={goToPendingPaymentsPage}
                    onNext={nextPendingPaymentsPage}
                    onPrev={prevPendingPaymentsPage}
                    totalItems={pendingPaymentsTotalItems}
                    startIndex={pendingPaymentsStartIndex}
                    endIndex={pendingPaymentsEndIndex}
                  />
                )}
              </>
            )}
          </Card.Body>
        </Card>

        {/* Student Conversion/Retention Rate Graph */}
        <Card style={{
          border: 'none',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          background: 'white',
          marginBottom: '24px'
        }}>
          <Card.Body style={{ padding: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <HiOutlineChartBar size={24} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b', textAlign: 'left' }}>
                  Student Conversion/Retention Rate
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b', textAlign: 'left' }}>
                  Percentage of enrolled students who have made payments
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ 
                  height: '200px', 
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ textAlign: 'left', paddingLeft: '20px' }}>
                    <div style={{ fontSize: '48px', fontWeight: '700', color: '#6366f1', marginBottom: '8px', textAlign: 'left' }}>
                      {retentionRate}%
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', textAlign: 'left' }}>
                      Retention Rate
                    </div>
                  </div>
                  {/* Simple bar visualization */}
                  <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    right: '20px',
                    height: '8px',
                    background: '#e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${retentionRate}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', textAlign: 'left' }}>
                      Total Enrolled
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', textAlign: 'left' }}>
                      {totalEnrolled} Students
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'left' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', textAlign: 'left' }}>
                      Paid Students
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', textAlign: 'left' }}>
                      {paidStudents} Students
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Payment History Table */}
        <Card style={{
          border: 'none',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          background: 'white',
          marginBottom: '24px'
        }}>
          <Card.Body style={{ padding: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <HiOutlineCalendar size={24} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b', textAlign: 'left' }}>
                  Payment History
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b', textAlign: 'left' }}>
                  Complete record of all received payments
                </p>
              </div>
            </div>
            {paymentHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <HiOutlineCurrencyDollar size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No payment history available.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <Table responsive hover style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', border: 'none', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', border: 'none', textAlign: 'left' }}>Student</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', border: 'none', textAlign: 'left' }}>Course</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', border: 'none', textAlign: 'left' }}>Month</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', border: 'none', textAlign: 'left' }}>Total Amount</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', border: 'none', textAlign: 'left' }}>Your Earnings</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', border: 'none', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => {
                      const [year, month] = payment.monthKey ? payment.monthKey.split('-') : ['', ''];
                      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
                      const monthName = monthNames[parseInt(month) - 1];
                      const formattedDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                      return (
                        <tr key={payment.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                          <td style={{ padding: '16px', fontSize: '14px', color: '#1e293b', fontWeight: '500', border: 'none', textAlign: 'left' }}>
                            {formattedDate}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: '#1e293b', fontWeight: '500', border: 'none', textAlign: 'left' }}>
                            {payment.studentName}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: '#475569', border: 'none', textAlign: 'left' }}>
                            {payment.courseName}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: '#475569', border: 'none', textAlign: 'left' }}>
                            {monthName} {year}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: '#1e293b', border: 'none', textAlign: 'left' }}>
                            Rs {parseFloat(payment.amount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '16px', fontSize: '16px', fontWeight: '700', color: '#10b981', textAlign: 'left', border: 'none' }}>
                            Rs {payment.teacherPayment.toFixed(2)}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'left', border: 'none' }}>
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

        {/* Downloadable Payslips */}
        <Card style={{
          border: 'none',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          background: 'white',
          marginBottom: '24px'
        }}>
          <Card.Body style={{ padding: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <HiOutlineDocumentArrowDown size={24} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b', textAlign: 'left' }}>
                  Downloadable Payslips
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b', textAlign: 'left' }}>
                  Download your payslips sorted by month, course, or individual payments
                </p>
              </div>
            </div>

            {/* Payslip List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(monthlyEarnings).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).map(([monthKey, amount]) => {
                const [year, month] = monthKey.split('-');
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
                const monthName = monthNames[parseInt(month) - 1];
                return (
                  <div key={monthKey} style={{
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#6366f1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <HiOutlineDocumentArrowDown size={20} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', textAlign: 'left' }}>
                          Payslip - {monthName} {year}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', textAlign: 'left' }}>
                          Rs {amount.toFixed(2)} • Monthly Summary
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => downloadPayslip(monthKey, amount)}
                      style={{
                        borderColor: '#6366f1',
                        color: '#6366f1',
                        borderRadius: '8px',
                        fontWeight: '600'
                      }}
                    >
                      <HiOutlineDocumentArrowDown size={16} style={{ marginRight: '6px' }} />
                      Download
                    </Button>
                  </div>
                );
              })}
              {Object.keys(monthlyEarnings).length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <HiOutlineDocumentArrowDown size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No payslips available for download.</p>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>

      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      ></div>
      <TeacherSidebar 
        activeItem={activeItem} 
        onItemClick={handleItemClick} 
        className={sidebarOpen ? 'open' : ''} 
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div className={`dashboard-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TeacherTopNavbar teacher={teacher} onMenuToggle={toggleSidebar} />
        <div className="dashboard-main">
          <Container fluid>
            {activeItem === 'my-courses' ? (
              renderMyCourses()
            ) : activeItem === 'my-students' ? (
              renderMyStudents()
            ) : activeItem === 'attendance' ? (
              <Attendance hideMarkButton={true} />
            ) : activeItem === 'income' ? (
              renderIncome()
            ) : (
              <>
                <div className="dashboard-header mb-4" style={{ textAlign: 'left' }}>
                  <h2 className="dashboard-title" style={{ textAlign: 'left' }}>Dashboard</h2>
                  <p className="dashboard-subtitle" style={{ textAlign: 'left' }}>Welcome back, {teacher.name || teacher.email}</p>
                </div>

                {error && (
                  <Alert variant="danger" className="mb-3" onClose={() => setError('')} dismissible>
                    <Alert.Heading>Error</Alert.Heading>
                    {error}
                  </Alert>
                )}

                <Row className="g-3">
                  {/* Left Side - Teacher ID Card and Details (1/3 width) */}
                  <Col xs={12} lg={4}>
                    {/* University Logo */}
                    <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                      <img
                        src={require('../images/uni-logo.png')}
                        alt="University Logo"
                        style={{
                          width: '240px',
                          height: 'auto',
                          objectFit: 'contain'
                        }}
                      />
                        </div>
                    {/* Teacher ID Card */}
                    <Card className="h-100" style={{ 
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}>
                      <div style={{
                        position: 'relative',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        padding: '24px',
                        textAlign: 'center'
                      }}>
                        {teacher.imageUrl ? (
                          <img
                            src={`${API_URL}${teacher.imageUrl}`}
                            alt={teacher.name}
                            style={{
                              width: '120px',
                              height: '120px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '4px solid white',
                              marginBottom: '16px',
                              display: 'block',
                              margin: '0 auto 16px auto'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            border: '4px solid white',
                            overflow: 'hidden'
                          }}>
                            {teacher.imageUrl ? (
                              <img
                                src={`${API_URL}${teacher.imageUrl}`}
                                alt={teacher.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <HiOutlineUser size={48} style={{ color: 'white' }} />
                            )}
                          </div>
                        )}
                        <h4 style={{ color: 'white', margin: 0, fontWeight: '700', fontSize: '20px' }}>
                          {teacher.name}
                        </h4>
                        <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '8px 0 0 0', fontSize: '14px' }}>
                          {teacher.subject}
                        </p>
                      </div>
                      <Card.Body style={{ padding: '24px' }}>
                        <div>
                          <div style={{ 
                            marginBottom: '24px',
                            textAlign: 'left'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              marginBottom: '8px'
                            }}>
                              <HiOutlineIdentification style={{ fontSize: '18px', color: '#3b82f6' }} />
                              <span style={{ 
                                fontWeight: '700', 
                                color: '#0f172a', 
                                fontSize: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Teacher ID</span>
                            </div>
                            <div style={{ 
                              fontSize: '18px',
                              fontWeight: '600',
                              color: '#1e293b',
                              paddingLeft: '26px'
                            }}>
                              {teacher.id}
                            </div>
                          </div>
                          {teacher.email && (
                            <div style={{ 
                              marginBottom: '24px',
                              textAlign: 'left'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                marginBottom: '8px'
                              }}>
                                <HiOutlineEnvelope style={{ fontSize: '18px', color: '#3b82f6' }} />
                                <span style={{ 
                                  fontWeight: '700', 
                                  color: '#0f172a', 
                                  fontSize: '12px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>Email</span>
                              </div>
                              <div style={{ 
                                fontSize: '16px',
                                fontWeight: '500',
                                color: '#1e293b',
                                paddingLeft: '26px',
                                wordBreak: 'break-word'
                              }}>
                                {teacher.email}
                              </div>
                            </div>
                          )}
                          {teacher.whatsappNumber && (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '10px',
                              marginBottom: '16px',
                              fontSize: '14px',
                              color: '#64748b'
                            }}>
                              <HiOutlinePhone style={{ fontSize: '20px', color: '#3b82f6' }} />
                              <div>
                                <span style={{ fontWeight: '600', color: '#0f172a', display: 'block' }}>WhatsApp</span>
                                <span style={{ color: '#64748b' }}>{teacher.whatsappNumber}</span>
                              </div>
                            </div>
                          )}
                          {teacher.educationQualification && (
                            <div style={{ 
                              marginBottom: '24px',
                              textAlign: 'left'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                marginBottom: '8px'
                              }}>
                                <HiOutlineAcademicCap style={{ fontSize: '18px', color: '#3b82f6' }} />
                                <span style={{ 
                                  fontWeight: '700', 
                                  color: '#0f172a', 
                                  fontSize: '12px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>Education</span>
                              </div>
                              <div style={{ 
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#1e293b',
                                paddingLeft: '26px'
                              }}>
                                {teacher.educationQualification}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Right Side - Stats Cards (2/3 width) */}
                  <Col xs={12} lg={8}>
                    {/* 2x2 Cards Grid */}
                    <Row className="g-3 mb-3">
                      <Col xs={6} md={6}>
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
                              <HiOutlineBookOpen style={{ fontSize: '28px', color: '#3b82f6' }} />
                        </div>
                            <h3 className="stat-number" style={{ color: '#0f172a', marginBottom: '8px' }}>{loading ? '...' : stats.myCourses}</h3>
                            <p className="stat-label" style={{ color: '#64748b', margin: 0 }}>My Courses</p>
                      </Card.Body>
                    </Card>
                  </Col>
                      <Col xs={6} md={6}>
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
                              <HiOutlineUserGroup style={{ fontSize: '28px', color: '#10b981' }} />
                        </div>
                            <h3 className="stat-number" style={{ color: '#0f172a', marginBottom: '8px' }}>{loading ? '...' : stats.myStudents}</h3>
                            <p className="stat-label" style={{ color: '#64748b', margin: 0 }}>My Students</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col xs={6} md={6}>
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
                              <HiOutlineCurrencyDollar style={{ fontSize: '28px', color: '#8b5cf6' }} />
                            </div>
                            <h3 className="stat-number" style={{ color: '#0f172a', marginBottom: '8px' }}>{loading ? '...' : `Rs ${stats.amountToBePaid.toFixed(2)}`}</h3>
                            <p className="stat-label" style={{ color: '#64748b', margin: 0 }}>Amount to be Paid</p>
                        {!loading && (
                          <div className="mt-2">
                                <small style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>
                              Rs {stats.paidIncome.toFixed(2)} Amount taken by teacher
                            </small>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                      <Col xs={6} md={6}>
                        <Card className="dashboard-stat-card h-100" style={{
                          border: 'none',
                          borderRadius: '16px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 100%)',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.2)';
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
                              background: 'rgba(236, 72, 153, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: '16px'
                            }}>
                              <HiOutlineCurrencyDollar style={{ fontSize: '28px', color: '#ec4899' }} />
                        </div>
                            <h3 className="stat-number" style={{ color: '#0f172a', marginBottom: '8px' }}>{loading ? '...' : `Rs ${stats.advancePayments.toFixed(2)}`}</h3>
                            <p className="stat-label" style={{ color: '#64748b', margin: 0 }}>Advance Payments</p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                    {/* Pending Amount From Student - 2 cards width */}
                    <Row className="g-3">
                      <Col xs={12}>
                        <Card style={{
                          border: '1px solid #e0e7ff',
                          borderRadius: '16px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                          background: '#ffffff',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                        }}>
                          <Card.Body style={{ padding: '24px' }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '16px',
                              marginBottom: '12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <HiOutlineArrowTrendingDown style={{ fontSize: '20px', color: '#ef4444', flexShrink: 0 }} />
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: '700',
                                  color: '#0f172a',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  Pending Amount
                                </span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <h3 style={{
                                  color: '#ef4444',
                                  margin: 0,
                                  fontWeight: '700',
                                  fontSize: '28px'
                                }}>
                                  {loading ? '...' : `Rs ${stats.pendingIncome.toFixed(2)}`}
                                </h3>
                              </div>
                            </div>
                            <p style={{
                              fontSize: '13px',
                              color: '#64748b',
                              margin: 0,
                              lineHeight: '1.5',
                              textAlign: 'left'
                            }}>
                              This is the amount that will be paid to the teacher once all pending student fees are collected.
                            </p>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* Upload LMS Documents Bar */}
                    <Row className="g-3 mt-3">
                      <Col xs={12}>
                        <Card 
                          style={{
                            border: '1px solid #e0e7ff',
                            borderRadius: '16px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            background: '#ffffff',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onClick={() => setShowCourseSelectModal(true)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                          }}>
                          <Card.Body style={{ padding: '24px' }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              gap: '16px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                <HiOutlineBookOpen style={{ fontSize: '24px', color: '#3b82f6' }} />
                                <span style={{
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  color: '#0f172a'
                                }}>
                                  Upload LMS Documents
                                </span>
                              </div>
                              <Button 
                                variant="primary"
                                style={{
                                  borderRadius: '8px',
                                  padding: '8px 20px',
                                  fontWeight: '600'
                                }}
                              >
                                Select Course
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </>
            )}
          </Container>
        </div>
      </div>

      {/* Course Selection Modal */}
      <Modal 
        show={showCourseSelectModal} 
        onHide={() => setShowCourseSelectModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Select Course to Upload Learning Materials</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {myCourses.length === 0 ? (
            <Alert variant="info">
              No courses available. Please contact the administrator.
            </Alert>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {myCourses.map((course) => (
                <Card
                  key={course.id}
                  style={{
                    marginBottom: '12px',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => {
                    setSelectedCourse(course);
                    setShowCourseDetails(true);
                    setActiveTab('lms');
                    setActiveItem('my-courses');
                    setShowCourseSelectModal(false);
                    // Fetch LMS content for the selected course
                    fetchLmsContent(course.id);
                  }}
                >
                  <Card.Body style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h5 style={{ margin: 0, color: '#0f172a', fontSize: '16px', fontWeight: '600' }}>
                          {course.courseName}
                        </h5>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                          Grade: {course.grade} | Students: {course.enrolledStudents?.length || 0}
                        </p>
                      </div>
                      <HiOutlineBookOpen style={{ fontSize: '24px', color: '#3b82f6' }} />
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCourseSelectModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TeacherDashboard;

