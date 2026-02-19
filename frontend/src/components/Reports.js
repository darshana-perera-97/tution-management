import React, { useState, useEffect } from 'react';
import { Container, Form, Table, Alert, Card, Row, Col, Spinner } from 'react-bootstrap';
import { 
  HiOutlineUsers, 
  HiOutlineCheckCircle, 
  HiOutlineXCircle, 
  HiOutlineChartBar,
  HiOutlineCurrencyDollar,
  HiOutlineBanknotes,
  HiOutlineArrowTrendingUp,
  HiOutlineUserGroup,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineAcademicCap
} from 'react-icons/hi2';
import '../App.css';
import API_URL from '../config';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const Reports = () => {
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedMonthKey, setSelectedMonthKey] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      setError('');
      try {
        await Promise.all([
          fetchTeachers(),
          fetchCourses(),
          fetchStudents(),
          fetchPayments(),
          fetchAttendance()
        ]);
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load data. Please refresh the page.');
      } finally {
        setInitialLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    // Reset course and month when teacher changes
    if (!selectedTeacherId) {
      setSelectedCourseId('');
      setSelectedMonthKey('');
      setReportData(null);
    } else {
      setSelectedCourseId('');
      setSelectedMonthKey('');
      setReportData(null);
    }
  }, [selectedTeacherId]);

  useEffect(() => {
    // Reset month when course changes
    if (!selectedCourseId) {
      setSelectedMonthKey('');
      setReportData(null);
    } else {
      setSelectedMonthKey('');
      setReportData(null);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    // Generate report when all filters are selected
    if (selectedTeacherId && selectedCourseId && selectedMonthKey) {
      generateReport();
    } else {
      setReportData(null);
    }
  }, [selectedTeacherId, selectedCourseId, selectedMonthKey, payments, attendance, students]);

  const fetchTeachers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teachers`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setTeachers(data.teachers);
      } else {
        throw new Error(data.message || 'Failed to fetch teachers');
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
      throw new Error('Unable to fetch teachers. Please check your connection and try again.');
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses);
      } else {
        throw new Error(data.message || 'Failed to fetch courses');
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      throw new Error('Unable to fetch courses. Please check your connection and try again.');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/students`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setStudents(data.students);
      } else {
        throw new Error(data.message || 'Failed to fetch students');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      throw new Error('Unable to fetch students. Please check your connection and try again.');
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setPayments(data.payments);
      } else {
        throw new Error(data.message || 'Failed to fetch payments');
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      throw new Error('Unable to fetch payments. Please check your connection and try again.');
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`${API_URL}/api/attendance`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setAttendance(data.attendance);
      } else {
        throw new Error(data.message || 'Failed to fetch attendance');
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      throw new Error('Unable to fetch attendance. Please check your connection and try again.');
    }
  };

  // Get courses for selected teacher
  const getTeacherCourses = () => {
    if (!selectedTeacherId) return [];
    return courses.filter(course => course.teacherId === selectedTeacherId);
  };

  // Get available months for selected course
  const getAvailableMonths = () => {
    if (!selectedCourseId) return [];
    
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return [];

        const enrolledStudents = students.filter(student =>
          course.enrolledStudents &&
          Array.isArray(course.enrolledStudents) &&
          course.enrolledStudents.includes(student.id)
        );

    if (enrolledStudents.length === 0) return [];

    const monthsSet = new Set();
    const currentDate = new Date();

        enrolledStudents.forEach(student => {
          const enrollmentDate = new Date(student.createdAt);
          const courseCreatedDate = new Date(course.createdAt);
          const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;

          let currentMonth = new Date(enrollmentDateForCourse.getFullYear(), enrollmentDateForCourse.getMonth(), 1);
          const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

          while (currentMonth <= lastDayOfCurrentMonth) {
            const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
            const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
        monthsSet.add(JSON.stringify({ monthKey, monthName }));
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }
    });

    return Array.from(monthsSet)
      .map(item => JSON.parse(item))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  };

  const generateReport = () => {
    if (!selectedTeacherId || !selectedCourseId || !selectedMonthKey) {
      setReportData(null);
      return;
    }

    setLoading(true);
    try {
      const course = courses.find(c => c.id === selectedCourseId);
      if (!course) {
        setReportData(null);
        setLoading(false);
        return;
      }

      // Get enrolled students
      const enrolledStudents = students.filter(student =>
        course.enrolledStudents &&
        Array.isArray(course.enrolledStudents) &&
        course.enrolledStudents.includes(student.id)
      );

      // Get payments for this course and month
      const monthPayments = payments.filter(
        p => p.courseId === selectedCourseId && p.monthKey === selectedMonthKey
      );

      // Get attendance for this course and month
      const [year, month] = selectedMonthKey.split('-');
      const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      const monthAttendance = attendance.filter(att => {
        if (att.courseId !== selectedCourseId) return false;
        const attDate = new Date(att.date);
        return attDate >= monthStart && attDate <= monthEnd;
      });

      // Calculate attendance statistics per student
      const studentAttendanceMap = {};
      monthAttendance.forEach(att => {
        if (!studentAttendanceMap[att.studentId]) {
          studentAttendanceMap[att.studentId] = { present: 0, absent: 0, total: 0 };
        }
        studentAttendanceMap[att.studentId].total++;
        if (att.status === 'Present') {
          studentAttendanceMap[att.studentId].present++;
              } else {
          studentAttendanceMap[att.studentId].absent++;
        }
      });

      // Get paid students
      const paidStudentIds = new Set(
        monthPayments
          .filter(p => p.status === 'Paid')
          .map(p => p.studentId)
      );

      // Calculate totals
      const courseFee = parseFloat(course.courseFee) || 0;
      const teacherPercentage = parseFloat(course.teacherPaymentPercentage) || 0;
      const teacherIncomePerStudent = (courseFee * teacherPercentage) / 100;

      const totalStudents = enrolledStudents.length;
      const paidStudents = paidStudentIds.size;
      const unpaidStudents = totalStudents - paidStudents;
      const totalFee = courseFee * totalStudents;
      const totalTeacherIncome = teacherIncomePerStudent * totalStudents;
      const paidFee = courseFee * paidStudents;
      const paidTeacherIncome = teacherIncomePerStudent * paidStudents;
      const pendingFee = totalFee - paidFee;
      const pendingTeacherIncome = totalTeacherIncome - paidTeacherIncome;

      // Calculate attendance statistics
      const totalAttendanceDays = monthAttendance.length;
      const totalPresentDays = monthAttendance.filter(a => a.status === 'Present').length;
      const totalAbsentDays = totalAttendanceDays - totalPresentDays;
      const averageAttendanceRate = totalStudents > 0 
        ? ((Object.keys(studentAttendanceMap).length / totalStudents) * 100).toFixed(1)
        : '0.0';

      // Prepare student details
      const studentDetails = enrolledStudents.map(student => {
        const isPaid = paidStudentIds.has(student.id);
        const attStats = studentAttendanceMap[student.id] || { present: 0, absent: 0, total: 0 };
        const attendanceRate = attStats.total > 0 
          ? ((attStats.present / attStats.total) * 100).toFixed(1)
          : '0.0';

        return {
          id: student.id,
          name: student.fullName,
          contact: student.contactNumber,
          grade: student.grade,
          isPaid,
          attendance: {
            present: attStats.present,
            absent: attStats.absent,
            total: attStats.total,
            rate: attendanceRate
          }
        };
      });

      const monthName = getAvailableMonths().find(m => m.monthKey === selectedMonthKey)?.monthName || selectedMonthKey;

      setReportData({
        course: {
          id: course.id,
          name: course.courseName,
          subject: course.subject || '-',
          grade: course.grade,
          fee: courseFee,
          teacherPercentage
        },
        month: {
          key: selectedMonthKey,
          name: monthName
        },
        teacher: {
          id: selectedTeacherId,
          name: teachers.find(t => t.id === selectedTeacherId)?.name || 'Unknown'
        },
        summary: {
          totalStudents,
          paidStudents,
          unpaidStudents,
          totalFee,
          totalTeacherIncome,
          paidFee,
          paidTeacherIncome,
          pendingFee,
          pendingTeacherIncome,
          totalAttendanceDays,
          totalPresentDays,
          totalAbsentDays,
          averageAttendanceRate
        },
        students: studentDetails
      });
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Error generating report:', err);
      const errorMessage = err.message || 'Error generating report. Please check your connection and try again.';
      setError(errorMessage);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTeacher = () => {
    return teachers.find(t => t.id === selectedTeacherId);
  };

  const getSelectedCourse = () => {
    return courses.find(c => c.id === selectedCourseId);
  };

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div>
          <h2 className="dashboard-title">Reports</h2>
          <p className="dashboard-subtitle">View detailed reports by teacher, course, and month</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3 alert-custom" onClose={() => setError('')} dismissible style={{
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#dc2626',
          border: 'none',
          borderRadius: '8px'
        }}>
          {error}
        </Alert>
      )}

      {/* Initial Loading */}
      {initialLoading && (
        <Card className="mb-4" style={{
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          background: '#ffffff'
        }}>
          <Card.Body style={{ padding: '24px' }}>
            <div className="text-center py-5">
              <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-3" style={{ color: '#64748b' }}>Loading data...</p>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Filters */}
      {!initialLoading && (
      <Card className="mb-4" style={{
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        background: '#ffffff'
      }}>
        <Card.Body style={{ padding: '24px' }}>
          <Row>
            <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label className="form-label-custom"><strong>Select Teacher</strong></Form.Label>
            <Form.Select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="form-control-custom"
            >
              <option value="">-- Select a teacher --</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} {teacher.subject ? `(${teacher.subject})` : ''}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
            </Col>
            {selectedTeacherId && (
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom"><strong>Select Course</strong></Form.Label>
                  <Form.Select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="form-control-custom"
                  >
                    <option value="">-- Select a course --</option>
                    {getTeacherCourses().map(course => (
                      <option key={course.id} value={course.id}>
                        {course.courseName} ({course.subject || 'N/A'})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}
            {selectedTeacherId && selectedCourseId && (
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-custom"><strong>Select Month</strong></Form.Label>
                  <Form.Select
                    value={selectedMonthKey}
                    onChange={(e) => setSelectedMonthKey(e.target.value)}
                    className="form-control-custom"
                  >
                    <option value="">-- Select a month --</option>
                    {getAvailableMonths().map(month => (
                      <option key={month.monthKey} value={month.monthKey}>
                        {month.monthName}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>
      )}

      {/* Report Data Loading */}
      {loading && (
        <Card className="mb-4" style={{
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          background: '#ffffff'
        }}>
          <Card.Body style={{ padding: '24px' }}>
            <div className="text-center py-5">
              <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-3" style={{ color: '#64748b' }}>Generating report...</p>
            </div>
          </Card.Body>
        </Card>
      )}

      {!loading && reportData && (
        <div>
          {/* Summary Card */}
          <Card className="mb-4" style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            background: '#ffffff'
          }}>
            <Card.Header style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '20px 24px',
              borderRadius: '12px 12px 0 0'
            }}>
              <h5 className="mb-0" style={{ 
                fontSize: '18px', 
                fontWeight: '700', 
                color: '#0f172a' 
              }}>
                Report: {reportData.course.name} - {reportData.month.name}
              </h5>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              <h6 className="mb-4" style={{ 
                fontSize: '14px', 
                fontWeight: '700', 
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Summary Statistics</h6>
              <Row>
                <Col xs={6} md={3}>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    cursor: 'default',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3b82f6'
                      }}>
                        <HiOutlineUsers size={24} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'left'
                    }}>Total Students</div>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: '#0f172a',
                      textAlign: 'left'
                    }}>{reportData.summary.totalStudents}</div>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    cursor: 'default',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#059669'
                      }}>
                        <HiOutlineCheckCircle size={24} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'left'
                    }}>Paid Students</div>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: '#059669',
                      textAlign: 'left'
                    }}>{reportData.summary.paidStudents}</div>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    cursor: 'default',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#dc2626'
                      }}>
                        <HiOutlineXCircle size={24} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'left'
                    }}>Unpaid Students</div>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: '#dc2626',
                      textAlign: 'left'
                    }}>{reportData.summary.unpaidStudents}</div>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    cursor: 'default',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d97706'
                      }}>
                        <HiOutlineChartBar size={24} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'left'
                    }}>Attendance Rate</div>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: '#0f172a',
                      textAlign: 'left'
                    }}>{reportData.summary.averageAttendanceRate}%</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Financial Summary */}
          <Card className="mb-4" style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            background: '#ffffff'
          }}>
            <Card.Header style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '20px 24px',
              borderRadius: '12px 12px 0 0'
            }}>
              <h6 className="mb-0" style={{ 
                fontSize: '14px', 
                fontWeight: '700', 
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Financial Summary</h6>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              <Row>
                <Col xs={6} md={3}>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    cursor: 'default',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3b82f6'
                      }}>
                        <HiOutlineCurrencyDollar size={24} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'left'
                    }}>Total Fee</div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#0f172a',
                      lineHeight: '1.2',
                      textAlign: 'left'
                    }}>Rs. {reportData.summary.totalFee.toFixed(2)}</div>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    cursor: 'default',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#059669'
                      }}>
                        <HiOutlineCheckCircle size={24} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'left'
                    }}>Paid Fee</div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#059669',
                      lineHeight: '1.2',
                      textAlign: 'left'
                    }}>Rs. {reportData.summary.paidFee.toFixed(2)}</div>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    cursor: 'default',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#dc2626'
                      }}>
                        <HiOutlineXCircle size={24} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'left'
                    }}>Pending Fee</div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#dc2626',
                      lineHeight: '1.2',
                      textAlign: 'left'
                    }}>Rs. {reportData.summary.pendingFee.toFixed(2)}</div>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    cursor: 'default',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(139, 92, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#7c3aed'
                      }}>
                        <HiOutlineUserGroup size={24} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'left'
                    }}>Teacher Income</div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#0f172a',
                      lineHeight: '1.2',
                      marginBottom: '8px',
                      textAlign: 'left'
                    }}>Rs. {reportData.summary.totalTeacherIncome.toFixed(2)}</div>
                    <div style={{
                      fontSize: '11px',
                      color: '#059669',
                      fontWeight: '600',
                      padding: '4px 8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '6px',
                      display: 'inline-block',
                      textAlign: 'left'
                    }}>
                      Paid: Rs. {reportData.summary.paidTeacherIncome.toFixed(2)}
                    </div>
                  </div>
                </Col>
              </Row>
        </Card.Body>
      </Card>

          {/* Students Table - Revamped */}
                  <div className="operators-table-container">
            <div className="table-header-section">
              <h3>Student Details ({reportData.students.length} students)</h3>
            </div>
            <div className="table-responsive">
              <Table className="operators-table">
                        <thead>
                          <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Student Name</th>
                    <th>Contact</th>
                    <th style={{ width: '100px' }}>Grade</th>
                    <th style={{ width: '140px' }}>Payment Status</th>
                    <th style={{ width: '120px' }}>Attendance</th>
                    <th style={{ width: '150px' }}>Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                  {reportData.students.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5" style={{ color: '#64748b' }}>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          gap: '12px' 
                        }}>
                          <HiOutlineUsers size={48} style={{ opacity: 0.3 }} />
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                            No students found.
                          </p>
                        </div>
                              </td>
                            </tr>
                          ) : (
                    reportData.students.map((student, index) => (
                      <tr key={student.id} style={{ transition: 'all 0.2s ease' }}>
                        <td style={{ 
                          padding: '16px 24px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#64748b'
                        }}>
                          {index + 1}
                                </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px' 
                          }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              display: 'flex',
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
                                {student.name}
                        </div>
                              </div>
                                </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            fontSize: '14px',
                            color: '#475569'
                          }}>
                            <HiOutlinePhone size={16} style={{ color: '#94a3b8' }} />
                            <span>{student.contact}</span>
                                </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
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
                        <td style={{ padding: '16px 24px' }}>
                          {student.isPaid ? (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#059669',
                              border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}>
                              <HiOutlineCheckCircle size={14} />
                              <span>Paid</span>
                                </div>
                          ) : (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#dc2626',
                              border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                              <HiOutlineXCircle size={14} />
                              <span>Unpaid</span>
                                </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px' 
                          }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#059669'
                            }}>
                              <HiOutlineCheckCircle size={16} />
                                </div>
                            <div>
                              <div style={{ 
                                fontSize: '16px', 
                                fontWeight: '700', 
                                color: '#059669',
                                lineHeight: '1.2'
                              }}>
                                {student.attendance.present}
                              </div>
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#94a3b8',
                                fontWeight: '500'
                              }}>
                                / {student.attendance.total}
                        </div>
                            </div>
                            </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              justifyContent: 'space-between'
                            }}>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: '700',
                                color: parseFloat(student.attendance.rate) >= 75 ? '#059669' : 
                                       parseFloat(student.attendance.rate) >= 50 ? '#d97706' : '#dc2626'
                              }}>
                                {student.attendance.rate}%
                              </span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '6px',
                              borderRadius: '3px',
                              background: '#e2e8f0',
                              overflow: 'hidden',
                              position: 'relative'
                            }}>
                              <div style={{
                                width: `${student.attendance.rate}%`,
                                height: '100%',
                                borderRadius: '3px',
                                background: parseFloat(student.attendance.rate) >= 75 ? 
                                           'linear-gradient(90deg, #10b981 0%, #059669 100%)' :
                                           parseFloat(student.attendance.rate) >= 50 ?
                                           'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' :
                                           'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
                  </div>
                      </div>
                      </div>
                      )}
                      
      {!loading && !reportData && selectedTeacherId && selectedCourseId && selectedMonthKey && (
        <Card className="mb-4" style={{
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          background: '#ffffff'
        }}>
          <Card.Body style={{ padding: '24px' }}>
            <p style={{ color: '#64748b', textAlign: 'center', margin: 0 }}>
              No data available for the selected filters.
            </p>
            </Card.Body>
          </Card>
      )}
    </Container>
  );
};

export default Reports;
