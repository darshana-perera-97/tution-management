import React, { useState, useEffect } from 'react';
import { Container, Form, Table, Alert, Card } from 'react-bootstrap';
import '../App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5253';

const Reports = () => {
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeachers();
    fetchCourses();
    fetchStudents();
    fetchPayments();
  }, []);

  useEffect(() => {
    if (selectedTeacherId) {
      generateReport();
    } else {
      setReportData([]);
    }
  }, [selectedTeacherId, payments, courses, students]);

  const fetchTeachers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teachers`);
      const data = await response.json();
      if (data.success) {
        setTeachers(data.teachers);
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setError('Unable to fetch teachers. Please try again later.');
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses`);
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/students`);
      const data = await response.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments`);
      const data = await response.json();
      if (data.success) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  const generateReport = () => {
    if (!selectedTeacherId) {
      setReportData([]);
      return;
    }

    setLoading(true);
    try {
      // Get all courses taught by selected teacher
      const teacherCourses = courses.filter(course => course.teacherId === selectedTeacherId);
      
      if (teacherCourses.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }

      const currentDate = new Date();
      const report = [];

      // Process each course
      teacherCourses.forEach(course => {
        // Get students enrolled in this course
        const enrolledStudents = students.filter(student =>
          course.enrolledStudents &&
          Array.isArray(course.enrolledStudents) &&
          course.enrolledStudents.includes(student.id)
        );

        if (enrolledStudents.length === 0) {
          return;
        }

        // Process each enrolled student
        enrolledStudents.forEach(student => {
          const enrollmentDate = new Date(student.createdAt);
          const courseCreatedDate = new Date(course.createdAt);
          const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;

          // Calculate from enrollment month to current month
          let currentMonth = new Date(enrollmentDateForCourse.getFullYear(), enrollmentDateForCourse.getMonth(), 1);
          const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

          while (currentMonth <= lastDayOfCurrentMonth) {
            const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
            const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
            const lastDayOfPaymentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

            if (enrollmentDateForCourse <= lastDayOfPaymentMonth) {
              // Check if payment exists for this student, course, and month
              const payment = payments.find(
                p => p.studentId === student.id &&
                     p.monthKey === monthKey &&
                     p.courseId === course.id &&
                     p.status === 'Paid'
              );

              const courseFee = parseFloat(course.courseFee) || 0;
              const teacherPercentage = parseFloat(course.teacherPaymentPercentage) || 0;
              const teacherIncome = (courseFee * teacherPercentage) / 100;

              // Check if this month/course combination already exists in report
              const existingReport = report.find(
                r => r.monthKey === monthKey && r.courseId === course.id
              );

              if (existingReport) {
                // Add to existing entry
                existingReport.totalFee += courseFee;
                existingReport.teacherIncome += teacherIncome;
                existingReport.paidFee += payment ? courseFee : 0;
                existingReport.paidTeacherIncome += payment ? teacherIncome : 0;
                existingReport.studentCount += 1;
                if (payment) {
                  existingReport.paidStudentCount += 1;
                }
              } else {
                // Create new entry
                report.push({
                  monthKey,
                  monthName,
                  courseId: course.id,
                  courseName: course.courseName,
                  subject: course.subject || '-',
                  grade: course.grade,
                  totalFee: courseFee,
                  teacherIncome: teacherIncome,
                  paidFee: payment ? courseFee : 0,
                  paidTeacherIncome: payment ? teacherIncome : 0,
                  studentCount: 1,
                  paidStudentCount: payment ? 1 : 0
                });
              }
            }

            currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
          }
        });
      });

      // Sort by month (newest first) and then by course name
      report.sort((a, b) => {
        if (a.monthKey !== b.monthKey) {
          return b.monthKey.localeCompare(a.monthKey);
        }
        return a.courseName.localeCompare(b.courseName);
      });

      setReportData(report);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Error generating report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTeacher = () => {
    return teachers.find(t => t.id === selectedTeacherId);
  };

  const calculateTotals = () => {
    return reportData.reduce((totals, item) => {
      totals.totalFee += item.totalFee;
      totals.teacherIncome += item.teacherIncome;
      totals.paidFee += item.paidFee;
      totals.paidTeacherIncome += item.paidTeacherIncome;
      return totals;
    }, {
      totalFee: 0,
      teacherIncome: 0,
      paidFee: 0,
      paidTeacherIncome: 0
    });
  };

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div>
          <h2 className="dashboard-title">Reports</h2>
          <p className="dashboard-subtitle">View teacher income reports by course and month</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Body>
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
        </Card.Body>
      </Card>

      {selectedTeacherId && getSelectedTeacher() && (
        <div className="mb-3">
          <Card>
            <Card.Body>
              <h5 className="mb-3">Teacher: {getSelectedTeacher().name}</h5>
              {loading ? (
                <p className="text-muted">Loading report...</p>
              ) : reportData.length === 0 ? (
                <p className="text-muted">No data available for this teacher.</p>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table striped bordered hover className="operators-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Course</th>
                          <th>Subject</th>
                          <th>Grade</th>
                          <th>Total Course Fee</th>
                          <th>Teacher Income (%)</th>
                          <th>Paid Course Fee</th>
                          <th>Paid Teacher Income</th>
                          <th>Students</th>
                          <th>Paid Students</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((item, index) => (
                          <tr key={`${item.monthKey}-${item.courseId}-${index}`}>
                            <td><strong>{item.monthName}</strong></td>
                            <td>{item.courseName}</td>
                            <td>{item.subject}</td>
                            <td>{item.grade}</td>
                            <td>Rs. {item.totalFee.toFixed(2)}</td>
                            <td>Rs. {item.teacherIncome.toFixed(2)}</td>
                            <td>
                              <span className={item.paidFee > 0 ? 'text-success' : 'text-muted'}>
                                Rs. {item.paidFee.toFixed(2)}
                              </span>
                            </td>
                            <td>
                              <span className={item.paidTeacherIncome > 0 ? 'text-success' : 'text-muted'}>
                                Rs. {item.paidTeacherIncome.toFixed(2)}
                              </span>
                            </td>
                            <td>{item.studentCount}</td>
                            <td>
                              <span className={item.paidStudentCount > 0 ? 'text-success' : 'text-muted'}>
                                {item.paidStudentCount}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-info">
                          <td colSpan="4"><strong>Total</strong></td>
                          <td><strong>Rs. {calculateTotals().totalFee.toFixed(2)}</strong></td>
                          <td><strong>Rs. {calculateTotals().teacherIncome.toFixed(2)}</strong></td>
                          <td><strong>Rs. {calculateTotals().paidFee.toFixed(2)}</strong></td>
                          <td><strong>Rs. {calculateTotals().paidTeacherIncome.toFixed(2)}</strong></td>
                          <td colSpan="2"></td>
                        </tr>
                      </tfoot>
                    </Table>
                  </div>

                  <div className="mt-3 p-3 bg-light rounded">
                    <div className="row">
                      <div className="col-md-6">
                        <p className="mb-1">
                          <strong>Total Expected Income:</strong> Rs. {calculateTotals().teacherIncome.toFixed(2)}
                        </p>
                        <p className="mb-1">
                          <strong>Total Paid Income:</strong> 
                          <span className="text-success"> Rs. {calculateTotals().paidTeacherIncome.toFixed(2)}</span>
                        </p>
                      </div>
                      <div className="col-md-6">
                        <p className="mb-1">
                          <strong>Pending Income:</strong>
                          <span className="text-danger"> Rs. {(calculateTotals().teacherIncome - calculateTotals().paidTeacherIncome).toFixed(2)}</span>
                        </p>
                        <p className="mb-0">
                          <strong>Payment Status:</strong> 
                          {calculateTotals().teacherIncome > 0 
                            ? ` ${((calculateTotals().paidTeacherIncome / calculateTotals().teacherIncome) * 100).toFixed(1)}% Paid`
                            : ' N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </div>
      )}
    </Container>
  );
};

export default Reports;

