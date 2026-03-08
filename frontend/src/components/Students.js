import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Table, Modal, Form, Alert, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { 
  HiOutlineEye, 
  HiOutlineQrCode, 
  HiOutlineBookOpen, 
  HiOutlineCurrencyDollar, 
  HiOutlineIdentification,
  HiOutlineUser,
  HiOutlineUsers,
  HiOutlinePhone,
  HiOutlineHome,
  HiOutlineAcademicCap,
  HiOutlineCalendar,
  HiOutlinePhoto,
  HiOutlineEnvelope,
  HiOutlineMapPin,
  HiOutlineClock,
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineXMark
} from 'react-icons/hi2';
import '../App.css';
import API_URL from '../config';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showIDCardModal, setShowIDCardModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const idCardRef = useRef(null);
  const [idCardImage, setIdCardImage] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    parentName: '',
    contactNumber: '',
    studentWhatsAppNumber: '',
    parentWhatsAppNumber: '',
    address: '',
    grade: ''
  });
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [studentImage, setStudentImage] = useState(null);
  const [studentImagePreview, setStudentImagePreview] = useState(null);
  const [showEditImageModal, setShowEditImageModal] = useState(false);
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [isOperator, setIsOperator] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseToAdd, setCourseToAdd] = useState('');
  const [updatingCourses, setUpdatingCourses] = useState(false);

  useEffect(() => {
    // Check if user is operator
    const isOperatorAuth = localStorage.getItem('isOperatorAuthenticated');
    const isAdminAuth = localStorage.getItem('isAuthenticated');
    setIsOperator(!!isOperatorAuth && !isAdminAuth);
    
    fetchStudents();
    fetchCourses();
    fetchPayments();
    
    // Live syncing with minimum delay (5 seconds)
    const SYNC_INTERVAL = 5000; // 5 seconds minimum delay
    const syncInterval = setInterval(() => {
      fetchStudents();
      fetchCourses();
      fetchPayments();
    }, SYNC_INTERVAL);
    
    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  // Filter students based on search query (name, Student ID, grade)
  const filteredStudents = students.filter(student => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    
    // Search by name
    const nameMatch = student.fullName?.toLowerCase().includes(query);
    
    // Search by Student ID
    const idMatch = student.id?.toLowerCase().includes(query) || 
                   student.id?.toString().includes(query);
    
    // Search by grade
    const gradeMatch = student.grade?.toLowerCase().includes(query);
    
    return nameMatch || idMatch || gradeMatch;
  });

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedStudents,
    goToPage,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination(filteredStudents, {
    itemsPerPageDesktop: 10,
    itemsPerPageMobile: 5
  });

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/students`);
      const data = await response.json();
      if (data.success) {
        // Sort students by createdAt in descending order (newest first)
        const sortedStudents = [...data.students].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // Descending order (newest first)
        });
        setStudents(sortedStudents);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
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

  const normalizeGrade = (grade) => {
    if (!grade) return '';
    return grade.toString().replace(/^Grade\s+/i, '').trim();
  };

  const gradesMatch = (grade1, grade2) => {
    return normalizeGrade(grade1) === normalizeGrade(grade2);
  };

  const getAvailableCourses = () => {
    if (!formData.grade) return [];
    return courses.filter(course => gradesMatch(course.grade, formData.grade));
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear selected courses when grade changes
    if (e.target.name === 'grade') {
      setSelectedCourses([]);
    }
    setError('');
    setSuccess('');
  };

  const handleCourseToggle = (courseId) => {
    setSelectedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setStudentImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStudentImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('fullName', formData.fullName);
      formDataToSend.append('dob', formData.dob);
      formDataToSend.append('parentName', formData.parentName);
      formDataToSend.append('contactNumber', formData.contactNumber);
      formDataToSend.append('studentWhatsAppNumber', formData.studentWhatsAppNumber || '');
      formDataToSend.append('parentWhatsAppNumber', formData.parentWhatsAppNumber || '');
      formDataToSend.append('address', formData.address);
      formDataToSend.append('grade', formData.grade);
      formDataToSend.append('selectedCourses', JSON.stringify(selectedCourses));
      
      if (studentImage) {
        formDataToSend.append('image', studentImage);
      }

      const response = await fetch(`${API_URL}/api/students`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Student added successfully!');
        setFormData({
          fullName: '',
          dob: '',
          parentName: '',
          contactNumber: '',
          studentWhatsAppNumber: '',
          parentWhatsAppNumber: '',
          address: '',
          grade: ''
        });
        setSelectedCourses([]);
        setStudentImage(null);
        setStudentImagePreview(null);
        setShowModal(false);
        // Set the newly added student and show ID card
        setSelectedStudent(data.student);
        setShowIDCardModal(true);
        fetchStudents();
        fetchCourses(); // Refresh courses to get updated enrollment data
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to add student');
      }
    } catch (err) {
      console.error('Error adding student:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        const response = await fetch(`${API_URL}/api/students/${id}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          setSuccess('Student deleted successfully!');
          fetchStudents();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(data.message || 'Failed to delete student');
        }
      } catch (err) {
        console.error('Error deleting student:', err);
        setError('Unable to connect to server. Please try again later.');
      }
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setFormData({
      fullName: '',
      dob: '',
      parentName: '',
      contactNumber: '',
      studentWhatsAppNumber: '',
      parentWhatsAppNumber: '',
      address: '',
      grade: ''
    });
    setSelectedCourses([]);
    setStudentImage(null);
    setStudentImagePreview(null);
    setError('');
    setSuccess('');
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setEditImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleUpdateImage = async (e) => {
    e.preventDefault();
    if (!editImage || !selectedStudent) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('image', editImage);

      const response = await fetch(`${API_URL}/api/students/${selectedStudent.id}/image`, {
        method: 'PUT',
        body: formDataToSend,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Student photo updated successfully!');
        setEditImage(null);
        setEditImagePreview(null);
        setShowEditImageModal(false);
        fetchStudents();
        // Update selected student in modal
        const updatedStudent = { ...selectedStudent, imageUrl: data.imageUrl };
        setSelectedStudent(updatedStudent);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update photo');
      }
    } catch (err) {
      console.error('Error updating student image:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEditImageModal = () => {
    setShowEditImageModal(false);
    setEditImage(null);
    setEditImagePreview(null);
    setError('');
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedStudent(null);
  };

  const handleViewCourses = (student) => {
    setSelectedStudent(student);
    setShowCoursesModal(true);
  };

  const handleCloseCoursesModal = () => {
    setShowCoursesModal(false);
    setSelectedStudent(null);
    setCourseToAdd('');
    setError('');
    setSuccess('');
  };

  const getAvailableCoursesForStudent = (student) => {
    if (!student || !student.grade) return [];
    const enrolledCourseIds = getStudentCourses(student.id).map(c => c.id);
    return courses.filter(course => 
      gradesMatch(course.grade, student.grade) && 
      !enrolledCourseIds.includes(course.id)
    );
  };

  const handleAddCourseToStudent = async (student, courseId) => {
    if (!courseId) {
      setError('Please select a course to add');
      return;
    }

    const course = courses.find(c => c.id === courseId);
    if (!course) {
      setError('Course not found');
      return;
    }

    if (!gradesMatch(course.grade, student.grade)) {
      setError(`Course grade (${course.grade}) does not match student grade (${student.grade})`);
      return;
    }

    const currentEnrolled = course.enrolledStudents || [];
    if (currentEnrolled.includes(student.id)) {
      setError('Student is already enrolled in this course');
      return;
    }

    setUpdatingCourses(true);
    setError('');
    setSuccess('');

    try {
      const updatedEnrolledStudents = [...currentEnrolled, student.id];
      const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrolledStudents: updatedEnrolledStudents
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Student enrolled in ${course.courseName} successfully!`);
        setCourseToAdd('');
        await fetchCourses();
        await fetchStudents();
        // Update selected student
        const updatedStudentsResponse = await fetch(`${API_URL}/api/students`);
        const updatedStudentsData = await updatedStudentsResponse.json();
        if (updatedStudentsData.success) {
          const updatedStudent = updatedStudentsData.students.find(s => s.id === student.id);
          if (updatedStudent) {
            setSelectedStudent(updatedStudent);
          }
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to add course');
      }
    } catch (err) {
      console.error('Error adding course to student:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setUpdatingCourses(false);
    }
  };

  const handleRemoveCourseFromStudent = async (student, courseId) => {
    if (!window.confirm('Are you sure you want to remove this course from the student?')) {
      return;
    }

    const course = courses.find(c => c.id === courseId);
    if (!course) {
      setError('Course not found');
      return;
    }

    setUpdatingCourses(true);
    setError('');
    setSuccess('');

    try {
      const currentEnrolled = course.enrolledStudents || [];
      const updatedEnrolledStudents = currentEnrolled.filter(id => id !== student.id);
      
      const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrolledStudents: updatedEnrolledStudents
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Student removed from ${course.courseName} successfully!`);
        await fetchCourses();
        await fetchStudents();
        // Update selected student
        const updatedStudentsResponse = await fetch(`${API_URL}/api/students`);
        const updatedStudentsData = await updatedStudentsResponse.json();
        if (updatedStudentsData.success) {
          const updatedStudent = updatedStudentsData.students.find(s => s.id === student.id);
          if (updatedStudent) {
            setSelectedStudent(updatedStudent);
          }
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to remove course');
      }
    } catch (err) {
      console.error('Error removing course from student:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setUpdatingCourses(false);
    }
  };

  const handleViewPayments = (student) => {
    setSelectedStudent(student);
    setShowPaymentsModal(true);
  };

  const handleClosePaymentsModal = () => {
    setShowPaymentsModal(false);
    setSelectedStudent(null);
  };

  const handleMarkAsPaid = async (student, monthKey, amount, courseId, courseName) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const response = await fetch(`${API_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          monthKey: monthKey,
          amount: amount,
          courseId: courseId || null,
          paymentDate: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Payment for ${courseName || 'month'} marked as paid successfully!`);
        // Refresh payments and students data
        await fetchPayments();
        await fetchStudents();
        // Update selected student to reflect new payment status
        const updatedStudentsResponse = await fetch(`${API_URL}/api/students`);
        const updatedStudentsData = await updatedStudentsResponse.json();
        if (updatedStudentsData.success) {
          const updatedStudent = updatedStudentsData.students.find(s => s.id === student.id);
          if (updatedStudent) {
            setSelectedStudent(updatedStudent);
          }
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to mark payment as paid');
        setTimeout(() => setError(''), 5000);
      }
    } catch (err) {
      console.error('Error marking payment as paid:', err);
      setError('Unable to connect to server. Please try again later.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getStudentCourses = (studentId) => {
    return courses.filter(course =>
      course.enrolledStudents && 
      Array.isArray(course.enrolledStudents) && 
      course.enrolledStudents.includes(studentId)
    );
  };

  const calculateMonthlyPayments = (student) => {
    const studentCourses = getStudentCourses(student.id);
    if (studentCourses.length === 0) {
      return [];
    }

    const enrollmentDate = new Date(student.createdAt);
    const currentDate = new Date();
    const monthlyPayments = [];

    // Start from the 1st of the enrollment month (month 1st is considered a new month)
    let currentMonth = new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth(), 1);
    
    // Calculate the last day of current month
    const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    while (currentMonth <= lastDayOfCurrentMonth) {
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      // Calculate total fee for this month
      let totalFee = 0;
      const courseDetails = [];
      
      studentCourses.forEach(course => {
        // Check if student was enrolled in this course before or during this month
        // Course enrollment date (when course was created or student was added)
        const courseCreatedDate = new Date(course.createdAt);
        const enrollmentDateForCourse = courseCreatedDate < enrollmentDate ? enrollmentDate : courseCreatedDate;
        
        // Last day of current payment month
        const lastDayOfPaymentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        // Student should pay if they were enrolled before or during this month
        if (enrollmentDateForCourse <= lastDayOfPaymentMonth) {
          const courseFee = parseFloat(course.courseFee) || 0;
          totalFee += courseFee;
          
          // Check if this specific course is paid for this month - use the payments state variable
          const coursePayment = payments.find(
            p => p.studentId === student.id && 
                 p.monthKey === monthKey && 
                 p.courseId === course.id
          );
          
          courseDetails.push({
            courseId: course.id,
            courseName: course.courseName,
            fee: courseFee,
            subject: course.subject || '-',
            grade: course.grade,
            isPaid: coursePayment ? true : false,
            paymentDate: coursePayment ? coursePayment.paymentDate : null
          });
        }
      });

      if (totalFee > 0) {
        // Calculate paid amount and pending amount
        const paidAmount = courseDetails
          .filter(c => c.isPaid)
          .reduce((sum, c) => sum + c.fee, 0);
        const pendingAmount = totalFee - paidAmount;
        
        // Check if all courses are paid
        const allPaid = courseDetails.length > 0 && courseDetails.every(c => c.isPaid);
        
        monthlyPayments.push({
          month: monthName,
          monthKey: monthKey,
          totalFee: totalFee,
          paidAmount: paidAmount,
          pendingAmount: pendingAmount,
          courses: courseDetails,
          status: allPaid ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending')
        });
      }

      // Move to next month (1st of next month)
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    return monthlyPayments;
  };


  const handleGenerateIDCard = (student) => {
    setSelectedStudent(student);
    setShowIDCardModal(true);
  };

  const handleCloseIDCardModal = () => {
    setShowIDCardModal(false);
    setSelectedStudent(null);
    setIdCardImage(null);
  };

  const generateIDCardImage = async () => {
    if (!selectedStudent) return;
    
    setGeneratingImage(true);
    setIdCardImage(null);
    
    try {
      // Wait for the DOM to render and ref to be available
      let attempts = 0;
      while (!idCardRef.current && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!idCardRef.current) {
        throw new Error('ID card element not found');
      }
      
      // Wait a bit more for images to load
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(idCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        onclone: (clonedDoc) => {
          // Ensure images are loaded in the cloned document
          const clonedElement = clonedDoc.querySelector('[data-id-card]');
          if (clonedElement) {
            const images = clonedElement.querySelectorAll('img');
            images.forEach(img => {
              if (img.src && !img.complete) {
                img.style.display = 'none';
              }
            });
          }
        }
      });

      // Convert canvas to image data URL
      const imgData = canvas.toDataURL('image/png');
      setIdCardImage(imgData);
    } catch (error) {
      console.error('Error generating ID card image:', error);
      setError('Failed to generate ID card image. Please try again.');
    } finally {
      setGeneratingImage(false);
    }
  };

  // Generate image when modal opens
  useEffect(() => {
    if (showIDCardModal && selectedStudent) {
      generateIDCardImage();
    }
  }, [showIDCardModal, selectedStudent]);

  const handleDownloadIDCard = async () => {
    if (!idCardRef.current || !selectedStudent) return;

    try {
      // Dynamically import html2canvas and jspdf
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      const canvas = await html2canvas(idCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false
      });

      // Get canvas dimensions
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate PDF dimensions (A4 ratio or maintain aspect ratio)
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });
      
      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/png');
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Download PDF
      pdf.save(`student-id-card-${selectedStudent.id}.pdf`);
    } catch (error) {
      console.error('Error downloading ID card:', error);
      alert('Failed to download ID card. Please try again.');
    }
  };

  const handleDownloadIDCardAsImage = async () => {
    if (!idCardRef.current || !selectedStudent) return;

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(idCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false
      });

      // Convert canvas to image data URL
      const imgData = canvas.toDataURL('image/png');
      
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.download = `student-id-card-${selectedStudent.id}.png`;
      link.href = imgData;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading ID card as image:', error);
      alert('Failed to download ID card as image. Please try again.');
    }
  };

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="dashboard-title">Students</h2>
            <p className="dashboard-subtitle">Manage system students</p>
          </div>
          <Button
            className="add-operator-btn"
            onClick={() => setShowModal(true)}
            style={{ whiteSpace: 'nowrap' }}
          >
            + Add Student
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-3" onClose={() => setSuccess('')} dismissible>
          {success}
        </Alert>
      )}

      <div className="operators-table-container">
        <div className="table-header-section">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <h3>Students ({filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'})</h3>
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    paddingLeft: '40px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px'
                  }}
                />
              </div>
              {searchQuery && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="table-responsive">
          {/* Desktop Table View */}
          <Table className="operators-table d-none d-lg-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '60px' }} className="text-start">#</th>
                <th className="text-start">Full Name</th>
                <th style={{ width: '180px' }} className="text-start">Grade</th>
                <th className="text-start">Contact Number</th>
                <th style={{ width: '280px' }} className="text-start">Actions</th>
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
                      <HiOutlineUsers size={48} style={{ opacity: 0.3 }} />
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                        No students found. Click "Add Student" to create one.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, index) => (
                  <tr key={student.id} style={{ transition: 'background-color 0.2s ease' }}>
                    <td style={{ 
                      padding: '16px 32px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#64748b',
                      textAlign: 'left'
                    }}>
                      {startIndex + index + 1}
                    </td>
                    <td style={{ padding: '16px 32px', textAlign: 'left' }}>
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
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
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
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: student.imageUrl ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                          display: student.imageUrl ? 'none' : 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#3b82f6',
                          flexShrink: 0
                        }}>
                          <HiOutlineUser size={16} />
                        </div>
                        <div>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '700', 
                            color: '#1e293b'
                          }}>
                            {student.fullName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px', textAlign: 'left' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '14px',
                        color: '#64748b',
                        fontWeight: '500'
                      }}>
                        <HiOutlineAcademicCap size={16} style={{ color: '#94a3b8' }} />
                        <span>{student.grade}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px', textAlign: 'left' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '14px',
                        color: '#64748b'
                      }}>
                        <HiOutlinePhone size={16} style={{ color: '#94a3b8' }} />
                        <span>{student.contactNumber}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 32px', textAlign: 'left' }}>
                      <div className="d-flex gap-2 flex-wrap">
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>View Details</Tooltip>}
                        >
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleViewDetails(student)}
                            className="action-btn-icon"
                          >
                            <HiOutlineEye />
                          </Button>
                        </OverlayTrigger>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>View Courses</Tooltip>}
                        >
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleViewCourses(student)}
                            className="action-btn-icon"
                          >
                            <HiOutlineBookOpen />
                          </Button>
                        </OverlayTrigger>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>View Payments</Tooltip>}
                        >
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => handleViewPayments(student)}
                            className="action-btn-icon"
                          >
                            <HiOutlineCurrencyDollar />
                          </Button>
                        </OverlayTrigger>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>Generate ID Card</Tooltip>}
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleGenerateIDCard(student)}
                            className="action-btn-icon"
                          >
                            <HiOutlineIdentification />
                          </Button>
                        </OverlayTrigger>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>Delete Student</Tooltip>}
                        >
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(student.id)}
                            className="action-btn-icon"
                          >
                            <HiOutlineTrash />
                          </Button>
                        </OverlayTrigger>
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
              <p>No students found. Click "Add Student" to create one.</p>
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
                            borderRadius: '50%',
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
                        borderRadius: '50%',
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
                    <div className="student-card-actions">
                      <div className="student-actions-grid">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleViewDetails(student)}
                          className="action-btn"
                        >
                          View Details
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleViewCourses(student)}
                          className="action-btn"
                        >
                          View Courses
                        </Button>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => handleViewPayments(student)}
                          className="action-btn"
                        >
                          View Payments
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleGenerateIDCard(student)}
                          className="action-btn"
                        >
                          Generate ID Card
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(student.id)}
                          className="action-btn"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {students.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            onNext={nextPage}
            onPrev={prevPage}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
          />
        )}
      </div>

      {/* Add Student Modal - Benchmark Style */}
      <Modal show={showModal} onHide={handleClose} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Create New Student Profile</h2>
            <p>Add a new student to the system</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          <Form onSubmit={handleSubmit} className="student-form-body">
            <div className="student-form-grid">
              {/* Left Column */}
              <div className="student-form-column">
                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlineUser className="student-form-label-icon" />
                    Student Full Name
                  </label>
                  <input
                type="text"
                name="fullName"
                    placeholder="e.g. John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
                    className="student-form-input"
              />
                </div>

                <div className="student-form-grid-2">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineCalendar className="student-form-label-icon" />
                      Date of Birth
                    </label>
                    <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                required
                      className="student-form-input"
              />
                  </div>
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineAcademicCap className="student-form-label-icon" />
                      Grade
                    </label>
                    <input
                      type="text"
                      name="grade"
                      placeholder="e.g. Grade 1"
                      value={formData.grade}
                      onChange={handleChange}
                      required
                      className="student-form-input"
                    />
                  </div>
                </div>

                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlineUser className="student-form-label-icon" />
                    Parent Name
                  </label>
                  <input
                type="text"
                name="parentName"
                placeholder="Enter parent name"
                value={formData.parentName}
                onChange={handleChange}
                required
                    className="student-form-input"
              />
                </div>

                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlinePhone className="student-form-label-icon" />
                    Contact Number
                  </label>
                  <input
                type="tel"
                name="contactNumber"
                    placeholder="+94 77 XXX XXXX"
                value={formData.contactNumber}
                onChange={handleChange}
                required
                    className="student-form-input"
                  />
                </div>

                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlineHome className="student-form-label-icon" />
                    Address
                  </label>
                  <textarea
                    name="address"
                    placeholder="Enter address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="student-form-input"
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="student-form-column">
                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlinePhone className="student-form-label-icon" />
                    Student WhatsApp (Optional)
                  </label>
                  <input
                type="tel"
                name="studentWhatsAppNumber"
                    placeholder="+94 77 XXX XXXX"
                value={formData.studentWhatsAppNumber}
                onChange={handleChange}
                    className="student-form-input"
              />
                </div>

                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlinePhone className="student-form-label-icon" />
                    Parent WhatsApp (Optional)
                  </label>
                  <input
                type="tel"
                name="parentWhatsAppNumber"
                    placeholder="+94 77 XXX XXXX"
                value={formData.parentWhatsAppNumber}
                onChange={handleChange}
                    className="student-form-input"
                  />
                </div>

                <div className="student-form-field">
                  <label className="student-form-label">
                    <HiOutlinePhoto className="student-form-label-icon" />
                    Student Photo (Optional)
                  </label>
                  <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                    className="student-form-input"
              />
              {studentImagePreview && (
                    <div style={{ marginTop: '12px' }}>
                  <img 
                    src={studentImagePreview} 
                    alt="Preview" 
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '200px', 
                          objectFit: 'cover', 
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0'
                        }}
                  />
                </div>
              )}
                </div>
              </div>
            </div>

            {formData.grade && (
              <div className="student-form-field" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                <label className="student-form-label">
                  <HiOutlineBookOpen className="student-form-label-icon" />
                  Select Courses (Optional)
                </label>
                <div style={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px', 
                  padding: '16px', 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  background: '#f8fafc'
                }}>
                  {getAvailableCourses().length > 0 ? (
                    <>
                      {getAvailableCourses().map((course) => (
                        <div key={course.id} style={{ marginBottom: '12px' }}>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <input
                          type="checkbox"
                              checked={selectedCourses.includes(course.id)}
                              onChange={() => handleCourseToggle(course.id)}
                              style={{ marginRight: '12px', cursor: 'pointer' }}
                            />
                            <div>
                              <strong style={{ color: '#0f172a', fontSize: '14px' }}>{course.courseName}</strong>
                              <span style={{ color: '#64748b', fontSize: '13px', marginLeft: '8px' }}>
                                ({course.subject}) - Rs {parseFloat(course.courseFee || 0).toFixed(2)}
                              </span>
                            </div>
                          </label>
                        </div>
                      ))}
                      {selectedCourses.length > 0 && (
                        <div style={{ 
                          marginTop: '16px', 
                          padding: '12px', 
                          background: 'rgba(59, 130, 246, 0.1)', 
                          borderRadius: '8px',
                          border: '1px solid rgba(59, 130, 246, 0.2)'
                        }}>
                          <small style={{ color: '#2563eb', fontWeight: '600' }}>
                            Selected: {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''}
                          </small>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
                      No courses available for grade "{formData.grade}". 
                      Please create courses for this grade first.
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <Alert variant="danger" style={{ 
                marginTop: '24px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                border: 'none',
                borderRadius: '8px'
              }}>
                {error}
              </Alert>
            )}

            <div className="student-form-actions">
              <button 
                type="button"
                onClick={handleClose}
                className="student-form-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="student-form-submit-btn"
                disabled={loading}
              >
                {loading ? 'Creating...' : (
                  <>
                    <span>+</span>
                    Create Student
                  </>
                )}
              </button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Student Details Modal - Benchmark Style */}
      <Modal show={showDetailsModal} onHide={handleCloseDetailsModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Student Details</h2>
            <p>View complete student information</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedStudent && (
            <div className="student-form-body">
              {/* Student Photo Section */}
              <div style={{ textAlign: 'center', padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                {selectedStudent.imageUrl ? (
                  <img 
                    src={`${API_URL}${selectedStudent.imageUrl}`} 
                    alt={selectedStudent.fullName}
                    style={{ 
                      maxWidth: '180px', 
                      maxHeight: '180px', 
                      objectFit: 'cover', 
                      borderRadius: '16px', 
                      border: '2px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}
                  />
                ) : (
                  <div style={{ 
                    width: '180px', 
                    height: '180px', 
                    backgroundColor: '#f8fafc', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto',
                    border: '2px solid #e2e8f0'
                  }}>
                    <HiOutlinePhoto style={{ fontSize: '48px', color: '#94a3b8' }} />
                  </div>
                )}
                {isOperator && (
                  <div style={{ marginTop: '16px' }}>
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={() => {
                      setEditImagePreview(selectedStudent.imageUrl ? `${API_URL}${selectedStudent.imageUrl}` : null);
                      setShowEditImageModal(true);
                      }}
                      style={{
                        borderRadius: '8px',
                        padding: '6px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        borderColor: '#3b82f6',
                        color: '#3b82f6'
                      }}
                    >
                      {selectedStudent.imageUrl ? 'Change Photo' : 'Add Photo'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="student-form-grid" style={{ padding: '24px' }}>
                {/* Left Column */}
                <div className="student-form-column">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineUser className="student-form-label-icon" />
                      Full Name
                    </label>
                    <div className="student-details-value">{selectedStudent.fullName}</div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineIdentification className="student-form-label-icon" />
                      Student ID
                    </label>
                    <div className="student-details-value">{selectedStudent.id}</div>
              </div>

                  <div className="student-form-grid-2">
                    <div className="student-form-field">
                      <label className="student-form-label">
                        <HiOutlineCalendar className="student-form-label-icon" />
                        Date of Birth
                      </label>
                      <div className="student-details-value">
                  {selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : '-'}
              </div>
              </div>
                    <div className="student-form-field">
                      <label className="student-form-label">
                        Age (for 2026)
                      </label>
                      <div className="student-details-value">{selectedStudent.age} years</div>
              </div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineUser className="student-form-label-icon" />
                      Parent Name
                    </label>
                    <div className="student-details-value">{selectedStudent.parentName}</div>
              </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlinePhone className="student-form-label-icon" />
                      Contact Number
                    </label>
                    <div className="student-details-value">{selectedStudent.contactNumber}</div>
              </div>
              </div>

                {/* Right Column */}
                <div className="student-form-column">
                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlinePhone className="student-form-label-icon" />
                      Student WhatsApp
                    </label>
                    <div className="student-details-value">
                      {selectedStudent.studentWhatsAppNumber || 'Not provided'}
                    </div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlinePhone className="student-form-label-icon" />
                      Parent WhatsApp
                    </label>
                    <div className="student-details-value">
                      {selectedStudent.parentWhatsAppNumber || selectedStudent.contactNumber || 'Not provided'}
                    </div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineMapPin className="student-form-label-icon" />
                      Address
                    </label>
                    <div className="student-details-value">{selectedStudent.address}</div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineAcademicCap className="student-form-label-icon" />
                      Grade
                    </label>
                    <div className="student-details-value">{selectedStudent.grade}</div>
                  </div>

                  <div className="student-form-field">
                    <label className="student-form-label">
                      <HiOutlineClock className="student-form-label-icon" />
                      Created At
                    </label>
                    <div className="student-details-value">
                  {selectedStudent.createdAt ? new Date(selectedStudent.createdAt).toLocaleString() : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ 
          background: '#f8fafc', 
          borderTop: '1px solid #e2e8f0', 
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <Button 
            variant="secondary" 
            onClick={handleCloseDetailsModal}
            style={{
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: '600',
              background: '#e2e8f0',
              color: '#475569',
              border: 'none'
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>


      {/* View Courses Modal - Benchmark Style */}
      <Modal show={showCoursesModal} onHide={handleCloseCoursesModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Student Courses</h2>
            <p>{selectedStudent?.fullName} • Grade {selectedStudent?.grade}</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedStudent && (
            <div className="student-form-body">
              {error && (
                <Alert variant="danger" className="m-3" onClose={() => setError('')} dismissible>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" className="m-3" onClose={() => setSuccess('')} dismissible>
                  {success}
                </Alert>
              )}
              
              {/* Add Course Section */}
              {getAvailableCoursesForStudent(selectedStudent).length > 0 && (
                <div style={{
                  margin: '24px',
                  padding: '20px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <HiOutlinePlus style={{ fontSize: '20px', color: '#3b82f6' }} />
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                      Add Course
                    </h4>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <Form.Label style={{ 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        color: '#475569',
                        marginBottom: '8px'
                      }}>
                        Select Course
                      </Form.Label>
                      <Form.Select
                        value={courseToAdd}
                        onChange={(e) => setCourseToAdd(e.target.value)}
                        disabled={updatingCourses}
                        style={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '14px',
                          padding: '10px 12px'
                        }}
                      >
                        <option value="">Choose a course...</option>
                        {getAvailableCoursesForStudent(selectedStudent).map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.courseName} ({course.subject}) - Rs {parseFloat(course.courseFee || 0).toFixed(2)}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleAddCourseToStudent(selectedStudent, courseToAdd)}
                      disabled={!courseToAdd || updatingCourses}
                      style={{
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {updatingCourses ? 'Adding...' : (
                        <>
                          <HiOutlinePlus style={{ marginRight: '6px' }} />
                          Add Course
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {getStudentCourses(selectedStudent.id).length > 0 ? (
                <>
                  <div className="operators-table-container">
                    <div className="table-header-section">
                      <h3>Enrolled Courses ({getStudentCourses(selectedStudent.id).length})</h3>
                    </div>
                <div className="table-responsive">
                      <Table className="operators-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Course Name</th>
                        <th>Subject</th>
                        <th>Grade</th>
                        <th>Course Fee</th>
                        <th style={{ width: '100px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getStudentCourses(selectedStudent.id).map((course, index) => (
                        <tr key={course.id}>
                          <td>{index + 1}</td>
                          <td>{course.courseName}</td>
                          <td>{course.subject || '-'}</td>
                          <td>{course.grade}</td>
                              <td>
                                {course.courseFee ? (
                                  <span style={{ 
                                    fontWeight: '600', 
                                    color: '#3b82f6' 
                                  }}>
                                    Rs {parseFloat(course.courseFee).toFixed(2)}
                                  </span>
                                ) : '-'}
                              </td>
                          <td>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>Remove Course</Tooltip>}
                            >
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRemoveCourseFromStudent(selectedStudent, course.id)}
                                disabled={updatingCourses}
                                className="action-btn-icon"
                              >
                                <HiOutlineXMark />
                              </Button>
                            </OverlayTrigger>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                    </div>
                  </div>
                  <div style={{
                    margin: '24px',
                    padding: '20px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#64748b',
                          marginBottom: '8px'
                        }}>
                          Total Monthly Fee
                        </div>
                        <div style={{ 
                          fontSize: '28px', 
                          fontWeight: '700',
                          color: '#0f172a'
                        }}>
                    Rs {getStudentCourses(selectedStudent.id).reduce((sum, course) => 
                      sum + (parseFloat(course.courseFee) || 0), 0
                    ).toFixed(2)}
                  </div>
                </div>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3b82f6'
                      }}>
                        <HiOutlineCurrencyDollar style={{ 
                          fontSize: '28px'
                        }} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  color: '#94a3b8'
                }}>
                  <HiOutlineBookOpen style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No courses enrolled.</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                    {getAvailableCoursesForStudent(selectedStudent).length > 0 
                      ? 'Add a course using the form above to get started.'
                      : 'No courses available for this student\'s grade.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ 
          background: '#f8fafc', 
          borderTop: '1px solid #e2e8f0', 
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <Button 
            variant="secondary" 
            onClick={handleCloseCoursesModal}
            style={{
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: '600',
              background: '#e2e8f0',
              color: '#475569',
              border: 'none'
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Payments Modal - Benchmark Style */}
      <Modal show={showPaymentsModal} onHide={handleClosePaymentsModal} centered size="xl" backdrop="static">
        <Modal.Header closeButton style={{ padding: 0, border: 'none' }}>
          <div className="student-form-header" style={{ width: '100%' }}>
            <h2>Student Payments</h2>
            <p>{selectedStudent?.fullName} • Grade {selectedStudent?.grade} • Enrolled {selectedStudent?.createdAt ? new Date(selectedStudent.createdAt).toLocaleDateString() : 'N/A'}</p>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          {selectedStudent && (
            <div className="student-form-body">
              {error && (
                <Alert variant="danger" className="m-3" onClose={() => setError('')} dismissible>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" className="m-3" onClose={() => setSuccess('')} dismissible>
                  {success}
                </Alert>
              )}
              {calculateMonthlyPayments(selectedStudent).length > 0 ? (
                <>
                  <div className="operators-table-container">
                    <div className="table-header-section">
                      <h3>Payment Records ({calculateMonthlyPayments(selectedStudent).length} months)</h3>
                    </div>
                <div className="table-responsive">
                      <Table className="operators-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Courses</th>
                        <th>Total Fee</th>
                        <th>Paid</th>
                        <th>Pending</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateMonthlyPayments(selectedStudent).map((payment, index) => (
                        <tr key={payment.monthKey}>
                          <td><strong>{payment.month}</strong></td>
                          <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {payment.courses.map((course, idx) => (
                                    <div key={idx} style={{
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      background: course.isPaid ? '#f8fafc' : 'rgba(245, 158, 11, 0.1)',
                                      border: `1px solid ${course.isPaid ? '#e2e8f0' : 'rgba(245, 158, 11, 0.2)'}`,
                                      fontSize: '13px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                          <strong>{course.courseName}</strong>
                                          <span style={{ color: '#64748b' }}>({course.subject})</span>
                                          <span style={{ fontWeight: '600', color: '#3b82f6' }}>Rs {course.fee.toFixed(2)}</span>
                                          {course.isPaid && (
                                            <span style={{
                                              padding: '2px 8px',
                                              borderRadius: '6px',
                                              fontSize: '11px',
                                              fontWeight: '700',
                                              background: 'rgba(16, 185, 129, 0.1)',
                                              color: '#059669'
                                            }}>
                                              Paid
                                            </span>
                                          )}
                                        </div>
                                        {!course.isPaid && (
                                          <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => handleMarkAsPaid(selectedStudent, payment.monthKey, course.fee, course.courseId, course.courseName)}
                                            disabled={loading}
                                            style={{ whiteSpace: 'nowrap' }}
                                          >
                                            Pay
                                          </Button>
                                        )}
                                      </div>
                                  {course.isPaid && course.paymentDate && (
                                        <div style={{ 
                                          fontSize: '11px', 
                                          color: '#94a3b8',
                                          marginTop: '4px'
                                        }}>
                                      Paid on {new Date(course.paymentDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                              <td>
                                <strong style={{ color: '#0f172a' }}>Rs {payment.totalFee.toFixed(2)}</strong>
                              </td>
                              <td>
                                <span style={{ fontWeight: '600', color: '#059669' }}>
                                  Rs {payment.paidAmount.toFixed(2)}
                            </span>
                          </td>
                              <td>
                                <span style={{ fontWeight: '600', color: '#dc2626' }}>
                                  Rs {payment.pendingAmount.toFixed(2)}
                            </span>
                          </td>
                          <td>
                                <span style={{
                                  padding: '4px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  background: payment.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 
                                             payment.status === 'Partial' ? 'rgba(59, 130, 246, 0.1)' : 
                                             'rgba(245, 158, 11, 0.1)',
                                  color: payment.status === 'Paid' ? '#059669' : 
                                         payment.status === 'Partial' ? '#2563eb' : 
                                         '#d97706'
                                }}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                    </div>
                  </div>
                  <div style={{
                    margin: '24px',
                    padding: '20px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '20px' 
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#64748b',
                          marginBottom: '8px'
                        }}>
                          Total Amount
                        </div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: '700',
                          color: '#0f172a'
                        }}>
                        Rs {calculateMonthlyPayments(selectedStudent).reduce((sum, payment) => 
                          sum + payment.totalFee, 0
                        ).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#64748b',
                          marginBottom: '8px'
                        }}>
                          Total Paid
                        </div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: '700',
                          color: '#059669'
                        }}>
                          Rs {calculateMonthlyPayments(selectedStudent)
                            .reduce((sum, payment) => sum + payment.paidAmount, 0)
                            .toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#64748b',
                          marginBottom: '8px'
                        }}>
                          To Be Paid
                        </div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: '700',
                          color: '#dc2626'
                        }}>
                          Rs {calculateMonthlyPayments(selectedStudent)
                            .reduce((sum, payment) => sum + payment.pendingAmount, 0)
                            .toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                </>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  color: '#94a3b8'
                }}>
                  <HiOutlineCurrencyDollar style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No payment records found.</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                    Student is not enrolled in any courses yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ 
          background: '#f8fafc', 
          borderTop: '1px solid #e2e8f0', 
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <Button 
            variant="secondary" 
            onClick={handleClosePaymentsModal}
            style={{
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: '600',
              background: '#e2e8f0',
              color: '#475569',
              border: 'none'
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Student Image Modal */}
      <Modal show={showEditImageModal} onHide={handleCloseEditImageModal} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Update Student Photo - {selectedStudent?.fullName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateImage}>
            <Form.Group className="mb-3">
              <Form.Label className="form-label">Student Photo</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleEditImageChange}
                className="form-control-custom"
                required
              />
              {editImagePreview && (
                <div className="mt-2">
                  <img 
                    src={editImagePreview} 
                    alt="Preview" 
                    style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                </div>
              )}
              <Form.Text className="text-muted">
                Upload a photo of the student (max 5MB, JPG/PNG)
              </Form.Text>
            </Form.Group>

            {error && (
              <Alert variant="danger" className="mt-3">
                {error}
              </Alert>
            )}

            {success && (
              <Alert variant="success" className="mt-3">
                {success}
              </Alert>
            )}

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={handleCloseEditImageModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !editImage}
              >
                {loading ? 'Updating...' : 'Update Photo'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ID Card Modal */}
      <Modal show={showIDCardModal} onHide={handleCloseIDCardModal} centered size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Generate Student ID Card</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <div>
              {/* Hidden div for html2canvas to capture */}
              <div
                ref={idCardRef}
                data-id-card="true"
                style={{
                  position: 'fixed',
                  left: '-9999px',
                  top: 0,
                  width: '400px',
                  aspectRatio: '2/3',
                  background: 'white',
                  borderRadius: '16px',
                  padding: '0',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                  zIndex: -1
                }}
              >
                {/* Template Background Image */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `url(/id-card-template.jpg)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  zIndex: 0
                }}></div>

                {/* Content Overlay */}
                <div style={{ position: 'relative', zIndex: 1, padding: '20px', paddingTop: '0' }}>
                  {/* Student Image at the top */}
                  <div style={{
                    textAlign: 'left',
                    marginBottom: '20px',
                    marginTop: '97px'
                  }}>
                    <div style={{
                      width: '204px',
                      height: '204px',
                      borderRadius: '30px',
                      overflow: 'hidden',
                      margin: '0',
                      marginLeft:'10px',
                      background: '#f8f9fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {selectedStudent.imageUrl ? (
                        <img
                          src={`${API_URL}${selectedStudent.imageUrl}`}
                          alt={selectedStudent.fullName}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
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
                        display: selectedStudent.imageUrl ? 'none' : 'flex',
                        width: '100%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white',
                        fontSize: '48px',
                        fontWeight: 'bold'
                      }}>
                        {selectedStudent.fullName ? selectedStudent.fullName.charAt(0).toUpperCase() : 'S'}
                      </div>
                    </div>
                  </div>

                  {/* Student Name */}
                  <div style={{
                    textAlign: 'left',
                    marginBottom: '15px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      marginLeft:'10px',
                      marginTop: '10px',
                      fontSize: '26px',
                      fontWeight: 'bold',
                      color: '#237ac6',
                      lineHeight: '1.2'
                    }}>
                      {selectedStudent.fullName}
                    </h3>
                    {/* Student ID */}
                    <div style={{}}>

                      <p style={{
                        margin: '0',
                        fontSize: '16px',
                        marginLeft:'10px',
                        borderRadius: '100px',
                        color: '#000',
                        fontWeight: '500',
                        display: 'inline-block',
                        marginTop:'10px'
                      }}>
                        Grade {selectedStudent.grade}
                      </p>
                    </div>
                    <div style={{}}>

                      <p style={{
                        margin: '0',
                        fontSize: '16px',
                        marginLeft:'10px',
                        borderRadius: '100px',
                        color: '#000',
                        fontWeight: '500',
                        display: 'inline-block',
                      }}>
                        Student ID : {selectedStudent.id}
                      </p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div style={{
                    textAlign: 'left',
                    marginTop: '0px',
                    marginLeft:'10px'
                  }}>
                    <div style={{
                      display: 'inline-block',
                      background: 'transparent'
                    }}>
                      <QRCodeSVG
                        value={selectedStudent.id}
                        size={100}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Display the generated image */}
              <div style={{ textAlign: 'center' }}>
                {generatingImage ? (
                  <div style={{ 
                    padding: '60px 20px',
                    color: '#64748b',
                    fontSize: '14px'
                  }}>
                    <div style={{ 
                      display: 'inline-block',
                      width: '40px',
                      height: '40px',
                      border: '4px solid #e2e8f0',
                      borderTop: '4px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '16px'
                    }}></div>
                    <p style={{ margin: 0 }}>Generating ID card image...</p>
                  </div>
                ) : idCardImage ? (
                  <img
                    src={idCardImage}
                    alt="Student ID Card"
                    style={{
                      height: '50vh',
                      width: 'auto',
                      maxWidth: '100%',
                      borderRadius: '16px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      margin: '0 auto',
                      display: 'block'
                    }}
                  />
                ) : (
                  <div style={{ 
                    padding: '60px 20px',
                    color: '#64748b',
                    fontSize: '14px'
                  }}>
                    <p>Loading ID card...</p>
                  </div>
                )}
              </div>
              <p className="text-muted text-center mt-3 small">
                Preview of the student ID card. Click download to save as PDF or Image.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseIDCardModal}>
            Close
          </Button>
          <Button variant="success" onClick={handleDownloadIDCardAsImage}>
            Download as Image
          </Button>
          <Button variant="primary" onClick={handleDownloadIDCard}>
            Download as PDF
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Students;
