const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fileUpload = require('express-fileupload');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Suppress dotenv console messages
const originalConsoleLog = console.log;
console.log = function(...args) {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('[dotenv@')) {
    return; // Suppress dotenv messages
  }
  originalConsoleLog.apply(console, args);
};

require('dotenv').config();

// Restore console.log after dotenv loads
console.log = originalConsoleLog;

const app = express();
const PORT = process.env.PORT || 5253;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware with error handling
try {
  app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
    createParentPath: true,
    abortOnLimit: false,
    responseOnLimit: 'File size too large. Maximum size is 50MB.'
  }));
} catch (err) {
  console.error('Error setting up file upload middleware:', err);
}

// Serve static files from React build folder
const buildPath = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

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
// Path to LMS content data file
const lmsContentPath = path.join(__dirname, 'data', 'lmsContent.json');
// Path to uploads directory (stored in data folder)
const uploadsPath = path.join(__dirname, 'data', 'uploads');
// Path to course enrollments data file
const enrollmentsPath = path.join(__dirname, 'data', 'enrollments.json');

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
      whatsappNumber: teacher.whatsappNumber || null,
      subject: teacher.subject,
      educationQualification: teacher.educationQualification,
      description: teacher.description,
      imageUrl: teacher.imageUrl || null,
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
    const { email, password, name, whatsappNumber, subject, educationQualification, description } = req.body;

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

    // Handle image upload
    let imageUrl = null;
    if (req.files && req.files.image) {
      const image = req.files.image;
      const fileName = `teacher-${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadsPath, fileName);
      
      try {
        image.mv(filePath);
        imageUrl = `/uploads/${fileName}`;
      } catch (err) {
        console.error('Error saving teacher image:', err);
      }
    }

    // Create new teacher
    const newTeacher = {
      id: Date.now().toString(),
      email,
      password, // In production, this should be hashed
      name,
      whatsappNumber: whatsappNumber || null,
      subject,
      educationQualification,
      description: description || '',
      imageUrl: imageUrl,
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

// Update teacher image
app.put('/api/teachers/:id/image', (req, res) => {
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

    // Handle image upload
    let imageUrl = null;
    if (req.files && req.files.image) {
      const image = req.files.image;
      const fileName = `teacher-${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadsPath, fileName);
      
      try {
        image.mv(filePath);
        imageUrl = `/uploads/${fileName}`;
        
        // Delete old image if exists
        const oldImageUrl = teachersData.teachers[teacherIndex].imageUrl;
        if (oldImageUrl) {
          const oldImagePath = path.join(__dirname, 'data', oldImageUrl);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        
        // Update teacher image
        teachersData.teachers[teacherIndex].imageUrl = imageUrl;
        
        if (writeTeachersData(teachersData)) {
          res.json({
            success: true,
            message: 'Teacher image updated successfully',
            imageUrl: imageUrl
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to update teacher image'
          });
        }
      } catch (err) {
        console.error('Error saving teacher image:', err);
        res.status(500).json({
          success: false,
          message: 'Error uploading image: ' + err.message
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }
  } catch (error) {
    console.error('Update teacher image error:', error);
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

// Teacher login route
app.post('/api/teachers/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const teachersData = readTeachersData();
    
    // Check if teacher exists
    const teacher = teachersData.teachers.find(
      teacher => teacher.email === email && teacher.password === password
    );

    if (teacher) {
      // Update last login
      teacher.lastLogin = new Date().toISOString();
      writeTeachersData(teachersData);
      
      return res.json({
        success: true,
        message: 'Login successful',
        teacher: {
          id: teacher.id,
          email: teacher.email,
          name: teacher.name,
          subject: teacher.subject,
          educationQualification: teacher.educationQualification
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Teacher login error:', error);
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

// Helper function to get notification numbers for a student
const getStudentNotificationNumbers = (student) => {
  const numbers = [];
  if (student.studentWhatsAppNumber) numbers.push(student.studentWhatsAppNumber);
  if (student.parentWhatsAppNumber) numbers.push(student.parentWhatsAppNumber);
  // Fallback to contact number if parent WhatsApp not provided
  if (!student.parentWhatsAppNumber && student.contactNumber) numbers.push(student.contactNumber);
  // Fallback to old whatsappNumber field for backward compatibility
  if (numbers.length === 0 && student.whatsappNumber) numbers.push(student.whatsappNumber);
  if (numbers.length === 0 && student.contactNumber) numbers.push(student.contactNumber);
  return [...new Set(numbers.filter(num => num && num.trim()))];
};

// Helper function to send WhatsApp messages to multiple numbers
const sendWhatsAppToMultiple = async (phoneNumbers, message) => {
  const results = [];
  const uniqueNumbers = [...new Set(phoneNumbers.filter(num => num && num.trim()))];
  
  for (const phoneNumber of uniqueNumbers) {
    try {
      const result = await sendWhatsAppMessage(phoneNumber, message);
      results.push({ phoneNumber, success: result.success, error: result.error });
    } catch (err) {
      console.error(`Error sending WhatsApp to ${phoneNumber}:`, err);
      results.push({ phoneNumber, success: false, error: err.message });
    }
  }
  
  return results;
};

// Create new student
app.post('/api/students', (req, res) => {
  try {
    const { fullName, dob, parentName, contactNumber, studentWhatsAppNumber, parentWhatsAppNumber, address, grade, selectedCourses } = req.body;
    const selectedCoursesArray = typeof selectedCourses === 'string' ? JSON.parse(selectedCourses) : selectedCourses;

    if (!fullName || !dob || !parentName || !contactNumber || !address || !grade) {
      return res.status(400).json({
        success: false,
        message: 'Full name, date of birth, parent name, contact number, address, and grade are required'
      });
    }

    const studentsData = readStudentsData();
    
    // Handle image upload
    let imageUrl = null;
    if (req.files && req.files.image) {
      const image = req.files.image;
      const fileName = `student-${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadsPath, fileName);
      
      try {
        image.mv(filePath);
        imageUrl = `/uploads/${fileName}`;
      } catch (err) {
        console.error('Error saving student image:', err);
      }
    }
    
    // Calculate age for 2026
    const birthDate = new Date(dob);
    const year2026 = new Date('2026-01-01');
    const age = year2026.getFullYear() - birthDate.getFullYear();
    const monthDiff = year2026.getMonth() - birthDate.getMonth();
    const calculatedAge = monthDiff < 0 || (monthDiff === 0 && year2026.getDate() < birthDate.getDate()) 
      ? age - 1 
      : age;

    // Create new student
    // Default password is student WhatsApp number, or parent WhatsApp, or contact number
    const defaultPassword = studentWhatsAppNumber || parentWhatsAppNumber || contactNumber;
    const newStudent = {
      id: Date.now().toString(),
      fullName,
      age: calculatedAge,
      dob,
      parentName,
      contactNumber,
      studentWhatsAppNumber: studentWhatsAppNumber || null,
      parentWhatsAppNumber: parentWhatsAppNumber || null,
      whatsappNumber: studentWhatsAppNumber || parentWhatsAppNumber || contactNumber, // Keep for backward compatibility
      address,
      grade,
      password: defaultPassword, // Default password
      imageUrl: imageUrl,
      createdAt: new Date().toISOString()
    };

    studentsData.students.push(newStudent);
    
    if (writeStudentsData(studentsData)) {
      // Enroll student in selected courses
      if (selectedCoursesArray && Array.isArray(selectedCoursesArray) && selectedCoursesArray.length > 0) {
        const coursesData = readCoursesData();
        const enrollmentsData = readEnrollmentsData();
        
        selectedCoursesArray.forEach(courseId => {
          const courseIndex = coursesData.courses.findIndex(c => c.id === courseId);
          if (courseIndex !== -1) {
            const course = coursesData.courses[courseIndex];
            const enrolledStudents = course.enrolledStudents || [];
            
            // Add student if not already enrolled
            if (!enrolledStudents.includes(newStudent.id)) {
              enrolledStudents.push(newStudent.id);
              coursesData.courses[courseIndex].enrolledStudents = enrolledStudents;
              
              // Record enrollment
              const enrollment = {
                id: Date.now().toString() + '-' + newStudent.id + '-' + courseId,
                studentId: newStudent.id,
                courseId: courseId,
                action: 'enrolled',
                enrolledAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
              };
              enrollmentsData.enrollments.push(enrollment);
              
              // Send WhatsApp notification to parent for course enrollment
              const parentNumber = newStudent.contactNumber || newStudent.whatsappNumber;
              if (parentNumber) {
                const enrollmentMessage = `🎓 Course Enrollment Confirmation\n\nDear ${newStudent.parentName},\n\nYour child ${newStudent.fullName} has been successfully enrolled in:\n- Course: ${course.courseName} (${course.subject})\n- Grade: ${course.grade}\n- Course Fee: Rs. ${parseFloat(course.courseFee || 0).toFixed(2)}\n\nWe look forward to having ${newStudent.fullName} in this course!\n\nBest regards,\nTuition Management System`;
                sendWhatsAppMessage(parentNumber, enrollmentMessage).catch(err => {
                  console.error('Failed to send enrollment notification:', err);
                });
              }
            }
          }
        });
        
        // Save updated courses and enrollments
        writeCoursesData(coursesData);
        writeEnrollmentsData(enrollmentsData);
      }
      
      // Send WhatsApp notification to both student and parent
      const welcomeMessage = `🎓 Welcome to our Tuition Center!\n\nDear ${newStudent.parentName},\n\nYour child ${newStudent.fullName} has been successfully registered as a student.\n\nStudent Details:\n- Name: ${newStudent.fullName}\n- Grade: ${newStudent.grade}\n- Parent: ${newStudent.parentName}\n\nWe look forward to supporting ${newStudent.fullName}'s educational journey!\n\nBest regards,\nTuition Management System`;
      
      const notificationNumbers = getStudentNotificationNumbers(newStudent);
      if (notificationNumbers.length > 0) {
        sendWhatsAppToMultiple(notificationNumbers, welcomeMessage).catch(err => {
          console.error('Failed to send welcome message:', err);
        });
      }
      
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

// Update student image
app.put('/api/students/:id/image', (req, res) => {
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

    // Handle image upload
    let imageUrl = null;
    if (req.files && req.files.image) {
      const image = req.files.image;
      const fileName = `student-${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadsPath, fileName);
      
      try {
        image.mv(filePath);
        imageUrl = `/uploads/${fileName}`;
        
        // Delete old image if exists
        const oldImageUrl = studentsData.students[studentIndex].imageUrl;
        if (oldImageUrl) {
          const oldImagePath = path.join(__dirname, 'data', oldImageUrl);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        
        // Update student image
        studentsData.students[studentIndex].imageUrl = imageUrl;
        
        if (writeStudentsData(studentsData)) {
          res.json({
            success: true,
            message: 'Student image updated successfully',
            imageUrl: imageUrl
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to update student image'
          });
        }
      } catch (err) {
        console.error('Error saving student image:', err);
        res.status(500).json({
          success: false,
          message: 'Error uploading image: ' + err.message
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }
  } catch (error) {
    console.error('Update student image error:', error);
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

// Student login
app.post('/api/students/login', (req, res) => {
  try {
    const { studentId, password } = req.body;

    if (!studentId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and password are required'
      });
    }

    const studentsData = readStudentsData();
    const student = studentsData.students.find(s => s.id === studentId);

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid student ID or password'
      });
    }

    // Check password (default is student WhatsApp number, then parent WhatsApp, then contact number)
    const expectedPassword = student.password || student.studentWhatsAppNumber || student.parentWhatsAppNumber || student.whatsappNumber || student.contactNumber;
    if (password !== expectedPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid student ID or password'
      });
    }

    // Return student info (without password)
    const { password: _, ...studentInfo } = student;
    
    res.json({
      success: true,
      message: 'Login successful',
      student: studentInfo
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = {};

// Generate OTP for password change
app.post('/api/students/generate-otp', async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    const studentsData = readStudentsData();
    const student = studentsData.students.find(s => s.id === studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const notificationNumbers = getStudentNotificationNumbers(student);
    if (notificationNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Contact number not found for this student'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with expiration (5 minutes)
    otpStore[studentId] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    };

    // Send OTP via WhatsApp to both student and parent
    const otpMessage = `🔐 Password Change OTP\n\nDear ${student.parentName},\n\nOTP for password change for your child ${student.fullName}'s account is: ${otp}\n\nThis OTP will expire in 5 minutes.\n\nIf you didn't request this, please ignore this message.\n\nBest regards,\nTuition Management System`;
    
    const sendResult = await sendWhatsAppToMultiple(notificationNumbers, otpMessage);
    
    if (sendResult.success) {
      res.json({
        success: true,
        message: 'OTP sent to your WhatsApp number'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Generate OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify OTP and change password
app.post('/api/students/change-password', (req, res) => {
  try {
    const { studentId, otp, newPassword } = req.body;

    if (!studentId || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, OTP, and new password are required'
      });
    }

    // Verify OTP
    const storedOtp = otpStore[studentId];
    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found. Please generate a new OTP.'
      });
    }

    if (Date.now() > storedOtp.expiresAt) {
      delete otpStore[studentId];
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please generate a new OTP.'
      });
    }

    if (storedOtp.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Update password
    const studentsData = readStudentsData();
    const studentIndex = studentsData.students.findIndex(s => s.id === studentId);

    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    studentsData.students[studentIndex].password = newPassword;

    if (writeStudentsData(studentsData)) {
      // Delete OTP after successful password change
      delete otpStore[studentId];
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get student courses
app.get('/api/students/:studentId/courses', (req, res) => {
  try {
    const { studentId } = req.params;
    const coursesData = readCoursesData();
    
    const studentCourses = coursesData.courses.filter(course =>
      course.enrolledStudents && course.enrolledStudents.includes(studentId)
    );

    res.json({
      success: true,
      courses: studentCourses
    });
  } catch (error) {
    console.error('Get student courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get student attendance for a course
app.get('/api/students/:studentId/courses/:courseId/attendance', (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const attendanceData = readAttendanceData();
    
    const studentAttendance = attendanceData.attendance.filter(att =>
      att.studentId === studentId && att.courseId === courseId
    );

    // Sort by date (newest first)
    studentAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      attendance: studentAttendance
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get student notifications (enrollments, payments, etc.)
app.get('/api/students/:studentId/notifications', (req, res) => {
  try {
    const { studentId } = req.params;
    const enrollmentsData = readEnrollmentsData();
    const paymentsData = readPaymentsData();
    const coursesData = readCoursesData();
    const lmsData = readLmsContentData();
    
    const notifications = [];

    // Get enrollment notifications
    const enrollments = enrollmentsData.enrollments.filter(e => 
      e.studentId === studentId && e.action === 'enrolled'
    );
    enrollments.forEach(enrollment => {
      const course = coursesData.courses.find(c => c.id === enrollment.courseId);
      if (course) {
        notifications.push({
          id: enrollment.id,
          type: 'enrollment',
          title: `Enrolled in ${course.courseName}`,
          message: `You have been enrolled in ${course.courseName} (${course.subject})`,
          date: enrollment.enrolledAt,
          courseId: course.id
        });
      }
    });

    // Get payment notifications
    const payments = paymentsData.payments.filter(p => 
      p.studentId === studentId && p.status === 'Paid'
    );
    payments.forEach(payment => {
      const course = payment.courseId ? coursesData.courses.find(c => c.id === payment.courseId) : null;
      const [year, month] = payment.monthKey.split('-');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[parseInt(month) - 1];
      
      notifications.push({
        id: payment.id,
        type: 'payment',
        title: 'Payment Received',
        message: `Payment of Rs. ${payment.amount.toFixed(2)} received for ${monthName} ${year}${course ? ` - ${course.courseName}` : ''}`,
        date: payment.paymentDate,
        courseId: payment.courseId
      });
    });

    // Get LMS update notifications (check if student is enrolled in course with new content)
    const studentCourses = coursesData.courses.filter(course =>
      course.enrolledStudents && course.enrolledStudents.includes(studentId)
    );
    
    studentCourses.forEach(course => {
      const courseLms = lmsData.content.filter(content => 
        content.courseId === course.id
      );
      courseLms.forEach(lms => {
        notifications.push({
          id: `lms-${lms.id}`,
          type: 'lms',
          title: `New Learning Material: ${lms.title}`,
          message: `New ${lms.type} content available in ${course.courseName}`,
          date: lms.createdAt,
          courseId: course.id
        });
      });
    });

    // Sort by date (newest first)
    notifications.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Get student notifications error:', error);
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

// Helper function to read enrollments data
const readEnrollmentsData = () => {
  try {
    const data = fs.readFileSync(enrollmentsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return default structure
    return { enrollments: [] };
  }
};

// Helper function to write enrollments data
const writeEnrollmentsData = (data) => {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(enrollmentsPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(enrollmentsPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing enrollments data:', error);
    return false;
  }
};

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
    const studentsData = readStudentsData();
    const enrollmentsData = readEnrollmentsData();
    
    const courseIndex = coursesData.courses.findIndex(
      course => course.id === id
    );

    if (courseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const course = coursesData.courses[courseIndex];
    const previousEnrolledStudents = course.enrolledStudents || [];
    
    // Find newly added students
    const newlyAdded = enrolledStudents.filter(
      studentId => !previousEnrolledStudents.includes(studentId)
    );
    
    // Find removed students
    const removed = previousEnrolledStudents.filter(
      studentId => !enrolledStudents.includes(studentId)
    );

    // Record enrollments for newly added students
    newlyAdded.forEach(studentId => {
      const enrollment = {
        id: Date.now().toString() + '-' + studentId + '-' + id,
        studentId,
        courseId: id,
        action: 'enrolled',
        enrolledAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      enrollmentsData.enrollments.push(enrollment);
      
      // Send WhatsApp notification to both student and parent
      const student = studentsData.students.find(s => s.id === studentId);
      if (student) {
        const notificationNumbers = getStudentNotificationNumbers(student);
        if (notificationNumbers.length > 0) {
          const enrollmentMessage = `🎓 Course Enrollment Confirmation\n\nDear ${student.parentName},\n\nYour child ${student.fullName} has been successfully enrolled in:\n- Course: ${course.courseName} (${course.subject})\n- Grade: ${course.grade}\n- Course Fee: Rs. ${parseFloat(course.courseFee).toFixed(2)}\n\nWe look forward to having ${student.fullName} in this course!\n\nBest regards,\nTuition Management System`;
          sendWhatsAppToMultiple(notificationNumbers, enrollmentMessage).catch(err => {
            console.error('Failed to send enrollment notification:', err);
          });
        }
      }
    });

    // Record unenrollments for removed students
    removed.forEach(studentId => {
      const enrollment = {
        id: Date.now().toString() + '-' + studentId + '-' + id,
        studentId,
        courseId: id,
        action: 'unenrolled',
        unenrolledAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      enrollmentsData.enrollments.push(enrollment);
    });

    // Save enrollment records
    writeEnrollmentsData(enrollmentsData);

    // Update enrolled students
    coursesData.courses[courseIndex].enrolledStudents = enrolledStudents;
    
    if (writeCoursesData(coursesData)) {
      res.json({
        success: true,
        message: 'Course updated successfully',
        course: coursesData.courses[courseIndex],
        newlyAdded: newlyAdded.length,
        removed: removed.length
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

// Send bulk message to all students enrolled in a course
app.post('/api/courses/:courseId/bulk-message', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const coursesData = readCoursesData();
    const studentsData = readStudentsData();
    
    const course = coursesData.courses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const enrolledStudentIds = course.enrolledStudents || [];
    if (enrolledStudentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No students enrolled in this course'
      });
    }

    // Get all enrolled students
    const enrolledStudents = studentsData.students.filter(s => enrolledStudentIds.includes(s.id));
    
    // Send message to all enrolled students
    let sentCount = 0;
    const results = [];

    for (const student of enrolledStudents) {
      const notificationNumbers = getStudentNotificationNumbers(student);
      if (notificationNumbers.length > 0) {
        try {
          const bulkMessage = `📢 Message from ${course.courseName}\n\n${message}\n\nBest regards,\nTuition Management System`;
          const sendResults = await sendWhatsAppToMultiple(notificationNumbers, bulkMessage);
          const successCount = sendResults.filter(r => r.success).length;
          if (successCount > 0) {
            sentCount += successCount;
          }
          results.push({
            studentId: student.id,
            studentName: student.fullName,
            success: successCount > 0,
            sentTo: successCount
          });
        } catch (err) {
          console.error(`Error sending bulk message to ${student.fullName}:`, err);
          results.push({
            studentId: student.id,
            studentName: student.fullName,
            success: false,
            error: err.message
          });
        }
      } else {
        results.push({
          studentId: student.id,
          studentName: student.fullName,
          success: false,
          error: 'No WhatsApp number available'
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk message sent to ${sentCount} recipient(s)`,
      sentCount: sentCount,
      totalStudents: enrolledStudents.length,
      results: results
    });
  } catch (error) {
    console.error('Send bulk message error:', error);
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

    // Get student, course, and teacher information for notification
    const studentsData = readStudentsData();
    const coursesData = readCoursesData();
    const teachersData = readTeachersData();
    const student = studentsData.students.find(s => s.id === studentId);
    const course = courseId ? coursesData.courses.find(c => c.id === courseId) : null;
    const teacher = course && course.teacherId ? teachersData.teachers.find(t => t.id === course.teacherId) : null;
    
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
      const payment = existingPayment || paymentsData.payments[paymentsData.payments.length - 1];
      
      // Send WhatsApp notification to both student and parent
      if (student) {
        const notificationNumbers = getStudentNotificationNumbers(student);
        if (notificationNumbers.length > 0) {
          const paymentDateObj = new Date(payment.paymentDate);
          const formattedDate = paymentDateObj.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
          const [year, month] = monthKey.split('-');
          const monthName = monthNames[parseInt(month) - 1];
          
          const paymentMessage = `💰 Payment Received\n\nDear ${student.parentName},\n\nPayment for your child ${student.fullName} has been successfully recorded:\n- Amount: Rs. ${parseFloat(amount).toFixed(2)}\n- Month: ${monthName} ${year}${course ? `\n- Course: ${course.courseName} (${course.subject})` : ''}\n- Payment Date: ${formattedDate}\n\nThank you for your payment!\n\nBest regards,\nTuition Management System`;
          sendWhatsAppToMultiple(notificationNumbers, paymentMessage).catch(err => {
            console.error('Failed to send payment notification:', err);
          });
        }
      }
      
      // Send WhatsApp notification to teacher if payment is for a course
      if (course && teacher && teacher.whatsappNumber) {
        const paymentDateObj = new Date(payment.paymentDate);
        const formattedDate = paymentDateObj.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
        const [year, month] = monthKey.split('-');
        const monthName = monthNames[parseInt(month) - 1];
        
        // Calculate teacher's share if teacherPaymentPercentage is set
        const teacherPercentage = course.teacherPaymentPercentage ? parseFloat(course.teacherPaymentPercentage) : 0;
        const teacherShare = teacherPercentage > 0 ? (parseFloat(amount) * teacherPercentage) / 100 : 0;
        
        const teacherPaymentMessage = `💰 Payment Notification\n\nDear ${teacher.name},\n\nPayment has been received for your course:\n- Student: ${student ? student.fullName : 'N/A'}\n- Course: ${course.courseName} (${course.subject})\n- Amount: Rs. ${parseFloat(amount).toFixed(2)}\n- Month: ${monthName} ${year}\n- Payment Date: ${formattedDate}${teacherShare > 0 ? `\n- Your Share (${teacherPercentage}%): Rs. ${teacherShare.toFixed(2)}` : ''}\n\nThank you!\n\nBest regards,\nTuition Management System`;
        
        sendWhatsAppMessage(teacher.whatsappNumber, teacherPaymentMessage).catch(err => {
          console.error('Failed to send payment notification to teacher:', err);
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        payment: payment
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

// Payment reminder system - Send reminders for payments due in 2nd week
app.post('/api/payments/send-reminders', async (req, res) => {
  try {
    const paymentsData = readPaymentsData();
    const studentsData = readStudentsData();
    const coursesData = readCoursesData();
    
    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();
    
    // Check if we're in the 2nd week (8-14 of the month)
    if (currentDay < 8 || currentDay > 14) {
      return res.json({
        success: true,
        message: 'Not in the 2nd week. Reminders are only sent during the 2nd week (8-14) of the month.',
        remindersSent: 0
      });
    }
    
    // Generate month key for current month
    const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    
    // Find all students with pending payments for current month
    const studentsWithPendingPayments = [];
    
    studentsData.students.forEach(student => {
      // Check if student has any enrolled courses
      const enrolledCourses = coursesData.courses.filter(course => 
        course.enrolledStudents && course.enrolledStudents.includes(student.id)
      );
      
      if (enrolledCourses.length === 0) return;
      
      // Check each enrolled course for pending payment
      enrolledCourses.forEach(course => {
        const hasPayment = paymentsData.payments.find(payment => 
          payment.studentId === student.id && 
          payment.monthKey === currentMonthKey && 
          payment.courseId === course.id &&
          payment.status === 'Paid'
        );
        
        if (!hasPayment) {
          // Student hasn't paid for this course this month
          studentsWithPendingPayments.push({
            student,
            course,
            monthKey: currentMonthKey
          });
        }
      });
    });
    
    // Send reminders
    let remindersSent = 0;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[currentMonth - 1];
    
    for (const { student, course } of studentsWithPendingPayments) {
      const notificationNumbers = getStudentNotificationNumbers(student);
      if (notificationNumbers.length > 0) {
        const reminderMessage = `⏰ Payment Reminder\n\nDear ${student.parentName},\n\nThis is a friendly reminder that payment for your child ${student.fullName} for ${monthName} ${currentYear} is pending.\n\nCourse Details:\n- Course: ${course.courseName} (${course.subject})\n- Amount: Rs. ${parseFloat(course.courseFee).toFixed(2)}\n- Due: ${monthName} ${currentYear}\n\nPlease make your payment at your earliest convenience.\n\nThank you!\n\nBest regards,\nTuition Management System`;
        
        const results = await sendWhatsAppToMultiple(notificationNumbers, reminderMessage);
        const result = results.length > 0 ? results[0] : { success: false };
        if (result.success) {
          remindersSent++;
        }
      }
    }
    
    res.json({
      success: true,
      message: `Payment reminders sent successfully`,
      remindersSent,
      totalPending: studentsWithPendingPayments.length
    });
  } catch (error) {
    console.error('Payment reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get enrollment history
app.get('/api/enrollments', (req, res) => {
  try {
    const { studentId, courseId } = req.query;
    const enrollmentsData = readEnrollmentsData();
    let enrollments = enrollmentsData.enrollments;

    // Filter by studentId if provided
    if (studentId) {
      enrollments = enrollments.filter(e => e.studentId === studentId);
    }

    // Filter by courseId if provided
    if (courseId) {
      enrollments = enrollments.filter(e => e.courseId === courseId);
    }

    // Sort by date (newest first)
    enrollments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      enrollments
    });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get enrollment history
app.get('/api/enrollments', (req, res) => {
  try {
    const { studentId, courseId } = req.query;
    const enrollmentsData = readEnrollmentsData();
    let enrollments = enrollmentsData.enrollments;

    // Filter by studentId if provided
    if (studentId) {
      enrollments = enrollments.filter(e => e.studentId === studentId);
    }

    // Filter by courseId if provided
    if (courseId) {
      enrollments = enrollments.filter(e => e.courseId === courseId);
    }

    // Sort by date (newest first)
    enrollments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      enrollments
    });
  } catch (error) {
    console.error('Get enrollments error:', error);
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

// Helper function to read LMS content data
const readLmsContentData = () => {
  try {
    const data = fs.readFileSync(lmsContentPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { content: [] };
  }
};

// Helper function to write LMS content data
const writeLmsContentData = (data) => {
  try {
    const dataDir = path.dirname(lmsContentPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(lmsContentPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing LMS content data:', error);
    return false;
  }
};

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Serve uploaded files from data/uploads
app.use('/uploads', express.static(uploadsPath));

// Get LMS content for a course
app.get('/api/courses/:courseId/lms', (req, res) => {
  try {
    const { courseId } = req.params;
    const lmsData = readLmsContentData();
    const courseContent = lmsData.content.filter(item => item.courseId === courseId);
    
    res.json({
      success: true,
      content: courseContent
    });
  } catch (error) {
    console.error('Get LMS content error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload LMS content
app.post('/api/courses/:courseId/lms', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { type, title, content, link } = req.body;
    
    if (!type || !title) {
      return res.status(400).json({
        success: false,
        message: 'Type and title are required'
      });
    }

    const lmsData = readLmsContentData();
    let fileUrl = null;

    // Handle file uploads (images and PDFs)
    if ((type === 'image' || type === 'pdf') && req.files && req.files.file) {
      const file = req.files.file;
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadsPath, fileName);
      
      // Move file to uploads directory
      try {
        await file.mv(filePath);
        fileUrl = `/uploads/${fileName}`;
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: 'Error uploading file: ' + err.message
        });
      }
    }

    const newContent = {
      id: Date.now().toString(),
      courseId,
      type,
      title,
      content: type === 'text' ? content : null,
      link: type === 'link' ? link : null,
      fileUrl: fileUrl,
      createdAt: new Date().toISOString()
    };

    lmsData.content.push(newContent);
    
    if (writeLmsContentData(lmsData)) {
      // Get course information and enrolled students
      const coursesData = readCoursesData();
      const studentsData = readStudentsData();
      const course = coursesData.courses.find(c => c.id === courseId);
      
      // Send WhatsApp notification to all enrolled students
      if (course && course.enrolledStudents && course.enrolledStudents.length > 0) {
        const contentType = type === 'text' ? 'Text Content' : 
                          type === 'image' ? 'Image' : 
                          type === 'pdf' ? 'PDF Document' : 'Link';
        
        course.enrolledStudents.forEach(studentId => {
          const student = studentsData.students.find(s => s.id === studentId);
          if (student) {
            const notificationNumbers = getStudentNotificationNumbers(student);
            if (notificationNumbers.length > 0) {
              let lmsMessage = `📚 New Learning Material Available\n\nDear ${student.parentName},\n\nNew ${contentType.toLowerCase()} has been uploaded for your child ${student.fullName}:\n- Course: ${course.courseName} (${course.subject})\n- Title: ${title}`;
              
              if (type === 'link' && link) {
                lmsMessage += `\n- Link: ${link}`;
              }
              
              lmsMessage += `\n\nPlease check the LMS to access the new content.\n\nBest regards,\nTuition Management System`;
              
              sendWhatsAppToMultiple(notificationNumbers, lmsMessage).catch(err => {
                console.error(`Failed to send LMS update to ${student.parentName}:`, err);
              });
            }
          }
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Content uploaded successfully',
        content: newContent
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save content'
      });
    }
  } catch (error) {
    console.error('Upload LMS content error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete LMS content
app.delete('/api/courses/:courseId/lms/:contentId', (req, res) => {
  try {
    const { courseId, contentId } = req.params;
    const lmsData = readLmsContentData();
    
    const contentIndex = lmsData.content.findIndex(
      item => item.id === contentId && item.courseId === courseId
    );

    if (contentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Delete file if exists
    const content = lmsData.content[contentIndex];
    if (content.fileUrl) {
      const fileName = path.basename(content.fileUrl);
      const filePath = path.join(uploadsPath, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
    }

    lmsData.content.splice(contentIndex, 1);
    
    if (writeLmsContentData(lmsData)) {
      res.json({
        success: true,
        message: 'Content deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete content'
      });
    }
  } catch (error) {
    console.error('Delete LMS content error:', error);
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
    
    // Get student and course information for notification
    const studentsData = readStudentsData();
    const coursesData = readCoursesData();
    const student = studentsData.students.find(s => s.id === studentId);
    const course = coursesData.courses.find(c => c.id === courseId);
    
    const newAttendance = {
      id: Date.now().toString(),
      studentId,
      courseId,
      date: date || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    attendanceData.attendance.push(newAttendance);
    
    if (writeAttendanceData(attendanceData)) {
      // Send WhatsApp notification to both student and parent
      if (student && course) {
        const notificationNumbers = getStudentNotificationNumbers(student);
        if (notificationNumbers.length > 0) {
          const attendanceDate = new Date(date || new Date().toISOString());
          const formattedDate = attendanceDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          const attendanceMessage = `✅ Attendance Marked\n\nDear ${student.parentName},\n\nYour child ${student.fullName}'s attendance has been marked for:\n- Course: ${course.courseName} (${course.subject})\n- Date: ${formattedDate}\n\nThank you!\n\nBest regards,\nTuition Management System`;
          sendWhatsAppToMultiple(notificationNumbers, attendanceMessage).catch(err => {
            console.error('Failed to send attendance notification:', err);
          });
        }
      }
      
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

// WhatsApp connection state (in-memory storage - consider using a database in production)
let whatsappState = {
  connected: false,
  phoneNumber: null,
  qrCode: null,
  client: null
};

// Helper function to format phone number for WhatsApp
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If number starts with 0, replace with country code (assuming Sri Lanka +94)
  if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.substring(1);
  }
  
  // If number doesn't start with country code, add it (assuming Sri Lanka +94)
  if (!cleaned.startsWith('94') && cleaned.length === 9) {
    cleaned = '94' + cleaned;
  }
  
  // Return with @c.us suffix for WhatsApp
  return cleaned + '@c.us';
};

// Helper function to send WhatsApp message
const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    // Check if WhatsApp is connected
    if (!whatsappState.client || !whatsappState.connected) {
      console.log('WhatsApp not connected. Message not sent:', message);
      return { success: false, error: 'WhatsApp not connected' };
    }

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);
    if (!formattedNumber) {
      console.log('Invalid phone number:', phoneNumber);
      return { success: false, error: 'Invalid phone number' };
    }

    // Send message
    await whatsappState.client.sendMessage(formattedNumber, message);
    console.log(`WhatsApp message sent to ${formattedNumber}: ${message.substring(0, 50)}...`);
    return { success: true };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to initialize WhatsApp connection
const initializeWhatsApp = async () => {
  try {
    console.log('\n========================================');
    console.log('Starting WhatsApp connection...');
    console.log('========================================\n');

    // Create WhatsApp session directory
    const sessionPath = path.join(__dirname, 'data', '.wwebjs_auth');
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Create new WhatsApp client
    const client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, 'data')
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    // Store client in state
    whatsappState.client = client;

    // Set up event listeners
    client.on('qr', (qr) => {
      // Store QR code in state
      whatsappState.qrCode = qr;
      
      // Print QR code to console
      console.log('\n========================================');
      console.log('WhatsApp QR Code Generated:');
      console.log('========================================');
      console.log('Scan this QR code with your WhatsApp mobile app');
      console.log('========================================\n');
      
      // Display QR code in terminal
      qrcode.generate(qr, { small: true });
      console.log('\n========================================\n');
    });

    client.on('ready', () => {
      whatsappState.connected = true;
      whatsappState.phoneNumber = client.info.wid.user;
      whatsappState.qrCode = null; // Clear QR code when connected
      console.log('\n========================================');
      console.log('✅ WhatsApp client is ready!');
      console.log('Connected phone number:', whatsappState.phoneNumber);
      console.log('========================================\n');
    });

    client.on('authenticated', () => {
      console.log('WhatsApp authenticated successfully!');
    });

    client.on('auth_failure', (msg) => {
      console.error('WhatsApp authentication failure:', msg);
      whatsappState.connected = false;
      whatsappState.client = null;
    });

    client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected:', reason);
      whatsappState.connected = false;
      whatsappState.phoneNumber = null;
      whatsappState.qrCode = null;
      whatsappState.client = null;
    });

    // Initialize the client
    await client.initialize();
    
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    whatsappState.client = null;
  }
};

// WhatsApp API Routes
// Check WhatsApp connection status
app.get('/api/whatsapp/status', (req, res) => {
  try {
    // Check if client is actually ready
    let isConnected = whatsappState.connected;
    if (whatsappState.client && whatsappState.client.info) {
      isConnected = true;
      if (!whatsappState.phoneNumber) {
        whatsappState.phoneNumber = whatsappState.client.info.wid.user;
      }
    }
    
    res.json({
      success: true,
      connected: isConnected,
      phoneNumber: whatsappState.phoneNumber || null
    });
  } catch (error) {
    console.error('WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Generate QR code for WhatsApp connection
app.post('/api/whatsapp/generate-qr', async (req, res) => {
  try {
    // If client already exists and is authenticated, return existing QR or status
    if (whatsappState.client) {
      if (whatsappState.connected) {
        return res.json({
          success: true,
          connected: true,
          message: 'WhatsApp is already connected',
          phoneNumber: whatsappState.phoneNumber
        });
      }
      // If client exists but not connected, destroy it first
      try {
        await whatsappState.client.destroy();
      } catch (err) {
        console.error('Error destroying existing client:', err);
      }
    }

    // Create WhatsApp session directory
    const sessionPath = path.join(__dirname, 'data', '.wwebjs_auth');
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Create new WhatsApp client
    const client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, 'data')
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    // Store client in state
    whatsappState.client = client;

    // Set up QR code event listener
    let qrResolved = false;
    const qrPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!qrResolved) {
          reject(new Error('QR code generation timeout'));
        }
      }, 60000); // 60 second timeout

      client.on('qr', (qr) => {
        clearTimeout(timeout);
        qrResolved = true;
        
        // Store QR code in state
        whatsappState.qrCode = qr;
        
        // Print QR code to console
        console.log('\n========================================');
        console.log('WhatsApp QR Code Generated:');
        console.log('========================================');
        console.log('Scan this QR code with your WhatsApp mobile app');
        console.log('========================================\n');
        
        // Display QR code in terminal
        qrcode.generate(qr, { small: true });
        console.log('\n========================================\n');
        
        resolve(qr);
      });

      client.on('ready', () => {
        clearTimeout(timeout);
        whatsappState.connected = true;
        whatsappState.phoneNumber = client.info.wid.user;
        whatsappState.qrCode = null; // Clear QR code when connected
        console.log('\n========================================');
        console.log('WhatsApp client is ready!');
        console.log('Connected phone number:', whatsappState.phoneNumber);
        console.log('========================================\n');
        if (!qrResolved) {
          qrResolved = true;
          resolve(null);
        }
      });

      client.on('authenticated', () => {
        console.log('WhatsApp authenticated successfully!');
      });

      client.on('auth_failure', (msg) => {
        clearTimeout(timeout);
        if (!qrResolved) {
          qrResolved = true;
          console.error('WhatsApp authentication failure:', msg);
          reject(new Error('Authentication failed'));
        }
      });

      client.on('disconnected', (reason) => {
        console.log('WhatsApp client disconnected:', reason);
        whatsappState.connected = false;
        whatsappState.phoneNumber = null;
        whatsappState.qrCode = null;
        whatsappState.client = null;
      });
    });

    // Initialize the client
    await client.initialize();

    // Wait for QR code
    try {
      const qr = await qrPromise;

      if (qr) {
        // QR code was generated
        res.json({
          success: true,
          qrCode: qr,
          message: 'QR code generated. Scan with WhatsApp mobile app.'
        });
      } else {
        // Client is already ready (was authenticated before)
        res.json({
          success: true,
          connected: true,
          message: 'WhatsApp is already connected',
          phoneNumber: whatsappState.phoneNumber
        });
      }
    } catch (qrError) {
      // Handle timeout or other QR generation errors
      console.error('QR code generation error:', qrError);
      
      // Clean up the client if it exists
      if (whatsappState.client) {
        try {
          await whatsappState.client.destroy();
        } catch (destroyErr) {
          console.error('Error destroying client on timeout:', destroyErr);
        }
        whatsappState.client = null;
      }
      
      // Reset state
      whatsappState.qrCode = null;
      
      res.status(500).json({
        success: false,
        message: 'Failed to generate QR code: ' + qrError.message,
        canDisconnect: true
      });
    }
    
  } catch (error) {
    console.error('WhatsApp QR generation error:', error);
    
    // Clean up the client if it exists
    if (whatsappState.client) {
      try {
        await whatsappState.client.destroy();
      } catch (destroyErr) {
        console.error('Error destroying client on error:', destroyErr);
      }
      whatsappState.client = null;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code: ' + error.message,
      canDisconnect: true
    });
  }
});

// Disconnect WhatsApp
app.post('/api/whatsapp/disconnect', async (req, res) => {
  try {
    // Clean up client if it exists
    if (whatsappState.client) {
      try {
        // Try to logout first (if connected)
        if (whatsappState.connected) {
          try {
            await whatsappState.client.logout();
          } catch (err) {
            console.log('Logout error (may already be logged out):', err.message);
          }
        }
      } catch (err) {
        console.log('Logout attempt error:', err.message);
      }
      
      // Always try to destroy the client
      try {
        await whatsappState.client.destroy();
        console.log('WhatsApp client destroyed successfully');
      } catch (err) {
        console.log('Destroy error (client may already be destroyed):', err.message);
        // Force cleanup even if destroy fails
        try {
          whatsappState.client = null;
        } catch (cleanupErr) {
          console.log('Cleanup error:', cleanupErr.message);
        }
      }
    }
    
    // Also try to clean up session files
    try {
      const sessionPath = path.join(__dirname, 'data', '.wwebjs_auth');
      if (fs.existsSync(sessionPath)) {
        // Note: We don't delete the session folder, just reset the state
        // The session will be reused if user wants to reconnect
      }
    } catch (sessionErr) {
      console.log('Session cleanup error:', sessionErr.message);
    }
    
    // Reset state
    whatsappState.connected = false;
    whatsappState.phoneNumber = null;
    whatsappState.qrCode = null;
    whatsappState.client = null;
    
    console.log('WhatsApp disconnected successfully');
    
    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully'
    });
  } catch (error) {
    console.error('WhatsApp disconnect error:', error);
    
    // Force reset state even on error
    whatsappState.connected = false;
    whatsappState.phoneNumber = null;
    whatsappState.qrCode = null;
    whatsappState.client = null;
    
    res.json({
      success: true,
      message: 'WhatsApp state reset (may have been partially disconnected)'
    });
  }
});

// Serve React app for all non-API routes (must be last)
// This handles client-side routing
// Note: express.static middleware above will handle static files first
if (fs.existsSync(buildPath)) {
  // Use a middleware function instead of wildcard route for Express 5 compatibility
  app.use((req, res, next) => {
    // Skip if it's an API route - let it fall through to 404 handler
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        message: 'API endpoint not found'
      });
    }
    
    // For all other routes (non-API, non-static files), serve the React app's index.html
    // This enables client-side routing in React Router
    res.sendFile(path.join(buildPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        res.status(500).send('Error loading application');
      }
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit the process, just log the error
});

// Start server
const server = app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  if (fs.existsSync(buildPath)) {
    console.log(`React app is being served from: ${buildPath}`);
  } else {
    console.log(`Warning: React build folder not found at: ${buildPath}`);
    console.log('Please run "npm run build" in the frontend directory');
  }
  
  // Initialize WhatsApp connection at startup
  await initializeWhatsApp();
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
  } else {
    console.error('Server error:', err);
  }
});

