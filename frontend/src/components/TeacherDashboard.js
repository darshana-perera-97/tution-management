import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Alert, Button, Nav, Tab, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineBookOpen, 
  HiOutlineUserGroup, 
  HiOutlineCurrencyDollar,
  HiOutlineClipboardDocumentCheck
} from 'react-icons/hi2';
import TeacherSidebar from './TeacherSidebar';
import TeacherTopNavbar from './TeacherTopNavbar';
import Attendance from './Attendance';
import '../App.css';
import API_URL from '../config';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    myCourses: 0,
    myStudents: 0,
    totalIncome: 0,
    paidIncome: 0,
    pendingIncome: 0,
    attendanceRecords: 0
  });
  const [myCourses, setMyCourses] = useState([]);
  const [myStudents, setMyStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
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
      
      // Fetch all data in parallel
      const [coursesRes, studentsRes, attendanceRes, paymentsRes, teacherPaymentsRes] = await Promise.all([
        fetch(`${API_URL}/api/courses`),
        fetch(`${API_URL}/api/students`),
        fetch(`${API_URL}/api/attendance`),
        fetch(`${API_URL}/api/payments`),
        fetch(`${API_URL}/api/teacher-payments`)
      ]);

      const coursesData = await coursesRes.json();
      const studentsData = await studentsRes.json();
      const attendanceData = await attendanceRes.json();
      const paymentsData = await paymentsRes.json();
      const teacherPaymentsData = await teacherPaymentsRes.json();

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
      
      paidPayments.forEach(payment => {
        const course = teacherCourses.find(c => c.id === payment.courseId);
        if (course && course.teacherPaymentPercentage) {
          const paymentAmount = parseFloat(payment.amount || 0);
          const teacherPercentage = parseFloat(course.teacherPaymentPercentage) || 0;
          const teacherPayment = (paymentAmount * teacherPercentage) / 100;
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

      setPayments(paidPayments);
      
      setStats({
        myCourses: teacherCourses.length,
        myStudents: teacherStudents.length,
        totalIncome: totalIncome + pendingIncome,
        paidIncome: paidIncome,
        pendingIncome: pendingIncome,
        attendanceRecords: teacherAttendance.length
      });
    } catch (err) {
      console.error('Error fetching teacher data:', err);
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
  } = usePagination(myStudents, {
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
                  className="mb-2"
                >
                  ← Back to Courses
                </Button>
                <h2 className="dashboard-title mt-2">Course Details</h2>
                <p className="dashboard-subtitle">{selectedCourse.courseName}</p>
              </div>
            </div>
          </div>

          <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'details')}>
            <Nav variant="tabs" className="mb-3">
              <Nav.Item>
                <Nav.Link eventKey="details">Course Details & Students</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="lms">LMS - Learning Materials</Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content>
              <Tab.Pane eventKey="details">
                <Card>
                  <Card.Body>
                    <div className="teacher-details mb-4">
                      <Row>
                        <Col md={6}>
                          <div className="detail-row mb-3">
                            <strong className="detail-label">Course Name:</strong>
                            <span className="detail-value">{selectedCourse.courseName}</span>
                          </div>
                          <div className="detail-row mb-3">
                            <strong className="detail-label">Subject:</strong>
                            <span className="detail-value">{selectedCourse.subject || '-'}</span>
                          </div>
                          <div className="detail-row mb-3">
                            <strong className="detail-label">Grade:</strong>
                            <span className="detail-value">{selectedCourse.grade}</span>
                          </div>
                          <div className="detail-row mb-3">
                            <strong className="detail-label">Course Fee:</strong>
                            <span className="detail-value">
                              {selectedCourse.courseFee ? `Rs. ${parseFloat(selectedCourse.courseFee).toFixed(2)}` : '-'}
                            </span>
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="detail-row mb-3">
                            <strong className="detail-label">Teacher Payment Percentage:</strong>
                            <span className="detail-value">
                              {selectedCourse.teacherPaymentPercentage ? `${selectedCourse.teacherPaymentPercentage}%` : '-'}
                            </span>
                          </div>
                          <div className="detail-row mb-3">
                            <strong className="detail-label">Teacher Payment Amount:</strong>
                            <span className="detail-value">
                              {selectedCourse.courseFee && selectedCourse.teacherPaymentPercentage 
                                ? `Rs. ${((parseFloat(selectedCourse.courseFee) * parseFloat(selectedCourse.teacherPaymentPercentage)) / 100).toFixed(2)}` 
                                : '-'}
                            </span>
                          </div>
                          <div className="detail-row mb-3">
                            <strong className="detail-label">Enrolled Students:</strong>
                            <span className="detail-value">
                              {selectedCourse.enrolledStudents ? selectedCourse.enrolledStudents.length : 0}
                            </span>
                          </div>
                          <div className="detail-row mb-3">
                            <strong className="detail-label">Created At:</strong>
                            <span className="detail-value">
                              {selectedCourse.createdAt 
                                ? new Date(selectedCourse.createdAt).toLocaleString() 
                                : '-'}
                            </span>
                          </div>
                        </Col>
                      </Row>
                    </div>

                    <div className="mt-4">
                      <h5 className="mb-3">Enrolled Students</h5>
                      {getCourseStudents().length > 0 ? (
                        <div className="table-responsive">
                          <Table striped bordered hover size="sm">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Student ID</th>
                                <th>Full Name</th>
                                <th>Grade</th>
                                <th>Contact Number</th>
                                <th>Parent Name</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getCourseStudents().map((student, index) => (
                                <tr key={student.id}>
                                  <td>{index + 1}</td>
                                  <td><code>{student.id}</code></td>
                                  <td>{student.fullName}</td>
                                  <td>{student.grade}</td>
                                  <td>{student.contactNumber}</td>
                                  <td>{student.parentName}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-muted">No students enrolled in this course.</p>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Tab.Pane>

              <Tab.Pane eventKey="lms">
                <Card className="mb-3">
                  <Card.Header>
                    <h5 className="mb-0">Upload Learning Material</h5>
                  </Card.Header>
                  <Card.Body>
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

                <div>
                  <h5 className="mb-4">Learning Materials ({lmsContent.length})</h5>
                  {lmsContent.length === 0 ? (
                    <Card>
                      <Card.Body>
                        <p className="text-muted text-center py-4 mb-0">No learning materials uploaded yet.</p>
                      </Card.Body>
                    </Card>
                  ) : (
                    <Row className="g-3">
                      {lmsContent.map((content, index) => (
                        <Col key={content.id} xs={12} sm={6} md={4} lg={3}>
                          <Card className="h-100 shadow-sm">
                            <Card.Body className="d-flex flex-column">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="mb-0 flex-grow-1">{content.title}</h6>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteLmsContent(content.id)}
                                  className="ms-2"
                                  style={{ flexShrink: 0 }}
                                >
                                  ×
                                </Button>
                              </div>
                              <div className="mb-2">
                                <span className={`badge ${
                                  content.type === 'text' ? 'bg-primary' :
                                  content.type === 'image' ? 'bg-success' :
                                  content.type === 'pdf' ? 'bg-danger' :
                                  'bg-info'
                                }`}>
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
          <Table striped bordered hover className="operators-table d-none d-lg-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Course Name</th>
                <th>Subject</th>
                <th>Grade</th>
                <th>Course Fee</th>
                <th>Payment %</th>
                <th>Students</th>
                <th>Actions</th>
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
                    <td>{coursesStartIndex + index + 1}</td>
                    <td>{course.courseName}</td>
                    <td>{course.subject || '-'}</td>
                    <td>{course.grade}</td>
                    <td>{course.courseFee ? `Rs. ${parseFloat(course.courseFee).toFixed(2)}` : '-'}</td>
                    <td>{course.teacherPaymentPercentage ? `${course.teacherPaymentPercentage}%` : '-'}</td>
                    <td>{course.enrolledStudents ? course.enrolledStudents.length : 0}</td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewCourse(course)}
                        className="action-btn"
                      >
                        Manage
                      </Button>
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
                          <strong>Fee:</strong> {course.courseFee ? `Rs. ${parseFloat(course.courseFee).toFixed(2)}` : '-'}
                        </p>
                        <p className="text-muted small mb-2">
                          <strong>Payment %:</strong> {course.teacherPaymentPercentage ? `${course.teacherPaymentPercentage}%` : '-'} | 
                          <strong> Students:</strong> {course.enrolledStudents ? course.enrolledStudents.length : 0}
                        </p>
                        <div className="student-card-actions">
                          <div className="student-actions-grid">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleViewCourse(course)}
                              className="action-btn"
                            >
                              Manage
                            </Button>
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
          <Table striped bordered hover className="operators-table d-none d-lg-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Full Name</th>
                <th>Grade</th>
                <th>Contact Number</th>
                <th>Parent Name</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No students enrolled in your courses.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, index) => (
                  <tr key={student.id}>
                    <td>{studentsStartIndex + index + 1}</td>
                    <td>{student.fullName}</td>
                    <td>{student.grade}</td>
                    <td>{student.contactNumber}</td>
                    <td>{student.parentName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          <div className="d-lg-none">
            {paginatedStudents.length === 0 ? (
              <div className="text-center text-muted py-5">
                <p>No students enrolled in your courses.</p>
              </div>
            ) : (
              <div className="student-cards-container">
                {paginatedStudents.map((student, index) => (
                  <Card key={student.id} className="student-card mb-3">
                    <Card.Body>
                      <div className="student-card-header mb-2">
                        <h5 className="student-card-name mb-1">{student.fullName}</h5>
                        <p className="text-muted small mb-1">
                          <strong>Grade:</strong> {student.grade}
                        </p>
                        <p className="text-muted small mb-1">
                          <strong>Contact:</strong> {student.contactNumber}
                        </p>
                        <p className="text-muted small mb-0">
                          <strong>Parent:</strong> {student.parentName}
                        </p>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {myStudents.length > 0 && (
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
    return (
      <div>
        <div className="operators-header mb-4">
          <div>
            <h2 className="dashboard-title">Income</h2>
            <p className="dashboard-subtitle">Your payment and income information</p>
          </div>
        </div>

        <Row className="g-3 mb-4">
          <Col xs={12} md={4}>
            <Card className="dashboard-stat-card h-100">
              <Card.Body>
                <div className="stat-icon">
                  <HiOutlineCurrencyDollar />
                </div>
                <h3 className="stat-number">{loading ? '...' : `Rs. ${stats.totalIncome.toFixed(2)}`}</h3>
                <p className="stat-label">Total Expected Income</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card className="dashboard-stat-card h-100">
              <Card.Body>
                <div className="stat-icon text-success">
                  <HiOutlineCurrencyDollar />
                </div>
                <h3 className="stat-number text-success">{loading ? '...' : `Rs. ${stats.paidIncome.toFixed(2)}`}</h3>
                <p className="stat-label">Paid Income</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card className="dashboard-stat-card h-100">
              <Card.Body>
                <div className="stat-icon text-danger">
                  <HiOutlineCurrencyDollar />
                </div>
                <h3 className="stat-number text-danger">{loading ? '...' : `Rs. ${stats.pendingIncome.toFixed(2)}`}</h3>
                <p className="stat-label">Pending Income</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card>
          <Card.Body>
            <h5 className="mb-3">Payment Status</h5>
            {stats.totalIncome > 0 ? (
              <div>
                <p>
                  <strong>Payment Completion:</strong> {((stats.paidIncome / stats.totalIncome) * 100).toFixed(1)}%
                </p>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar bg-success" 
                    role="progressbar" 
                    style={{ width: `${(stats.paidIncome / stats.totalIncome) * 100}%` }}
                  >
                    {((stats.paidIncome / stats.totalIncome) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted">No income data available.</p>
            )}
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
      <TeacherSidebar activeItem={activeItem} onItemClick={handleItemClick} className={sidebarOpen ? 'open' : ''} onLogout={handleLogout} />
      <div className="dashboard-content">
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
                <div className="dashboard-header mb-4">
                  <h2 className="dashboard-title">Dashboard</h2>
                  <p className="dashboard-subtitle">Welcome back, {teacher.name || teacher.email}</p>
                </div>

                <Row className="g-3">
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineBookOpen />
                        </div>
                        <h3 className="stat-number">{loading ? '...' : stats.myCourses}</h3>
                        <p className="stat-label">My Courses</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineUserGroup />
                        </div>
                        <h3 className="stat-number">{loading ? '...' : stats.myStudents}</h3>
                        <p className="stat-label">My Students</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineCurrencyDollar />
                        </div>
                        <h3 className="stat-number">{loading ? '...' : `Rs. ${stats.paidIncome.toFixed(2)}`}</h3>
                        <p className="stat-label">Paid Income</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="dashboard-stat-card h-100">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineClipboardDocumentCheck />
                        </div>
                        <h3 className="stat-number">{loading ? '...' : stats.attendanceRecords}</h3>
                        <p className="stat-label">Attendance Records</p>
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

export default TeacherDashboard;

