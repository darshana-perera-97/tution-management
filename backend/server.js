const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5253;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Path to admin login data file
const adminLoginPath = path.join(__dirname, 'data', 'adminLogin.json');
// Path to operators data file
const operatorsPath = path.join(__dirname, 'data', 'operators.json');
// Path to teachers data file
const teachersPath = path.join(__dirname, 'data', 'teachers.json');
// Path to courses data file
const coursesPath = path.join(__dirname, 'data', 'courses.json');
// Path to students data file
const studentsPath = path.join(__dirname, 'data', 'students.json');
// Path to payments data file
const paymentsPath = path.join(__dirname, 'data', 'payments.json');
// Path to teacher payments data file
const teacherPaymentsPath = path.join(__dirname, 'data', 'teacherPayments.json');
// Path to attendance data file
const attendancePath = path.join(__dirname, 'data', 'attendance.json');

// Helper function to read admin data
const readAdminData = () => {
  try {
    const data = fs.readFileSync(adminLoginPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return default structure
    return { admins: [] };
  }
};

// Helper function to write admin data
const writeAdminData = (data) => {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(adminLoginPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(adminLoginPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing admin data:', error);
    return false;
  }
};

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Tuition Management API',
    status: 'Server is running',
    port: PORT
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Admin login route
app.post('/api/admin/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const adminData = readAdminData();
    
    // Check if admin exists
    const admin = adminData.admins.find(
      admin => admin.email === email && admin.password === password
    );

    if (admin) {
      // Update last login
      admin.lastLogin = new Date().toISOString();
      writeAdminData(adminData);
      
      return res.json({
        success: true,
        message: 'Login successful',
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Register/Create admin route
app.post('/api/admin/register', (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    const adminData = readAdminData();
    
    // Check if admin already exists
    const existingAdmin = adminData.admins.find(
      admin => admin.email === email
    );

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Create new admin
    const newAdmin = {
      id: Date.now().toString(),
      email,
      password, // In production, this should be hashed
      name,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    adminData.admins.push(newAdmin);
    
    if (writeAdminData(adminData)) {
      res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        admin: {
          id: newAdmin.id,
          email: newAdmin.email,
          name: newAdmin.name
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save admin data'
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all admins (for admin management - should be protected in production)
app.get('/api/admin/list', (req, res) => {
  try {
    const adminData = readAdminData();
    const admins = adminData.admins.map(admin => ({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      createdAt: admin.createdAt,
      lastLogin: admin.lastLogin
    }));
    res.json({
      success: true,
      admins
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to read operators data
const readOperatorsData = () => {
  try {
    const data = fs.readFileSync(operatorsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return default structure
    return { operators: [] };
  }
};

// Helper function to write operators data
const writeOperatorsData = (data) => {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(operatorsPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(operatorsPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing operators data:', error);
    return false;
  }
};

// Get all operators
app.get('/api/operators', (req, res) => {
  try {
    const operatorsData = readOperatorsData();
    const operators = operatorsData.operators.map(operator => ({
      id: operator.id,
      email: operator.email,
      name: operator.name,
      createdAt: operator.createdAt,
      lastLogin: operator.lastLogin
    }));
    res.json({
      success: true,
      operators
    });
  } catch (error) {
    console.error('Get operators error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new operator
app.post('/api/operators', (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    const operatorsData = readOperatorsData();
    
    // Check if operator already exists
    const existingOperator = operatorsData.operators.find(
      operator => operator.email === email
    );

    if (existingOperator) {
      return res.status(409).json({
        success: false,
        message: 'Operator with this email already exists'
      });
    }

    // Create new operator
    const newOperator = {
      id: Date.now().toString(),
      email,
      password, // In production, this should be hashed
      name,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    operatorsData.operators.push(newOperator);
    
    if (writeOperatorsData(operatorsData)) {
      res.status(201).json({
        success: true,
        message: 'Operator created successfully',
        operator: {
          id: newOperator.id,
          email: newOperator.email,
          name: newOperator.name,
          createdAt: newOperator.createdAt
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save operator data'
      });
    }
  } catch (error) {
    console.error('Create operator error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete operator
app.delete('/api/operators/:id', (req, res) => {
  try {
    const { id } = req.params;
    const operatorsData = readOperatorsData();
    
    const operatorIndex = operatorsData.operators.findIndex(
      operator => operator.id === id
    );

    if (operatorIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Operator not found'
      });
    }

    operatorsData.operators.splice(operatorIndex, 1);
    
    if (writeOperatorsData(operatorsData)) {
      res.json({
        success: true,
        message: 'Operator deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete operator'
      });
    }
  } catch (error) {
    console.error('Delete operator error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Operator login route
app.post('/api/operators/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const operatorsData = readOperatorsData();
    
    // Check if operator exists
    const operator = operatorsData.operators.find(
      operator => operator.email === email && operator.password === password
    );

    if (operator) {
      // Update last login
      operator.lastLogin = new Date().toISOString();
      writeOperatorsData(operatorsData);
      
      return res.json({
        success: true,
        message: 'Login successful',
        operator: {
          id: operator.id,
          email: operator.email,
          name: operator.name
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Operator login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to read teachers data
const readTeachersData = () => {
  try {
    const data = fs.readFileSync(teachersPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return default structure
    return { teachers: [] };
  }
};

// Helper function to write teachers data
const writeTeachersData = (data) => {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(teachersPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(teachersPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing teachers data:', error);
    return false;
  }
};

// Get all teachers
app.get('/api/teachers', (req, res) => {
  try {
    const teachersData = readTeachersData();
    const teachers = teachersData.teachers.map(teacher => ({
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      subject: teacher.subject,
      educationQualification: teacher.educationQualification,
      description: teacher.description,
      createdAt: teacher.createdAt,
      lastLogin: teacher.lastLogin
    }));
    res.json({
      success: true,
      teachers
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new teacher
app.post('/api/teachers', (req, res) => {
  try {
    const { email, password, name, subject, educationQualification, description } = req.body;

    if (!email || !password || !name || !subject || !educationQualification) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, name, subject, and education qualification are required'
      });
    }

    const teachersData = readTeachersData();
    
    // Check if teacher already exists
    const existingTeacher = teachersData.teachers.find(
      teacher => teacher.email === email
    );

    if (existingTeacher) {
      return res.status(409).json({
        success: false,
        message: 'Teacher with this email already exists'
      });
    }

    // Create new teacher
    const newTeacher = {
      id: Date.now().toString(),
      email,
      password, // In production, this should be hashed
      name,
      subject,
      educationQualification,
      description: description || '',
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    teachersData.teachers.push(newTeacher);
    
    if (writeTeachersData(teachersData)) {
      res.status(201).json({
        success: true,
        message: 'Teacher created successfully',
        teacher: {
          id: newTeacher.id,
          email: newTeacher.email,
          name: newTeacher.name,
          subject: newTeacher.subject,
          educationQualification: newTeacher.educationQualification,
          description: newTeacher.description,
          createdAt: newTeacher.createdAt
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save teacher data'
      });
    }
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete teacher
app.delete('/api/teachers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const teachersData = readTeachersData();
    
    const teacherIndex = teachersData.teachers.findIndex(
      teacher => teacher.id === id
    );

    if (teacherIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    teachersData.teachers.splice(teacherIndex, 1);
    
    if (writeTeachersData(teachersData)) {
      res.json({
        success: true,
        message: 'Teacher deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete teacher'
      });
    }
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to read students data
const readStudentsData = () => {
  try {
    const data = fs.readFileSync(studentsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return default structure
    return { students: [] };
  }
};

// Helper function to write students data
const writeStudentsData = (data) => {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(studentsPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(studentsPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing students data:', error);
    return false;
  }
};

// Get all students
app.get('/api/students', (req, res) => {
  try {
    const studentsData = readStudentsData();
    res.json({
      success: true,
      students: studentsData.students
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new student
app.post('/api/students', (req, res) => {
  try {
    const { fullName, dob, parentName, contactNumber, whatsappNumber, address, grade } = req.body;

    if (!fullName || !dob || !parentName || !contactNumber || !address || !grade) {
      return res.status(400).json({
        success: false,
        message: 'Full name, date of birth, parent name, contact number, address, and grade are required'
      });
    }

    const studentsData = readStudentsData();
    
    // Calculate age for 2026
    const birthDate = new Date(dob);
    const year2026 = new Date('2026-01-01');
    const age = year2026.getFullYear() - birthDate.getFullYear();
    const monthDiff = year2026.getMonth() - birthDate.getMonth();
    const calculatedAge = monthDiff < 0 || (monthDiff === 0 && year2026.getDate() < birthDate.getDate()) 
      ? age - 1 
      : age;

    // Create new student
    const newStudent = {
      id: Date.now().toString(),
      fullName,
      age: calculatedAge,
      dob,
      parentName,
      contactNumber,
      whatsappNumber: whatsappNumber || contactNumber,
      address,
      grade,
      createdAt: new Date().toISOString()
    };

    studentsData.students.push(newStudent);
    
    if (writeStudentsData(studentsData)) {
      res.status(201).json({
        success: true,
        message: 'Student created successfully',
        student: newStudent
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save student data'
      });
    }
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete student
app.delete('/api/students/:id', (req, res) => {
  try {
    const { id } = req.params;
    const studentsData = readStudentsData();
    
    const studentIndex = studentsData.students.findIndex(
      student => student.id === id
    );

    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    studentsData.students.splice(studentIndex, 1);
    
    if (writeStudentsData(studentsData)) {
      res.json({
        success: true,
        message: 'Student deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete student'
      });
    }
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to read courses data
const readCoursesData = () => {
  try {
    const data = fs.readFileSync(coursesPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return default structure
    return { courses: [] };
  }
};

// Helper function to write courses data
const writeCoursesData = (data) => {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(coursesPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(coursesPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing courses data:', error);
    return false;
  }
};

// Get all courses
app.get('/api/courses', (req, res) => {
  try {
    const coursesData = readCoursesData();
    const courses = coursesData.courses.map(course => ({
      id: course.id,
      courseName: course.courseName,
      subject: course.subject,
      teacherId: course.teacherId,
      grade: course.grade,
      courseFee: course.courseFee,
      teacherPaymentPercentage: course.teacherPaymentPercentage,
      enrolledStudents: course.enrolledStudents || [],
      createdAt: course.createdAt
    }));
    res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new course
app.post('/api/courses', (req, res) => {
  try {
    const { courseName, teacherId, grade, subject, courseFee, teacherPaymentPercentage } = req.body;

    if (!courseName || !teacherId || !grade || !subject || !courseFee || !teacherPaymentPercentage) {
      return res.status(400).json({
        success: false,
        message: 'Course name, subject, teacher, grade, course fee, and teacher payment percentage are required'
      });
    }

    // Validate course fee
    const fee = parseFloat(courseFee);
    if (isNaN(fee) || fee < 0) {
      return res.status(400).json({
        success: false,
        message: 'Course fee must be a valid positive number'
      });
    }

    // Validate payment percentage
    const percentage = parseFloat(teacherPaymentPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      return res.status(400).json({
        success: false,
        message: 'Teacher payment percentage must be between 0 and 100'
      });
    }

    const coursesData = readCoursesData();
    
    // Check if course with same name and grade already exists
    const existingCourse = coursesData.courses.find(
      course => course.courseName === courseName && course.grade === grade
    );

    if (existingCourse) {
      return res.status(409).json({
        success: false,
        message: 'Course with this name and grade already exists'
      });
    }

    // Create new course
    const newCourse = {
      id: Date.now().toString(),
      courseName,
      subject,
      teacherId,
      grade,
      courseFee: fee.toString(),
      teacherPaymentPercentage: percentage.toString(),
      enrolledStudents: [],
      createdAt: new Date().toISOString()
    };

    coursesData.courses.push(newCourse);
    
    if (writeCoursesData(coursesData)) {
      res.status(201).json({
        success: true,
        message: 'Course created successfully',
        course: {
          id: newCourse.id,
          courseName: newCourse.courseName,
          subject: newCourse.subject,
          teacherId: newCourse.teacherId,
          grade: newCourse.grade,
          courseFee: newCourse.courseFee,
          teacherPaymentPercentage: newCourse.teacherPaymentPercentage,
          createdAt: newCourse.createdAt
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save course data'
      });
    }
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update course (for enrolled students)
app.put('/api/courses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { enrolledStudents } = req.body;

    if (!Array.isArray(enrolledStudents)) {
      return res.status(400).json({
        success: false,
        message: 'enrolledStudents must be an array'
      });
    }

    const coursesData = readCoursesData();
    
    const courseIndex = coursesData.courses.findIndex(
      course => course.id === id
    );

    if (courseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Update enrolled students
    coursesData.courses[courseIndex].enrolledStudents = enrolledStudents;
    
    if (writeCoursesData(coursesData)) {
      res.json({
        success: true,
        message: 'Course updated successfully',
        course: coursesData.courses[courseIndex]
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update course'
      });
    }
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to read payments data
const readPaymentsData = () => {
  try {
    const data = fs.readFileSync(paymentsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return default structure
    return { payments: [] };
  }
};

// Helper function to write payments data
const writePaymentsData = (data) => {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(paymentsPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(paymentsPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing payments data:', error);
    return false;
  }
};

// Get all payments
app.get('/api/payments', (req, res) => {
  try {
    const paymentsData = readPaymentsData();
    res.json({
      success: true,
      payments: paymentsData.payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark payment as paid
app.post('/api/payments', (req, res) => {
  try {
    const { studentId, monthKey, amount, paymentDate, courseId } = req.body;

    if (!studentId || !monthKey || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, month key, and amount are required'
      });
    }

    const paymentsData = readPaymentsData();
    
    // Check if payment already exists for this student, month, and course
    const paymentKey = courseId 
      ? `${studentId}-${monthKey}-${courseId}`
      : `${studentId}-${monthKey}`;
    
    const existingPayment = paymentsData.payments.find(
      payment => {
        if (courseId) {
          return payment.studentId === studentId && 
                 payment.monthKey === monthKey && 
                 payment.courseId === courseId;
        } else {
          return payment.studentId === studentId && 
                 payment.monthKey === monthKey && 
                 !payment.courseId;
        }
      }
    );

    if (existingPayment) {
      // Update existing payment
      existingPayment.status = 'Paid';
      existingPayment.paymentDate = paymentDate || new Date().toISOString();
      existingPayment.amount = parseFloat(amount);
    } else {
      // Create new payment record
      const newPayment = {
        id: Date.now().toString() + (courseId ? `-${courseId}` : ''),
        studentId,
        monthKey,
        courseId: courseId || null,
        amount: parseFloat(amount),
        status: 'Paid',
        paymentDate: paymentDate || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      paymentsData.payments.push(newPayment);
    }
    
    if (writePaymentsData(paymentsData)) {
      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        payment: existingPayment || paymentsData.payments[paymentsData.payments.length - 1]
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save payment data'
      });
    }
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to read teacher payments data
const readTeacherPaymentsData = () => {
  try {
    const data = fs.readFileSync(teacherPaymentsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return default structure
    return { advancePayments: [] };
  }
};

// Helper function to write teacher payments data
const writeTeacherPaymentsData = (data) => {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(teacherPaymentsPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(teacherPaymentsPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing teacher payments data:', error);
    return false;
  }
};

// Get all teacher advance payments
app.get('/api/teacher-payments', (req, res) => {
  try {
    const teacherPaymentsData = readTeacherPaymentsData();
    res.json({
      success: true,
      advancePayments: teacherPaymentsData.advancePayments
    });
  } catch (error) {
    console.error('Get teacher payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get teacher advance payments by teacher ID
app.get('/api/teacher-payments/:teacherId', (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacherPaymentsData = readTeacherPaymentsData();
    const teacherPayments = teacherPaymentsData.advancePayments.filter(
      payment => payment.teacherId === teacherId
    );
    res.json({
      success: true,
      advancePayments: teacherPayments
    });
  } catch (error) {
    console.error('Get teacher payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add advance payment for teacher
app.post('/api/teacher-payments', (req, res) => {
  try {
    const { teacherId, amount, paymentDate, description } = req.body;

    if (!teacherId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID and amount are required'
      });
    }

    const teacherPaymentsData = readTeacherPaymentsData();
    
    const newAdvancePayment = {
      id: Date.now().toString(),
      teacherId,
      amount: parseFloat(amount),
      paymentDate: paymentDate || new Date().toISOString(),
      description: description || '',
      createdAt: new Date().toISOString()
    };
    
    teacherPaymentsData.advancePayments.push(newAdvancePayment);
    
    if (writeTeacherPaymentsData(teacherPaymentsData)) {
      res.status(201).json({
        success: true,
        message: 'Advance payment recorded successfully',
        advancePayment: newAdvancePayment
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save teacher payment data'
      });
    }
  } catch (error) {
    console.error('Create teacher payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete course
app.delete('/api/courses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const coursesData = readCoursesData();
    
    const courseIndex = coursesData.courses.findIndex(
      course => course.id === id
    );

    if (courseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    coursesData.courses.splice(courseIndex, 1);
    
    if (writeCoursesData(coursesData)) {
      res.json({
        success: true,
        message: 'Course deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete course'
      });
    }
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to read attendance data
const readAttendanceData = () => {
  try {
    const data = fs.readFileSync(attendancePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return default structure
    return { attendance: [] };
  }
};

// Helper function to write attendance data
const writeAttendanceData = (data) => {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(attendancePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(attendancePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing attendance data:', error);
    return false;
  }
};

// Get all attendance records
app.get('/api/attendance', (req, res) => {
  try {
    const attendanceData = readAttendanceData();
    res.json({
      success: true,
      attendance: attendanceData.attendance
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark attendance
app.post('/api/attendance', (req, res) => {
  try {
    const { studentId, courseId, date } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Course ID are required'
      });
    }

    const attendanceData = readAttendanceData();
    
    const newAttendance = {
      id: Date.now().toString(),
      studentId,
      courseId,
      date: date || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    attendanceData.attendance.push(newAttendance);
    
    if (writeAttendanceData(attendanceData)) {
      res.status(201).json({
        success: true,
        message: 'Attendance marked successfully',
        attendance: newAttendance
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save attendance data'
      });
    }
  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

