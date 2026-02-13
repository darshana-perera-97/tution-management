import React, { useState, useEffect } from 'react';
import { Container, Form, Table, Alert, Card, Row, Col, Spinner } from 'react-bootstrap';
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
        <Alert variant="danger" className="mb-3" onClose={() => setError('')} dismissible>
          <Alert.Heading>Error</Alert.Heading>
          {error}
        </Alert>
      )}

      {/* Initial Loading */}
      {initialLoading && (
        <Card className="mb-4">
          <Card.Body>
            <div className="text-center py-5">
              <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-3 text-muted">Loading data...</p>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Filters */}
      {!initialLoading && (
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Select Teacher</strong></Form.Label>
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
                  <Form.Label><strong>Select Course</strong></Form.Label>
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
                  <Form.Label><strong>Select Month</strong></Form.Label>
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
        <Card className="mb-4">
          <Card.Body>
            <div className="text-center py-5">
              <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-3 text-muted">Generating report...</p>
            </div>
          </Card.Body>
        </Card>
      )}

      {!loading && reportData && (
        <div>
          {/* Summary Card */}
          <Card className="mb-4 border-primary">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                Report: {reportData.course.name} - {reportData.month.name}
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h6 className="mb-3 text-start">Course Information</h6>
                  <div className="text-start">
                    <p className="mb-1"><strong>Course:</strong> {reportData.course.name}</p>
                    <p className="mb-1"><strong>Subject:</strong> {reportData.course.subject}</p>
                    <p className="mb-1"><strong>Grade:</strong> {reportData.course.grade}</p>
                    <p className="mb-1"><strong>Teacher:</strong> {reportData.teacher.name}</p>
                    <p className="mb-0"><strong>Course Fee:</strong> Rs. {reportData.course.fee.toFixed(2)}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <h6 className="mb-3">Summary Statistics</h6>
                  <Row>
                    <Col xs={6}>
                      <div className="mb-2">
                        <small className="text-muted">Total Students</small>
                        <h5>{reportData.summary.totalStudents}</h5>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="mb-2">
                        <small className="text-muted">Paid Students</small>
                        <h5 className="text-success">{reportData.summary.paidStudents}</h5>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="mb-2">
                        <small className="text-muted">Unpaid Students</small>
                        <h5 className="text-danger">{reportData.summary.unpaidStudents}</h5>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div className="mb-2">
                        <small className="text-muted">Attendance Rate</small>
                        <h5>{reportData.summary.averageAttendanceRate}%</h5>
                      </div>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Financial Summary */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Financial Summary</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded mb-2">
                    <small className="text-muted d-block">Total Fee</small>
                    <h5>Rs. {reportData.summary.totalFee.toFixed(2)}</h5>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded mb-2">
                    <small className="text-muted d-block">Paid Fee</small>
                    <h5 className="text-success">Rs. {reportData.summary.paidFee.toFixed(2)}</h5>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded mb-2">
                    <small className="text-muted d-block">Pending Fee</small>
                    <h5 className="text-danger">Rs. {reportData.summary.pendingFee.toFixed(2)}</h5>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded mb-2">
                    <small className="text-muted d-block">Teacher Income</small>
                    <h5>Rs. {reportData.summary.totalTeacherIncome.toFixed(2)}</h5>
                    <small className="text-success">Paid: Rs. {reportData.summary.paidTeacherIncome.toFixed(2)}</small>
                  </div>
                </Col>
              </Row>
        </Card.Body>
      </Card>

          {/* Students Table */}
          <Card>
            <Card.Header>
              <h6 className="mb-0">Student Details</h6>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table striped bordered hover>
                        <thead>
                          <tr>
                      <th>#</th>
                      <th>Student Name</th>
                      <th>Contact</th>
                            <th>Grade</th>
                      <th>Payment Status</th>
                      <th>Present</th>
                      <th>Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                    {reportData.students.length === 0 ? (
                            <tr>
                        <td colSpan="7" className="text-center text-muted py-4">
                          No students found.
                              </td>
                            </tr>
                          ) : (
                      reportData.students.map((student, index) => (
                        <tr key={student.id}>
                          <td>{index + 1}</td>
                          <td><strong>{student.name}</strong></td>
                          <td>{student.contact}</td>
                          <td>{student.grade}</td>
                          <td>
                            {student.isPaid ? (
                              <span className="badge bg-success">Paid</span>
                            ) : (
                              <span className="badge bg-danger">Unpaid</span>
                            )}
                                </td>
                          <td className="text-success">{student.attendance.present}</td>
                                <td>
                            <span className={parseFloat(student.attendance.rate) >= 75 ? 'text-success' : 'text-warning'}>
                              {student.attendance.rate}%
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </Table>
                              </div>
                            </Card.Body>
                          </Card>
                        </div>
                      )}
                      
      {!loading && !reportData && selectedTeacherId && selectedCourseId && selectedMonthKey && (
        <Card className="mb-4">
                        <Card.Body>
            <p className="text-muted text-center">No data available for the selected filters.</p>
            </Card.Body>
          </Card>
      )}
    </Container>
  );
};

export default Reports;
