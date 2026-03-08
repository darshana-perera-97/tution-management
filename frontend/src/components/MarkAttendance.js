import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { Container, Button, Form, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  HiOutlineCheckCircle,
  HiOutlineQrCode,
  HiOutlineBookOpen,
  HiOutlineIdentification,
  HiOutlineCamera,
  HiOutlineXMark,
  HiOutlineClipboardDocumentCheck
} from 'react-icons/hi2';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import OperatorSidebar from './OperatorSidebar';
import OperatorTopNavbar from './OperatorTopNavbar';
import '../App.css';
import API_URL from '../config';

const MarkAttendance = () => {
  const navigate = useNavigate();
  
  // Check user type for proper layout
  const isAdmin = localStorage.getItem('isAuthenticated');
  const isOperator = localStorage.getItem('isOperatorAuthenticated');
  const adminData = isAdmin ? JSON.parse(localStorage.getItem('admin') || '{}') : null;
  const operatorData = isOperator ? JSON.parse(localStorage.getItem('operator') || '{}') : null;
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanResult, setQrScanResult] = useState('');
  const [scannerInstance, setScannerInstance] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [showAutoMarkResultModal, setShowAutoMarkResultModal] = useState(false);
  const [autoMarkResult, setAutoMarkResult] = useState(null);
  const qrScannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const scannerInitializedRef = useRef(false);
  const handleMarkAttendanceRef = useRef(null);
  const handleAutoMarkAttendanceRef = useRef(null);

  // Check if user is admin or operator
  const isAdminOrOperator = isAdmin || isOperator;
  
  // Check if user is a teacher
  const isTeacher = localStorage.getItem('isTeacherAuthenticated');
  const teacherData = isTeacher ? JSON.parse(localStorage.getItem('teacher') || '{}') : null;
  const teacherId = teacherData?.id || null;

  // Helper function to safely stop video elements
  const safeStopVideoElements = (scannerElement) => {
    if (!scannerElement) return;
    
    const videoElements = scannerElement.querySelectorAll('video');
    videoElements.forEach((video) => {
      try {
        // Stop tracks first before pausing to avoid interrupting play()
        if (video.srcObject) {
          const tracks = video.srcObject.getTracks();
          tracks.forEach((track) => {
            try {
              track.stop();
            } catch (trackErr) {
              // Suppress track stop errors
            }
          });
          video.srcObject = null;
        }
        // Then pause if not already paused, with error suppression
        if (video && !video.paused) {
          try {
            video.pause().catch(() => {
              // Suppress pause errors
            });
          } catch (pauseErr) {
            // Suppress pause errors
          }
        }
      } catch (videoErr) {
        // Suppress all video errors
      }
    });
  };

  // Safe function to stop scanner
  const safeStopScanner = async (scanner) => {
    if (!scanner) return;
    
    try {
      // First, try to stop any video elements
      const scannerId = 'qr-reader-mark-attendance';
      const scannerElement = document.getElementById(scannerId);
      if (scannerElement) {
        safeStopVideoElements(scannerElement);
      }
      
      // Wait a bit for video to pause
      await new Promise(resolve => setTimeout(resolve, 150));
      
      if (typeof scanner.stop === 'function') {
        try {
          await scanner.stop().catch((stopErr) => {
            const errorMsg = (stopErr?.message || stopErr?.toString() || '').toLowerCase();
            // Suppress common camera errors
            if (errorMsg && 
                !errorMsg.includes('not running') && 
                !errorMsg.includes('not paused') &&
                !errorMsg.includes('scanner is not running') &&
                !errorMsg.includes('cannot stop') &&
                !errorMsg.includes('scanner is not running or paused') &&
                !errorMsg.includes('play() request was interrupted') &&
                !errorMsg.includes('the play() request was interrupted') &&
                !errorMsg.includes('play() request was interrupted by a call to pause()') &&
                !errorMsg.includes('play() request was interrupted by a new load request') &&
                !errorMsg.includes('interrupted by a call to pause') &&
                !errorMsg.includes('interrupted by a new load request') &&
                !errorMsg.includes('interrupted by new load') &&
                !errorMsg.includes('onabort') &&
                !errorMsg.includes('video surface onabort') &&
                !errorMsg.includes('renderedcameraimpl') &&
                !errorMsg.includes('abort')) {
              // Silently ignore expected errors
            }
          });
          // Wait longer for stream to fully release
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (syncErr) {
          // Handle synchronous errors - suppress common camera errors
          const errorMsg = (syncErr?.message || syncErr?.toString() || '').toLowerCase();
          if (              !errorMsg.includes('play() request was interrupted') && 
              !errorMsg.includes('the play() request was interrupted') &&
              !errorMsg.includes('play() request was interrupted by a call to pause()') &&
              !errorMsg.includes('interrupted by a call to pause') &&
              !errorMsg.includes('onabort') &&
              !errorMsg.includes('video surface onabort') &&
              !errorMsg.includes('renderedcameraimpl') &&
              !errorMsg.includes('abort')) {
            // Only log if it's not a known camera error
          }
        }
      }
      
      // Ensure all video tracks are stopped
      if (scannerElement) {
        safeStopVideoElements(scannerElement);
      }
      
      // Wait before clearing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (typeof scanner.clear === 'function') {
        try {
          scanner.clear();
        } catch (clearErr) {
          // Ignore clear errors
        }
      }
    } catch (err) {
      // Suppress common camera errors
      const errorMsg = (err?.message || err?.toString() || '').toLowerCase();
      if (              !errorMsg.includes('play() request was interrupted') && 
              !errorMsg.includes('the play() request was interrupted') &&
              !errorMsg.includes('play() request was interrupted by a call to pause()') &&
              !errorMsg.includes('interrupted by a call to pause') &&
              !errorMsg.includes('onabort') &&
              !errorMsg.includes('video surface onabort') &&
              !errorMsg.includes('renderedcameraimpl') &&
              !errorMsg.includes('abort')) {
        // Silently ignore known camera errors
      }
    }
  };

  useEffect(() => {
    fetchCourses();
    
    // Store original console.error to intercept library errors
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Override console.error to suppress camera-related errors
    console.error = (...args) => {
      const errorMsg = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg?.message || arg?.toString() || ''
      ).join(' ').toLowerCase();
      
      if (errorMsg.includes('onabort') ||
          errorMsg.includes('video surface onabort') ||
          errorMsg.includes('renderedcameraimpl') ||
          errorMsg.includes('renderedcamera') ||
          errorMsg.includes('handleerror') ||
          errorMsg.includes('play() request was interrupted') ||
          errorMsg.includes('the play() request was interrupted') ||
          errorMsg.includes('play() request was interrupted by a call to pause()') ||
          errorMsg.includes('play() request was interrupted by a new load request') ||
          errorMsg.includes('interrupted by a call to pause') ||
          errorMsg.includes('interrupted by a new load request') ||
          errorMsg.includes('interrupted by new load') ||
          errorMsg.includes('abort')) {
        // Suppress these errors
        return;
      }
      // Call original console.error for other errors
      originalConsoleError.apply(console, args);
    };
    
    // Override console.warn to suppress camera-related warnings
    console.warn = (...args) => {
      const errorMsg = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg?.message || arg?.toString() || ''
      ).join(' ').toLowerCase();
      
      if (errorMsg.includes('onabort') ||
          errorMsg.includes('video surface onabort') ||
          errorMsg.includes('renderedcameraimpl') ||
          errorMsg.includes('renderedcamera') ||
          errorMsg.includes('handleerror')) {
        // Suppress these warnings
        return;
      }
      // Call original console.warn for other warnings
      originalConsoleWarn.apply(console, args);
    };
    
    // Global error handler to suppress camera-related errors
    const handleError = (event) => {
      const errorMsg = (event.message || event.error?.message || event.error?.toString() || '').toLowerCase();
      if (errorMsg.includes('onabort') ||
          errorMsg.includes('video surface onabort') ||
          errorMsg.includes('renderedcameraimpl') ||
          errorMsg.includes('renderedcamera') ||
          errorMsg.includes('handleerror') ||
          errorMsg.includes('play() request was interrupted') ||
          errorMsg.includes('the play() request was interrupted') ||
          errorMsg.includes('play() request was interrupted by a call to pause()') ||
          errorMsg.includes('play() request was interrupted by a new load request') ||
          errorMsg.includes('interrupted by a call to pause') ||
          errorMsg.includes('interrupted by a new load request') ||
          errorMsg.includes('interrupted by new load') ||
          errorMsg.includes('abort')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    // Global unhandled rejection handler for camera promises
    const handleUnhandledRejection = (event) => {
      const errorMsg = (event.reason?.message || event.reason?.toString() || '').toLowerCase();
      if (errorMsg.includes('onabort') ||
          errorMsg.includes('video surface onabort') ||
          errorMsg.includes('renderedcameraimpl') ||
          errorMsg.includes('renderedcamera') ||
          errorMsg.includes('handleerror') ||
          errorMsg.includes('play() request was interrupted') ||
          errorMsg.includes('the play() request was interrupted') ||
          errorMsg.includes('play() request was interrupted by a call to pause()') ||
          errorMsg.includes('play() request was interrupted by a new load request') ||
          errorMsg.includes('interrupted by a call to pause') ||
          errorMsg.includes('interrupted by a new load request') ||
          errorMsg.includes('interrupted by new load') ||
          errorMsg.includes('abort')) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError, true); // Use capture phase
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      if (scannerInstance) {
        safeStopScanner(scannerInstance);
      }
      // Restore original console methods
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses`);
      const data = await response.json();
      if (data.success) {
        if (isTeacher && teacherId) {
          const teacherCourses = data.courses.filter(course => course.teacherId === teacherId);
          setCourses(teacherCourses);
        } else {
          setCourses(data.courses);
        }
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  // Auto-mark attendance handler (without course selection)
  const handleAutoMarkAttendance = useCallback(async (studentId) => {
    if (isProcessingRef.current) return;

    if (!studentId || !studentId.trim()) {
      setError('Please enter a valid Student ID');
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/attendance/auto-mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentId.trim(),
          date: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Attendance marked successfully!');
        setStudentIdInput('');
        setQrScanResult('');
        setSelectedStudent(null);
        setShowStudentDetails(false);
        setTimeout(() => {
          setSuccess('');
          // Navigate back to dashboard
          if (isAdmin) {
            navigate('/dashboard');
          } else if (isOperator) {
            navigate('/operator/dashboard');
          } else {
            navigate(-1);
          }
        }, 2000);
      } else {
        setError(data.message || 'Failed to mark attendance');
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [navigate, isAdmin, isOperator]);

  const handleMarkAttendance = useCallback(async (studentId) => {
    if (isProcessingRef.current) return;
    
    if (!selectedCourse) {
      setError('Please select a course first');
      return;
    }

    if (!studentId || !studentId.trim()) {
      setError('Please enter a valid Student ID');
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentId.trim(),
          courseId: selectedCourse,
          date: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Attendance marked successfully!');
        setStudentIdInput('');
        setQrScanResult('');
        setSelectedStudent(null);
        setShowStudentDetails(false);
        setTimeout(() => {
          setSuccess('');
          // Navigate back to dashboard
          if (isAdmin) {
            navigate('/dashboard');
          } else if (isOperator) {
            navigate('/operator/dashboard');
          } else {
            navigate(-1);
          }
        }, 2000);
      } else {
        setError(data.message || 'Failed to mark attendance');
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [selectedCourse, navigate, isAdmin, isOperator]);

  // Update refs when functions change
  useEffect(() => {
    handleMarkAttendanceRef.current = handleMarkAttendance;
    handleAutoMarkAttendanceRef.current = handleAutoMarkAttendance;
  }, [handleMarkAttendance, handleAutoMarkAttendance]);

  // Handle QR Scanner lifecycle
  useEffect(() => {
    let html5QrCode = null;
    let isMounted = true;
    let scanProcessed = false;
    
    if (showQRScanner && qrScannerRef.current && !scannerInitializedRef.current) {
      scannerInitializedRef.current = true;
      
      const startScanner = async () => {
        try {
          if (scannerInstance) {
            await safeStopScanner(scannerInstance);
            setScannerInstance(null);
          }
          
          const scannerId = 'qr-reader-mark-attendance';
          // Wait longer before clearing to ensure previous stream is released
          await new Promise(resolve => setTimeout(resolve, 300));
          const scannerElement = document.getElementById(scannerId);
          if (scannerElement) {
            // Stop any existing video tracks before clearing
            safeStopVideoElements(scannerElement);
            // Wait a bit more before clearing innerHTML
            await new Promise(resolve => setTimeout(resolve, 100));
            scannerElement.innerHTML = '';
          }
          
          // Wait before creating new scanner instance
          await new Promise(resolve => setTimeout(resolve, 100));
          html5QrCode = new Html5Qrcode(scannerId);
          
          // Add error listeners to the scanner element to catch video errors
          const scannerElementAfterCreation = document.getElementById(scannerId);
          if (scannerElementAfterCreation) {
            // Add error listener to catch video element errors
            const addVideoErrorListeners = () => {
              const videos = scannerElementAfterCreation.querySelectorAll('video');
              videos.forEach((video) => {
                video.addEventListener('error', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }, true);
                video.addEventListener('abort', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }, true);
              });
            };
            
            // Call immediately
            addVideoErrorListeners();
            
            // Use MutationObserver to catch dynamically added video elements
            const observer = new MutationObserver(() => {
              addVideoErrorListeners();
            });
            
            observer.observe(scannerElementAfterCreation, {
              childList: true,
              subtree: true
            });
            
            // Store observer to disconnect later
            if (isMounted) {
              setTimeout(() => {
                observer.disconnect();
              }, 10000); // Disconnect after 10 seconds
            }
          }
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              if (!isMounted || scanProcessed) return;
              scanProcessed = true;
              
              startTransition(() => {
                setQrScanResult(decodedText);
              });
              
              if (html5QrCode) {
                safeStopScanner(html5QrCode).then(() => {
                  scannerInitializedRef.current = false;
                  if (isMounted) {
                    startTransition(() => {
                      setScannerInstance(null);
                      setShowQRScanner(false);
                    });
                  }
                  if (decodedText && isMounted) {
                    setTimeout(() => {
                      if (selectedCourse) {
                        const markFn = handleMarkAttendanceRef.current;
                        if (markFn) markFn(decodedText.trim());
                      } else {
                        const autoMarkFn = handleAutoMarkAttendanceRef.current;
                        if (autoMarkFn) autoMarkFn(decodedText.trim());
                      }
                    }, 100);
                  }
                }).catch((stopErr) => {
                  // Suppress common camera errors
                  const errorMsg = (stopErr?.message || stopErr?.toString() || '').toLowerCase();
                  if (              !errorMsg.includes('play() request was interrupted') && 
              !errorMsg.includes('the play() request was interrupted') &&
              !errorMsg.includes('play() request was interrupted by a call to pause()') &&
              !errorMsg.includes('interrupted by a call to pause') &&
              !errorMsg.includes('onabort') &&
              !errorMsg.includes('video surface onabort') &&
              !errorMsg.includes('renderedcameraimpl') &&
              !errorMsg.includes('abort')) {
                    // Only log if it's not a known camera error
                  }
                  scannerInitializedRef.current = false;
                  if (isMounted) {
                    startTransition(() => {
                      setScannerInstance(null);
                      setShowQRScanner(false);
                    });
                  }
                });
              }
            },
            (errorMessage) => {
              // Error handling is done internally by the library
              // Suppress common camera errors
              const errorMsg = (errorMessage || '').toLowerCase();
              if (errorMsg.includes('play() request was interrupted') || 
                  errorMsg.includes('the play() request was interrupted') ||
                  errorMsg.includes('play() request was interrupted by a call to pause()') ||
                  errorMsg.includes('play() request was interrupted by a new load request') ||
                  errorMsg.includes('interrupted by a call to pause') ||
                  errorMsg.includes('interrupted by a new load request') ||
                  errorMsg.includes('interrupted by new load') ||
                  errorMsg.includes('onabort') ||
                  errorMsg.includes('video surface onabort') ||
                  errorMsg.includes('renderedcameraimpl') ||
                  errorMsg.includes('renderedcamera') ||
                  errorMsg.includes('handleerror') ||
                  errorMsg.includes('abort')) {
                // Silently ignore these camera-related errors
                return;
              }
              // For other errors, we can optionally log them (but suppress camera errors)
            }
          ).catch((startErr) => {
            // Suppress common camera errors during start
            const errorMsg = (startErr?.message || startErr?.toString() || '').toLowerCase();
            if (              !errorMsg.includes('play() request was interrupted') && 
              !errorMsg.includes('the play() request was interrupted') &&
              !errorMsg.includes('play() request was interrupted by a call to pause()') &&
              !errorMsg.includes('interrupted by a call to pause') &&
              !errorMsg.includes('onabort') &&
              !errorMsg.includes('video surface onabort') &&
              !errorMsg.includes('renderedcameraimpl') &&
              !errorMsg.includes('abort')) {
              console.error('Error starting QR scanner:', startErr);
            }
            scannerInitializedRef.current = false;
            if (isMounted) {
              startTransition(() => {
                setError('Failed to start camera. Please check permissions and try again.');
                setShowQRScanner(false);
              });
            }
          });
          
          if (isMounted) {
            setScannerInstance(html5QrCode);
          }
        } catch (err) {
          // Suppress common camera errors
          const errorMsg = (err?.message || err?.toString() || '').toLowerCase();
          if (              !errorMsg.includes('play() request was interrupted') && 
              !errorMsg.includes('the play() request was interrupted') &&
              !errorMsg.includes('play() request was interrupted by a call to pause()') &&
              !errorMsg.includes('interrupted by a call to pause') &&
              !errorMsg.includes('onabort') &&
              !errorMsg.includes('video surface onabort') &&
              !errorMsg.includes('renderedcameraimpl') &&
              !errorMsg.includes('abort')) {
            console.error('Error starting QR scanner:', err);
          }
          scannerInitializedRef.current = false;
          if (isMounted) {
            startTransition(() => {
              setError('Failed to start camera. Please check permissions and try again.');
              setShowQRScanner(false);
            });
          }
        }
      };

      startScanner();
    } else if (!showQRScanner) {
      scannerInitializedRef.current = false;
      if (scannerInstance) {
        safeStopScanner(scannerInstance).then(() => {
          setScannerInstance(null);
        });
      }
    }

    return () => {
      isMounted = false;
      scanProcessed = false;
      if (html5QrCode) {
        safeStopScanner(html5QrCode);
        scannerInitializedRef.current = false;
      }
    };
  }, [showQRScanner, selectedCourse, scannerInstance]);


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
    if (isAdmin) {
      localStorage.removeItem('admin');
      localStorage.removeItem('isAuthenticated');
      navigate('/admin/login');
    } else if (isOperator) {
      localStorage.removeItem('operator');
      localStorage.removeItem('isOperatorAuthenticated');
      navigate('/operator/login');
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAdmin && !isOperator) {
      navigate('/admin/login');
    }
  }, [isAdmin, isOperator, navigate]);

  if (!isAdmin && !isOperator) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      ></div>
      {isAdmin ? (
        <Sidebar 
          activeItem="attendance" 
          onItemClick={(item) => {
            if (item === 'attendance') {
              navigate('/dashboard');
            } else {
              navigate(`/dashboard`);
            }
          }}
          className={sidebarOpen ? 'open' : ''} 
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
      ) : (
        <OperatorSidebar 
          activeItem="attendance" 
          onItemClick={(item) => {
            if (item === 'attendance') {
              navigate('/operator/dashboard');
            } else {
              navigate(`/operator/dashboard`);
            }
          }}
          className={sidebarOpen ? 'open' : ''} 
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
      )}
      <div className={`dashboard-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {isAdmin ? (
          <TopNavbar admin={adminData} onMenuToggle={toggleSidebar} />
        ) : (
          <OperatorTopNavbar operator={operatorData} onMenuToggle={toggleSidebar} />
        )}
        <div className="dashboard-main">
          <Container fluid style={{ maxWidth: '1200px' }}>
            {/* Header Section */}
            <div className="dashboard-header mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="dashboard-title mb-1" style={{ 
                    fontSize: '28px', 
                    fontWeight: '700',
                    color: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <HiOutlineClipboardDocumentCheck style={{ color: '#4f46e5' }} />
                    Mark Attendance
                  </h2>
                  <p className="dashboard-subtitle mb-0" style={{ 
                    color: '#6b7280',
                    fontSize: '15px',
                    marginTop: '4px'
                  }}>
                    Mark student attendance using Student ID or QR Code scanner
                  </p>
                </div>
              </div>
            </div>

            {/* Alert Messages */}
            {error && (
              <Alert 
                variant="danger" 
                className="mb-4" 
                onClose={() => setError('')} 
                dismissible
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)',
                  padding: '14px 20px',
                  fontSize: '15px'
                }}
              >
                <strong>Error:</strong> {error}
              </Alert>
            )}

            {success && (
              <Alert 
                variant="success" 
                className="mb-4" 
                onClose={() => setSuccess('')} 
                dismissible
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)',
                  padding: '14px 20px',
                  fontSize: '15px'
                }}
              >
                <HiOutlineCheckCircle style={{ fontSize: '20px', marginRight: '8px', verticalAlign: 'middle' }} />
                <strong>Success:</strong> {success}
              </Alert>
            )}

            {/* Main Card */}
            <Card style={{
              border: 'none',
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              padding: '32px',
              background: 'linear-gradient(to bottom, #ffffff, #fafbfc)'
            }}>
              <Form>
                {/* Course Selection Section */}
                <div style={{ marginBottom: '28px' }}>
                  <Form.Group>
                    <Form.Label style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <HiOutlineBookOpen style={{ color: '#6366f1', fontSize: '20px' }} />
                      Select Course (Optional)
                    </Form.Label>
                    <Form.Text className="text-muted d-block mb-3" style={{ 
                      fontSize: '14px',
                      color: '#6b7280',
                      marginLeft: '28px'
                    }}>
                      Leave empty to auto-detect course based on current schedule
                    </Form.Text>
                    <Form.Select
                      value={selectedCourse}
                      onChange={(e) => {
                        setSelectedCourse(e.target.value);
                        setStudentIdInput('');
                        setQrScanResult('');
                        setError('');
                        setWarnings([]);
                        setSelectedStudent(null);
                        setShowStudentDetails(false);
                        if (scannerInstance) {
                          safeStopScanner(scannerInstance).then(() => {
                            setScannerInstance(null);
                            scannerInitializedRef.current = false;
                          });
                        }
                        setShowQRScanner(false);
                      }}
                      className="form-control-custom"
                      style={{
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb',
                        padding: '12px 16px',
                        fontSize: '15px',
                        transition: 'all 0.3s ease',
                        backgroundColor: '#fff'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#6366f1';
                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <option value="">-- Auto-detect course (recommended) --</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.courseName} ({course.subject}) - {course.grade}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </div>

                {/* Student ID Input Section */}
                <div style={{ marginBottom: '28px' }}>
                  <Form.Group>
                    <Form.Label style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <HiOutlineIdentification style={{ color: '#6366f1', fontSize: '20px' }} />
                      Student ID
                    </Form.Label>
                    <div className="d-flex gap-3" style={{ flexWrap: 'nowrap' }}>
                      <div style={{ flex: '1', minWidth: '0', position: 'relative' }}>
                        <Form.Control
                          type="text"
                          placeholder="Enter Student ID or Scan QR Code"
                          value={studentIdInput}
                          onChange={(e) => {
                            setStudentIdInput(e.target.value);
                            setError('');
                            setWarnings([]);
                            setSelectedStudent(null);
                            setShowStudentDetails(false);
                          }}
                          className="form-control-custom"
                          style={{
                            borderRadius: '12px',
                            border: '2px solid #e5e7eb',
                            padding: '14px 16px',
                            fontSize: '15px',
                            transition: 'all 0.3s ease',
                            backgroundColor: '#fff'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#6366f1';
                            e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e5e7eb';
                            e.target.style.boxShadow = 'none';
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !loading && studentIdInput.trim()) {
                              if (selectedCourse) {
                                handleMarkAttendance(studentIdInput);
                              } else {
                                handleAutoMarkAttendance(studentIdInput);
                              }
                            }
                          }}
                        />
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (selectedCourse) {
                            handleMarkAttendance(studentIdInput);
                          } else {
                            handleAutoMarkAttendance(studentIdInput);
                          }
                        }}
                        disabled={loading || !studentIdInput.trim()}
                        style={{ 
                          whiteSpace: 'nowrap',
                          borderRadius: '12px',
                          padding: '14px 28px',
                          fontSize: '15px',
                          fontWeight: '600',
                          background: loading || !studentIdInput.trim() 
                            ? '#9ca3af' 
                            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          border: 'none',
                          boxShadow: loading || !studentIdInput.trim()
                            ? 'none'
                            : '0 4px 12px rgba(99, 102, 241, 0.3)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!loading && studentIdInput.trim()) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!loading && studentIdInput.trim()) {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                          }
                        }}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Marking...
                          </>
                        ) : (
                          <>
                            <HiOutlineCheckCircle style={{ fontSize: '18px', marginRight: '6px' }} />
                            Mark
                          </>
                        )}
                      </Button>
                      <Button
                        variant={showQRScanner ? "danger" : "info"}
                        onClick={async () => {
                          if (showQRScanner && scannerInstance) {
                            await safeStopScanner(scannerInstance);
                            setScannerInstance(null);
                            scannerInitializedRef.current = false;
                            // Wait longer to ensure stream is fully released
                            await new Promise(resolve => setTimeout(resolve, 300));
                            const scannerElement = document.getElementById('qr-reader-mark-attendance');
                            if (scannerElement) {
                              // Stop all video tracks before clearing
                              safeStopVideoElements(scannerElement);
                              await new Promise(resolve => setTimeout(resolve, 100));
                              scannerElement.innerHTML = '';
                            }
                          }
                          setShowQRScanner(!showQRScanner);
                          setQrScanResult('');
                          setError('');
                        }}
                        style={{ 
                          whiteSpace: 'nowrap',
                          borderRadius: '12px',
                          padding: '14px 24px',
                          fontSize: '15px',
                          fontWeight: '600',
                          background: showQRScanner
                            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                            : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                          border: 'none',
                          boxShadow: showQRScanner
                            ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                            : '0 4px 12px rgba(6, 182, 212, 0.3)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = showQRScanner
                            ? '0 6px 16px rgba(239, 68, 68, 0.4)'
                            : '0 6px 16px rgba(6, 182, 212, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = showQRScanner
                            ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                            : '0 4px 12px rgba(6, 182, 212, 0.3)';
                        }}
                      >
                        {showQRScanner ? (
                          <>
                            <HiOutlineXMark style={{ fontSize: '18px', marginRight: '6px' }} />
                            Cancel Scan
                          </>
                        ) : (
                          <>
                            <HiOutlineQrCode style={{ fontSize: '18px', marginRight: '6px' }} />
                            Scan QR
                          </>
                        )}
                      </Button>
                    </div>
                  </Form.Group>
                </div>

                {/* QR Scanner Section */}
                {showQRScanner && (
                  <Card style={{
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '24px',
                    marginTop: '24px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div>
                        <h5 style={{ 
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <HiOutlineCamera style={{ color: '#6366f1', fontSize: '22px' }} />
                          Camera QR Scanner
                        </h5>
                        <p style={{ 
                          margin: '6px 0 0 0',
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          Point your camera at the student's QR code
                        </p>
                      </div>
                    </div>
                    
                    <div 
                      id="qr-reader-mark-attendance"
                      ref={qrScannerRef}
                      style={{ 
                        width: '100%', 
                        maxWidth: '500px', 
                        margin: '0 auto 20px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
                      }}
                    ></div>
                    
                    {qrScanResult && (
                      <Alert 
                        variant="info" 
                        className="mb-3"
                        style={{
                          borderRadius: '12px',
                          border: 'none',
                          backgroundColor: '#eff6ff',
                          color: '#1e40af',
                          padding: '14px 18px',
                          fontSize: '15px'
                        }}
                      >
                        <strong>Scanned ID:</strong> <span style={{ fontFamily: 'monospace' }}>{qrScanResult}</span>
                      </Alert>
                    )}
                    
                    <div className="d-flex gap-2 justify-content-center">
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={async () => {
                          if (scannerInstance) {
                            await safeStopScanner(scannerInstance);
                            setScannerInstance(null);
                            scannerInitializedRef.current = false;
                            // Wait longer to ensure stream is fully released
                            await new Promise(resolve => setTimeout(resolve, 300));
                            const scannerElement = document.getElementById('qr-reader-mark-attendance');
                            if (scannerElement) {
                              // Stop all video tracks before clearing
                              safeStopVideoElements(scannerElement);
                              await new Promise(resolve => setTimeout(resolve, 100));
                              scannerElement.innerHTML = '';
                            }
                          }
                          setShowQRScanner(false);
                          setQrScanResult('');
                        }}
                        style={{
                          borderRadius: '12px',
                          padding: '12px 24px',
                          fontSize: '15px',
                          fontWeight: '600',
                          border: 'none',
                          backgroundColor: '#6b7280',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#4b5563';
                          e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#6b7280';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        <HiOutlineXMark style={{ fontSize: '18px', marginRight: '6px' }} />
                        Stop Scanner
                      </Button>
                      {qrScanResult && (
                        <Button
                          variant="success"
                          size="lg"
                          onClick={() => {
                            if (selectedCourse) {
                              handleMarkAttendance(qrScanResult);
                            } else {
                              handleAutoMarkAttendance(qrScanResult);
                            }
                          }}
                          disabled={loading}
                          style={{
                            borderRadius: '12px',
                            padding: '12px 24px',
                            fontSize: '15px',
                            fontWeight: '600',
                            border: 'none',
                            background: loading
                              ? '#9ca3af'
                              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            boxShadow: loading
                              ? 'none'
                              : '0 4px 12px rgba(16, 185, 129, 0.3)',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!loading) {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!loading) {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                            }
                          }}
                        >
                          <HiOutlineCheckCircle style={{ fontSize: '18px', marginRight: '6px' }} />
                          Mark Attendance
                        </Button>
                      )}
                    </div>
                  </Card>
                )}
              </Form>
            </Card>
          </Container>
        </div>
      </div>
    </div>
  );
};

export default MarkAttendance;

