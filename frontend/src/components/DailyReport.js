import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import {
  HiOutlineCurrencyDollar,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineUserGroup,
  HiOutlineBanknotes,
  HiOutlineBookOpen,
  HiOutlineClipboardDocumentCheck
} from 'react-icons/hi2';
import '../App.css';
import API_URL from '../config';

const DailyReport = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [teacherPayments, setTeacherPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();

  const isSameDay = (dateA, dateB) => {
    if (!dateA || !dateB) return false;
    const a = new Date(dateA);
    const b = new Date(dateB);
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [studentsRes, coursesRes, paymentsRes, teacherPaymentsRes, attendanceRes] =
          await Promise.all([
            fetch(`${API_URL}/api/students`),
            fetch(`${API_URL}/api/courses`),
            fetch(`${API_URL}/api/payments`),
            fetch(`${API_URL}/api/teacher-payments`),
            fetch(`${API_URL}/api/attendance`)
          ]);

        const studentsData = await studentsRes.json();
        const coursesData = await coursesRes.json();
        const paymentsData = await paymentsRes.json();
        const teacherPaymentsData = await teacherPaymentsRes.json();
        const attendanceData = await attendanceRes.json();

        if (studentsData.success) setStudents(studentsData.students);
        if (coursesData.success) setCourses(coursesData.courses);
        if (paymentsData.success) setPayments(paymentsData.payments || []);
        if (teacherPaymentsData.success) setTeacherPayments(teacherPaymentsData.advancePayments || []);
        if (attendanceData.success) setAttendance(attendanceData.attendance || []);
      } catch (err) {
        console.error('Error fetching daily report data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper: enrich payments with student & course info
  const getAllStudentPaymentsWithInfo = () => {
    return payments
      .map((payment) => {
        const student = students.find((s) => s.id === payment.studentId);
        const course = payment.courseId ? courses.find((c) => c.id === payment.courseId) : null;
        return {
          ...payment,
          studentName: student ? student.fullName : 'Unknown',
          courseName: course ? course.courseName : null,
          amountNumber: parseFloat(payment.amount || 0),
          date: payment.paymentDate || payment.createdAt
        };
      })
      .filter((p) => p.amountNumber > 0);
  };

  const getAllTeacherPaymentsWithInfo = () => {
    return teacherPayments
      .map((payment) => ({
        ...payment,
        amountNumber: parseFloat(payment.amount || 0),
        date: payment.paymentDate || payment.createdAt
      }))
      .filter((p) => p.amountNumber > 0);
  };

  // Daily attendance - number of marked students (present)
  const presentTodayCount = attendance.filter((record) => {
    const recordDate = record.date || record.createdAt;
    const status = (record.status || '').toLowerCase();
    return isSameDay(recordDate, today) && (status === 'present' || status === 'p');
  }).length;

  // Month range for current month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Students who have at least one present attendance this month but no payments this month
  const thisMonthsStudentPayments = getAllStudentPaymentsWithInfo().filter((p) => {
    const date = new Date(p.date);
    return date >= monthStart && date <= monthEnd;
  });

  const paidStudentIdsThisMonth = new Set(
    thisMonthsStudentPayments.map((p) => p.studentId)
  );

  const presentButUnpaidThisMonthCount = students.filter((student) => {
    if (paidStudentIdsThisMonth.has(student.id)) return false;

    const hasPresentAttendanceThisMonth = attendance.some((record) => {
      const recordDate = record.date || record.createdAt;
      const date = new Date(recordDate);
      const status = (record.status || '').toLowerCase();
      return (
        record.studentId === student.id &&
        date >= monthStart &&
        date <= monthEnd &&
        (status === 'present' || status === 'p')
      );
    });

    return hasPresentAttendanceThisMonth;
  }).length;

  // Filter for today's cash flow
  const todaysStudentPayments = getAllStudentPaymentsWithInfo().filter((p) =>
    isSameDay(p.date, today)
  );
  const todaysTeacherPayments = getAllTeacherPaymentsWithInfo().filter((p) =>
    isSameDay(p.date, today)
  );

  const totalMoneyInToday = todaysStudentPayments.reduce(
    (sum, p) => sum + p.amountNumber,
    0
  );
  const totalMoneyOutToday = todaysTeacherPayments.reduce(
    (sum, p) => sum + p.amountNumber,
    0
  );
  const netAmountToday = totalMoneyInToday - totalMoneyOutToday;

  // Amount to be given to institute - assume net positive cash-in after paying teachers
  const amountToInstituteToday = netAmountToday > 0 ? netAmountToday : 0;

  // Table view: courses and individual incomes for today
  const courseIncomeMap = new Map();

  todaysStudentPayments.forEach((payment) => {
    const key = payment.courseId || 'all-courses';
    const existing = courseIncomeMap.get(key) || {
      courseId: payment.courseId || null,
      courseName: payment.courseName || 'All Courses',
      totalIncome: 0,
      studentCount: 0
    };

    existing.totalIncome += payment.amountNumber;
    existing.studentCount += 1;
    courseIncomeMap.set(key, existing);
  });

  const courseIncomeRows = Array.from(courseIncomeMap.values()).sort(
    (a, b) => b.totalIncome - a.totalIncome
  );

  const formattedToday = today.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <Container fluid>
      <div className="operators-header mb-4" style={{ textAlign: 'left' }}>
        <div>
          <h2 className="dashboard-title">Daily Report</h2>
          <p className="dashboard-subtitle">
            Cash flow and attendance overview for {formattedToday}
          </p>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={12} md={3}>
          <Card
            className="dashboard-stat-card h-100"
            style={{
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              background:
                'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)'
            }}
          >
            <Card.Body style={{ padding: '20px', textAlign: 'left' }}>
              <div
                className="stat-icon"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}
              >
                <HiOutlineArrowTrendingUp style={{ fontSize: '24px', color: '#10b981' }} />
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#059669',
                  marginBottom: '4px'
                }}
              >
                Money In (Today)
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#022c22'
                }}
              >
                {loading ? '...' : `Rs ${totalMoneyInToday.toFixed(2)}`}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {todaysStudentPayments.length} cash-in transaction
                {todaysStudentPayments.length === 1 ? '' : 's'}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={3}>
          <Card
            className="dashboard-stat-card h-100"
            style={{
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              background:
                'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(248, 113, 113, 0.05) 100%)'
            }}
          >
            <Card.Body style={{ padding: '20px' }}>
              <div
                className="stat-icon"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}
              >
                <HiOutlineArrowTrendingDown style={{ fontSize: '24px', color: '#ef4444' }} />
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#b91c1c',
                  marginBottom: '4px'
                }}
              >
                Money Out (Today)
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#450a0a'
                }}
              >
                {loading ? '...' : `Rs ${totalMoneyOutToday.toFixed(2)}`}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {todaysTeacherPayments.length} cash-out transaction
                {todaysTeacherPayments.length === 1 ? '' : 's'}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={3}>
          <Card
            className="dashboard-stat-card h-100"
            style={{
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              background:
                'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)'
            }}
          >
            <Card.Body style={{ padding: '20px' }}>
              <div
                className="stat-icon"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}
              >
                <HiOutlineCurrencyDollar style={{ fontSize: '24px', color: '#3b82f6' }} />
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#1d4ed8',
                  marginBottom: '4px'
                }}
              >
                Net Amount (Today)
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: netAmountToday >= 0 ? '#1e3a8a' : '#b45309'
                }}
              >
                {loading ? '...' : `Rs ${netAmountToday.toFixed(2)}`}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {netAmountToday >= 0 ? 'Profit' : 'Loss'} for the day
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={3}>
          <Card
            className="dashboard-stat-card h-100"
            style={{
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              background:
                'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)'
            }}
          >
            <Card.Body style={{ padding: '20px' }}>
              <div
                className="stat-icon"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}
              >
                <HiOutlineUserGroup style={{ fontSize: '24px', color: '#10b981' }} />
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#047857',
                  marginBottom: '4px'
                }}
              >
                Marked Students (Today)
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#022c22'
                }}
              >
                {loading ? '...' : presentTodayCount}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Number of students marked present today
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={3}>
          <Card
            className="dashboard-stat-card h-100"
            style={{
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              background:
                'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(248, 113, 113, 0.04) 100%)'
            }}
          >
            <Card.Body style={{ padding: '20px', textAlign: 'left' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}
              >
                <HiOutlineUserGroup style={{ fontSize: '24px', color: '#ef4444' }} />
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#b91c1c',
                  marginBottom: '4px'
                }}
              >
                Marked but Unpaid (Month)
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#7f1d1d'
                }}
              >
                {loading ? '...' : presentButUnpaidThisMonthCount}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Students marked present this month but with no payment this month
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              background: '#ffffff',
              height: '100%'
            }}
          >
            <Card.Body style={{ padding: '20px', textAlign: 'left' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#111827',
                      margin: 0
                    }}
                  >
                    Amount to be Given to Institute
                  </h5>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: '4px 0 0 0'
                    }}
                  >
                    Net positive cash after teacher payouts for today
                  </p>
                </div>
                <Badge
                  style={{
                    background:
                      'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  Daily
                </Badge>
              </div>
              <div
                style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: '8px'
                }}
              >
                {loading ? '...' : `Rs ${amountToInstituteToday.toFixed(2)}`}
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: 0
                }}
              >
                If this value is zero, there is no remaining amount to be
                transferred to the institute today.
              </p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              background: '#ffffff',
              height: '100%'
            }}
          >
            <Card.Body style={{ padding: '20px' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#111827',
                      margin: 0
                    }}
                  >
                    Quick Attendance Snapshot
                  </h5>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: '4px 0 0 0'
                    }}
                  >
                    Present vs total students enrolled
                  </p>
                </div>
                <HiOutlineClipboardDocumentCheck
                  style={{ fontSize: '22px', color: '#6366f1' }}
                />
              </div>
              <div className="d-flex align-items-baseline gap-3">
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#111827'
                  }}
                >
                  {loading ? '...' : presentTodayCount}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#6b7280'
                  }}
                >
                  out of {students.length} students
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card
        className="mb-4"
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          background: '#ffffff'
        }}
      >
        <Card.Body style={{ padding: '20px' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#111827',
                  margin: 0
                }}
              >
                Course-wise Income (Today)
              </h5>
              <p
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '4px 0 0 0'
                }}
              >
                Summary of income received per course for today
              </p>
            </div>
            <HiOutlineBookOpen style={{ fontSize: '22px', color: '#6366f1' }} />
          </div>
          <div className="table-responsive">
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>#</th>
                  <th style={{ textAlign: 'left' }}>Course</th>
                  <th style={{ textAlign: 'left' }}>Students Paid</th>
                  <th style={{ textAlign: 'left' }}>Total Income (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {courseIncomeRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#9ca3af'
                        }}
                      >
                        <HiOutlineBanknotes style={{ fontSize: '28px' }} />
                        <span style={{ fontSize: '13px' }}>
                          No income records found for today.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  courseIncomeRows.map((row, index) => (
                    <tr key={row.courseId || 'all'}>
                      <td style={{ textAlign: 'left' }}>{index + 1}</td>
                      <td style={{ textAlign: 'left' }}>{row.courseName}</td>
                      <td style={{ textAlign: 'left' }}>{row.studentCount}</td>
                      <td style={{ textAlign: 'left' }}>
                        Rs {row.totalIncome.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DailyReport;

