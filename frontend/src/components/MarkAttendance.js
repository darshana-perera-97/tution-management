import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { Container, Button, Form, Alert, Card, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  HiOutlineCheckCircle,
  HiOutlineQrCode,
  HiOutlineBookOpen,
  HiOutlineIdentification,
  HiOutlineCamera,
  HiOutlineXMark,
  HiOutlineClipboardDocumentCheck,
  HiOutlineExclamationCircle,
  HiOutlineCurrencyDollar
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
  const [currentCourses, setCurrentCourses] = useState([]); // courses in marking window (30 min before start → class end)
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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [attendancePreview, setAttendancePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const qrScannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const scannerInitializedRef = useRef(false);
  const scannerInstanceRef = useRef(null); // ref so cleanup can always stop camera when scanner is closed
  const handleMarkAttendanceRef = useRef(null);
  const handleAutoMarkAttendanceRef = useRef(null);

  // Check if user is admin or operator
  const isAdminOrOperator = isAdmin || isOperator;
  
  // Check if user is a teacher
  const isTeacher = localStorage.getItem('isTeacherAuthenticated');
  const teacherData = isTeacher ? JSON.parse(localStorage.getItem('teacher') || '{}') : null;
  const teacherId = teacherData?.id || null;

  // Helper: pause video first (so play() is no longer in flight), then stop stream.
  // This order avoids "play() interrupted by a new load request" when we clear srcObject.
  const safeStopVideoElements = (scannerElement) => {
    if (!scannerElement) return;
    const videoElements = scannerElement.querySelectorAll('video');
    videoElements.forEach((video) => {
      try {
        if (!video) return;
        // 1. Pause first so any in-flight play() settles (avoids "interrupted by new load")
        if (!video.paused) {
          try {
            video.pause().catch(() => {});
          } catch (_) {}
        }
        // 2. Then stop tracks and clear srcObject (no play() in flight now)
        if (video.srcObject) {
          const tracks = video.srcObject.getTracks();
          tracks.forEach((track) => {
            try { track.stop(); } catch (_) {}
          });
          video.srcObject = null;
        }
        video.removeAttribute('src');
      } catch (_) {}
    });
  };

  // Async version: await pause() so play() promise settles before we clear stream
  const safeStopVideoElementsAsync = async (scannerElement) => {
    if (!scannerElement) return;
    const videoElements = Array.from(scannerElement.querySelectorAll('video'));
    await Promise.all(
      videoElements.map(async (video) => {
        try {
          if (!video) return;
          if (!video.paused) {
            await video.pause().catch(() => {});
          }
          if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach((track) => {
              try { track.stop(); } catch (_) {}
            });
            video.srcObject = null;
          }
          video.removeAttribute('src');
        } catch (_) {}
      })
    );
  };

  // Stop scanner without triggering "play() interrupted by new load":
  // 1) Pause video and await so play() settles, 2) Stop tracks & clear stream,
  // 3) Wait, 4) Call library stop/clear.
  const safeStopScanner = async (scanner) => {
    if (!scanner) return;
    const scannerId = 'qr-reader-mark-attendance';
    const scannerElement = document.getElementById(scannerId);
    try {
      if (scannerElement) {
        await safeStopVideoElementsAsync(scannerElement);
      }
      await new Promise((r) => setTimeout(r, 250));
      if (scannerElement) {
        safeStopVideoElements(scannerElement);
      }
      await new Promise((r) => setTimeout(r, 100));
      if (typeof scanner.stop === 'function') {
        await scanner.stop().catch(() => {});
      }
      await new Promise((r) => setTimeout(r, 150));
      if (typeof scanner.clear === 'function') {
        try {
          scanner.clear();
        } catch (_) {}
      }
    } catch (_) {}
  };

  useEffect(() => {
    const load = async () => {
      await fetchCourses();
      await fetchCurrentCourses();
    };
    load();
  }, []);

  // Open camera/scanner after mount so DOM and refs are ready (avoids uncaught runtime errors)
  useEffect(() => {
    const t = setTimeout(() => setShowQRScanner(true), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
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
          errorMsg.includes('goo.gl') ||
          errorMsg.includes('ldlk22') ||
          errorMsg.includes('abort')) {
        // Suppress these errors (camera/QR scanner)
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
          errorMsg.includes('handleerror') ||
          errorMsg.includes('play() request was interrupted') ||
          errorMsg.includes('new load request') ||
          errorMsg.includes('goo.gl') ||
          errorMsg.includes('ldlk22')) {
        // Suppress these warnings
        return;
      }
      // Call original console.warn for other warnings
      originalConsoleWarn.apply(console, args);
    };
    
    // Global error handler to suppress camera-related errors (e.g. play() interrupted by new load)
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
          errorMsg.includes('new load request') ||
          errorMsg.includes('goo.gl') ||
          errorMsg.includes('ldlk22') ||
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
          errorMsg.includes('new load request') ||
          errorMsg.includes('goo.gl') ||
          errorMsg.includes('ldlk22') ||
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
        let list = data.courses || [];
        if (isTeacher && teacherId) {
          list = list.filter(course => course.teacherId === teacherId);
        }
        setCourses(list);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  // Fetch courses that are currently in the attendance window (same mechanism as backend)
  const fetchCurrentCourses = async () => {
    try {
      const url = isTeacher && teacherId
        ? `${API_URL}/api/attendance/current-courses?teacherId=${encodeURIComponent(teacherId)}`
        : `${API_URL}/api/attendance/current-courses`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && Array.isArray(data.currentCourses)) {
        setCurrentCourses(data.currentCourses);
        // Pre-select the first current course when any exist (same mechanism as auto-mark)
        if (data.currentCourses.length > 0) {
          setSelectedCourse(prev => (prev === '' ? data.currentCourses[0].id : prev));
        }
      } else {
        setCurrentCourses([]);
      }
    } catch (err) {
      console.error('Error fetching current courses:', err);
      setCurrentCourses([]);
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
        setShowErrorModal(true);
        setErrorModalMessage(data.message || 'Failed to mark attendance');
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
      const msg = 'Unable to connect to server. Please try again later.';
      setError(msg);
      setShowErrorModal(true);
      setErrorModalMessage(msg);
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
        setShowErrorModal(true);
        setErrorModalMessage(data.message || 'Failed to mark attendance');
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
      const msg = 'Unable to connect to server. Please try again later.';
      setError(msg);
      setShowErrorModal(true);
      setErrorModalMessage(msg);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [selectedCourse, navigate, isAdmin, isOperator]);

  // Fetch attendance preview (enrollment, time window, payment status) when course and student ID are set
  const fetchAttendancePreview = useCallback(async () => {
    const sid = (studentIdInput || qrScanResult || '').trim();
    if (!selectedCourse || !sid) {
      setAttendancePreview(null);
      return;
    }
    setLoadingPreview(true);
    try {
      const response = await fetch(`${API_URL}/api/attendance/preview?studentId=${encodeURIComponent(sid)}&courseId=${encodeURIComponent(selectedCourse)}`);
      const data = await response.json();
      if (data.success) {
        setAttendancePreview(data);
      } else {
        setAttendancePreview(null);
      }
    } catch (err) {
      console.error('Error fetching attendance preview:', err);
      setAttendancePreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedCourse, studentIdInput, qrScanResult]);

  useEffect(() => {
    const sid = (studentIdInput || qrScanResult || '').trim();
    if (!selectedCourse || !sid) {
      setAttendancePreview(null);
      return;
    }
    const t = setTimeout(fetchAttendancePreview, 300);
    return () => clearTimeout(t);
  }, [selectedCourse, studentIdInput, qrScanResult, fetchAttendancePreview]);

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

    // Only open camera when QR scanner UI is on (showQRScanner true and container mounted)
    if (showQRScanner && qrScannerRef.current && !scannerInitializedRef.current) {
      scannerInitializedRef.current = true;

      const startScanner = async () => {
        try {
          // Stop any previous scanner so camera is not left on
          const prev = scannerInstanceRef.current || scannerInstance;
          if (prev) {
            await safeStopScanner(prev);
            scannerInstanceRef.current = null;
            setScannerInstance(null);
          }

          const scannerId = 'qr-reader-mark-attendance';
          await new Promise(resolve => setTimeout(resolve, 300));
          const scannerElement = document.getElementById(scannerId);
          if (scannerElement) {
            await safeStopVideoElementsAsync(scannerElement);
            await new Promise(resolve => setTimeout(resolve, 150));
            scannerElement.innerHTML = '';
          }

          await new Promise(resolve => setTimeout(resolve, 100));
          html5QrCode = new Html5Qrcode(scannerId);
          scannerInstanceRef.current = html5QrCode;
          
          // Add error listeners to the scanner element to catch video errors
          const scannerElementAfterCreation = document.getElementById(scannerId);
          if (scannerElementAfterCreation) {
            // Add error listener to catch video element errors
            const addVideoErrorListeners = () => {
              const videos = scannerElementAfterCreation.querySelectorAll('video');
              videos.forEach((video) => {
                // Wrap play() so its promise never rejects when interrupted by pause()/stop
                if (!video._playWrapped) {
                  video._playWrapped = true;
                  const originalPlay = video.play.bind(video);
                  video.play = function play() {
                    return originalPlay().catch(() => {});
                  };
                }
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
                  scannerInstanceRef.current = null;
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
                  const errorMsg = (stopErr?.message || stopErr?.toString() || '').toLowerCase();
                  if (              !errorMsg.includes('play() request was interrupted') && 
              !errorMsg.includes('the play() request was interrupted') &&
              !errorMsg.includes('play() request was interrupted by a call to pause()') &&
              !errorMsg.includes('interrupted by a call to pause') &&
              !errorMsg.includes('new load request') &&
              !errorMsg.includes('goo.gl') &&
              !errorMsg.includes('ldlk22') &&
              !errorMsg.includes('onabort') &&
              !errorMsg.includes('video surface onabort') &&
              !errorMsg.includes('renderedcameraimpl') &&
              !errorMsg.includes('abort')) {
                    // Only log if it's not a known camera error
                  }
                  scannerInstanceRef.current = null;
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
                  errorMsg.includes('new load request') ||
                  errorMsg.includes('goo.gl') ||
                  errorMsg.includes('ldlk22') ||
                  errorMsg.includes('onabort') ||
                  errorMsg.includes('video surface onabort') ||
                  errorMsg.includes('renderedcameraimpl') ||
                  errorMsg.includes('renderedcamera') ||
                  errorMsg.includes('handleerror') ||
                  errorMsg.includes('abort')) {
                // Silently ignore these camera-related errors
                return;
              }
            }
          ).catch((startErr) => {
            const errorMsg = (startErr?.message || startErr?.toString() || '').toLowerCase();
            if (              !errorMsg.includes('play() request was interrupted') && 
              !errorMsg.includes('the play() request was interrupted') &&
              !errorMsg.includes('play() request was interrupted by a call to pause()') &&
              !errorMsg.includes('interrupted by a call to pause') &&
              !errorMsg.includes('new load request') &&
              !errorMsg.includes('goo.gl') &&
              !errorMsg.includes('ldlk22') &&
              !errorMsg.includes('onabort') &&
              !errorMsg.includes('video surface onabort') &&
              !errorMsg.includes('renderedcameraimpl') &&
              !errorMsg.includes('abort')) {
              console.error('Error starting QR scanner:', startErr);
            }
            scannerInstanceRef.current = null;
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
          const errorMsg = (err?.message || err?.toString() || '').toLowerCase();
          if (              !errorMsg.includes('play() request was interrupted') && 
              !errorMsg.includes('the play() request was interrupted') &&
              !errorMsg.includes('play() request was interrupted by a call to pause()') &&
              !errorMsg.includes('interrupted by a call to pause') &&
              !errorMsg.includes('new load request') &&
              !errorMsg.includes('goo.gl') &&
              !errorMsg.includes('ldlk22') &&
              !errorMsg.includes('onabort') &&
              !errorMsg.includes('video surface onabort') &&
              !errorMsg.includes('renderedcameraimpl') &&
              !errorMsg.includes('abort')) {
            console.error('Error starting QR scanner:', err);
          }
          scannerInstanceRef.current = null;
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
      // When QR scanner is closed, always turn off the camera
      scannerInitializedRef.current = false;
      const toStop = scannerInstanceRef.current || scannerInstance;
      if (toStop) {
        safeStopScanner(toStop).then(() => {
          scannerInstanceRef.current = null;
          setScannerInstance(null);
          const scannerId = 'qr-reader-mark-attendance';
          const el = document.getElementById(scannerId);
          if (el) safeStopVideoElements(el);
        });
      }
    }

    return () => {
      isMounted = false;
      scanProcessed = false;
      // On unmount or when scanner is closed: stop camera
      const toStop = scannerInstanceRef.current || html5QrCode;
      if (toStop) {
        safeStopScanner(toStop).then(() => {
          scannerInstanceRef.current = null;
        });
        scannerInstanceRef.current = null;
      }
      scannerInitializedRef.current = false;
    };
  }, [showQRScanner]);


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
                      Automatic course selection uses class start and end time (30 min before start until end). Extra-class start/end from Add Extra Class are used for extra days.
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
                        const toStop = scannerInstanceRef.current || scannerInstance;
                        if (toStop) {
                          safeStopScanner(toStop).then(() => {
                            scannerInstanceRef.current = null;
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
                      <option value="">-- Auto-detect course (by current time window) --</option>
                      {courses.map(course => {
                        const current = currentCourses.find(cc => cc.id === course.id);
                        const timeRange = current?.startTime && current?.endTime ? ` ${current.startTime}–${current.endTime}` : '';
                        const label = current
                          ? `${course.courseName} (${course.subject}) - ${course.grade} — Current${current.isExtraClass ? ' (extra class)' : ''}${timeRange}`
                          : `${course.courseName} (${course.subject}) - ${course.grade}`;
                        return (
                          <option key={course.id} value={course.id}>
                            {label}
                          </option>
                        );
                      })}
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
                        variant={showQRScanner ? 'danger' : 'info'}
                        onClick={async () => {
                          if (showQRScanner) {
                            const toStop = scannerInstanceRef.current || scannerInstance;
                            if (toStop) {
                              await safeStopScanner(toStop);
                              scannerInstanceRef.current = null;
                              setScannerInstance(null);
                              scannerInitializedRef.current = false;
                            }
                            await new Promise(resolve => setTimeout(resolve, 300));
                            const scannerElement = document.getElementById('qr-reader-mark-attendance');
                            if (scannerElement) {
                              await safeStopVideoElementsAsync(scannerElement);
                              await new Promise(resolve => setTimeout(resolve, 150));
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

                {/* Payment status & preview (when course + student ID selected) */}
                {selectedCourse && (studentIdInput.trim() || qrScanResult.trim()) && (
                  <div style={{
                    marginBottom: '24px',
                    padding: '16px 20px',
                    background: attendancePreview?.student && attendancePreview?.course ? '#f0fdf4' : '#fefce8',
                    border: `1px solid ${attendancePreview?.isEnrolled && attendancePreview?.canMarkTimeWindow ? '#bbf7d0' : '#fde047'}`,
                    borderRadius: '12px'
                  }}>
                    {loadingPreview ? (
                      <span style={{ color: '#64748b', fontSize: '14px' }}>Loading...</span>
                    ) : attendancePreview?.student && attendancePreview?.course ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>
                          <HiOutlineCurrencyDollar style={{ color: '#6366f1' }} />
                          Course fee & payment status
                        </div>
                        <div style={{ fontSize: '14px', color: '#475569' }}>
                          <span><strong>Course:</strong> {attendancePreview.course.courseName} ({attendancePreview.course.subject})</span>
                          <span style={{ marginLeft: '16px' }}><strong>Fee:</strong> Rs {parseFloat(attendancePreview.courseFee || 0).toFixed(2)}</span>
                          <span style={{ marginLeft: '16px' }}>
                            <strong>This month:</strong>{' '}
                            <span style={{ color: attendancePreview.paymentStatus === 'Paid' ? '#059669' : '#d97706', fontWeight: '600' }}>
                              {attendancePreview.paymentStatus === 'Paid' ? 'Paid' : 'Pending'}
                            </span>
                            {attendancePreview.paymentDate && (
                              <span style={{ marginLeft: '6px', color: '#64748b' }}>
                                ({new Date(attendancePreview.paymentDate).toLocaleDateString()})
                              </span>
                            )}
                          </span>
                        </div>
                        {!attendancePreview.isEnrolled && (
                          <div style={{ marginTop: '8px', fontSize: '13px', color: '#b45309' }}>
                            Student is not registered for this course. Attendance cannot be marked.
                          </div>
                        )}
                        {attendancePreview.isEnrolled && !attendancePreview.canMarkTimeWindow && attendancePreview.timeMessage && (
                          <div style={{ marginTop: '8px', fontSize: '13px', color: '#b45309' }}>
                            {attendancePreview.timeMessage}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '14px', color: '#64748b' }}>
                        Enter a valid Student ID and select a course to see enrollment and payment status.
                      </div>
                    )}
                  </div>
                )}

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
                          const toStop = scannerInstanceRef.current || scannerInstance;
                          if (toStop) {
                            await safeStopScanner(toStop);
                            scannerInstanceRef.current = null;
                            setScannerInstance(null);
                            scannerInitializedRef.current = false;
                          }
                          await new Promise(resolve => setTimeout(resolve, 300));
                          const scannerElement = document.getElementById('qr-reader-mark-attendance');
                          if (scannerElement) {
                            await safeStopVideoElementsAsync(scannerElement);
                            await new Promise(resolve => setTimeout(resolve, 150));
                            scannerElement.innerHTML = '';
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

            {/* Error popup when attendance cannot be marked (not enrolled / out of class time) */}
            <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)} centered backdrop="static">
              <Modal.Header closeButton style={{ borderBottom: '1px solid #e2e8f0' }}>
                <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', color: '#dc2626' }}>
                  <HiOutlineExclamationCircle style={{ fontSize: '24px' }} />
                  Cannot mark attendance
                </Modal.Title>
              </Modal.Header>
              <Modal.Body style={{ padding: '20px 24px', fontSize: '15px', color: '#374151' }}>
                {errorModalMessage}
              </Modal.Body>
              <Modal.Footer style={{ borderTop: '1px solid #e2e8f0' }}>
                <Button variant="secondary" onClick={() => setShowErrorModal(false)} style={{ borderRadius: '10px' }}>
                  OK
                </Button>
              </Modal.Footer>
            </Modal>
          </Container>
        </div>
      </div>
    </div>
  );
};

export default MarkAttendance;

