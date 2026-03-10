import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Form, InputGroup, Badge, Spinner, Modal, Table } from 'react-bootstrap';
import {
  HiOutlineChatBubbleLeftRight,
  HiXMark,
  HiPaperAirplane,
  HiOutlineSparkles,
  HiOutlineCpuChip,
  HiOutlineLightBulb,
  HiOutlineAcademicCap,
  HiOutlinePhoto,
  HiOutlineDocumentText,
  HiOutlineClock,
  HiOutlineQuestionMarkCircle,
  HiOutlineCamera,
  HiOutlineBookmark
} from 'react-icons/hi2';
import API_URL from '../config';
import subjects from '../data/subjects';
import modules from '../data/modules';
import subModules from '../data/subModules';

const StudentChatbot = ({ student, isOpen: externalIsOpen, onIsOpenChange }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onIsOpenChange || setInternalIsOpen;
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quota, setQuota] = useState({ count: 0, remaining: 15, limit: 15 });
  const [gradeSection, setGradeSection] = useState(null);
  const [masterPrompt, setMasterPrompt] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // New states for features
  const [showPaperCorrectionModal, setShowPaperCorrectionModal] = useState(false);
  const [paperCorrectionImage, setPaperCorrectionImage] = useState(null);
  const [studyTimetableFlow, setStudyTimetableFlow] = useState(null); // 'subjects' | 'modules' | 'timetable'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [studentSubjects, setStudentSubjects] = useState([]); // Enrolled subjects
  const [savingTimetable, setSavingTimetable] = useState({}); // Track saving state per message
  const paperCorrectionFileInputRef = useRef(null);

  const MAX_QUESTIONS = 15;

  // Get storage keys based on student ID (only for chat history)
  const getStorageKey = () => student?.id ? `student_chatbot_${student.id}` : null;

  // Map student grade to grade section
  const getGradeSection = (grade) => {
    if (!grade) return null;
    const gradeNum = parseInt(grade.toString().replace(/[^0-9]/g, ''));
    if (gradeNum >= 1 && gradeNum <= 5) return 'grade1-5';
    if (gradeNum >= 6 && gradeNum <= 11) return 'grade6-11';
    if (gradeNum >= 12 && gradeNum <= 13) return 'grade12-13';
    return null;
  };

  useEffect(() => {
    if (student && student.id) {
      const section = getGradeSection(student.grade);
      setGradeSection(section);

      const storageKey = getStorageKey();

      // Load chat history from localStorage
      if (storageKey) {
        const savedChat = localStorage.getItem(storageKey);
        if (savedChat) {
          try {
            const chatData = JSON.parse(savedChat);
            setMessages(chatData.messages || []);
          } catch (err) {
            console.error('Error loading chat history:', err);
          }
        }
      }

      // Clear uploaded images when modal opens
      setUploadedImages([]);

      // Fetch quota from backend
      fetchQuota();

      // Fetch master prompt (combined text) for this grade section
      if (section) {
        fetchMasterPrompt(section);
      }

      // Fetch student enrolled subjects (sample - replace with actual API call)
      fetchStudentSubjects();
    }
  }, [student]);

  const fetchStudentSubjects = async () => {
    if (!student?.id) return;
    
    try {
      // Fetch enrolled courses for the student
      const response = await fetch(`${API_URL}/api/students/${student.id}/courses`);
      const data = await response.json();
      
      if (data.success && data.courses && data.courses.length > 0) {
        // Extract unique subjects from enrolled courses
        const enrolledCourseSubjects = [...new Set(data.courses.map(course => course.subject))];
        
        // Map course subjects to subject objects
        // Match by name (case-insensitive) or by partial match
        const enrolledSubjects = subjects.filter(subj => {
          return enrolledCourseSubjects.some(courseSubject => {
            const courseSubjectLower = courseSubject.toLowerCase().trim();
            const subjectNameLower = subj.name.toLowerCase().trim();
            const subjectIdLower = subj.id.toLowerCase().trim();
            
            // Exact match or partial match
            return courseSubjectLower === subjectNameLower || 
                   courseSubjectLower === subjectIdLower ||
                   courseSubjectLower.includes(subjectNameLower) ||
                   subjectNameLower.includes(courseSubjectLower);
          });
        });
        
        setStudentSubjects(enrolledSubjects);
      } else {
        // No enrolled courses
        setStudentSubjects([]);
      }
    } catch (err) {
      console.error('Error fetching student subjects:', err);
      // Fallback to empty array on error
      setStudentSubjects([]);
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMasterPrompt = async (section) => {
    try {
      const response = await fetch(`${API_URL}/api/ai-chatbot/${section}/combined-text`);
      const data = await response.json();
      if (data.success && data.combinedText) {
        setMasterPrompt(data.combinedText);
      }
    } catch (err) {
      console.error('Error fetching master prompt:', err);
    }
  };

  const fetchQuota = async () => {
    if (!student?.id) return;
    try {
      const response = await fetch(`${API_URL}/api/student/chatbot/quota/${student.id}`);
      const data = await response.json();
      if (data.success && data.quota) {
        setQuota(data.quota);
      }
    } catch (err) {
      console.error('Error fetching quota:', err);
    }
  };

  const saveChatToStorage = (chatMessages) => {
    try {
      const storageKey = getStorageKey();
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify({
          messages: chatMessages,
          lastUpdated: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.error('Error saving chat to storage:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if ((!inputMessage.trim() && uploadedImages.length === 0) || isLoading) return;

    // Check question limit from backend quota
    if (quota.remaining <= 0) {
      const limitMessage = {
        id: Date.now(),
        role: 'assistant',
        content: `You have reached the daily limit of ${quota.limit} messages. Please try again tomorrow.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, limitMessage]);
      saveChatToStorage([...messages, limitMessage]);
      setInputMessage('');
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage.trim() || '',
      images: uploadedImages.map(img => ({
        id: img.id,
        data: img.preview,
        name: img.name
      })),
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    const imagesToSend = [...uploadedImages];
    setUploadedImages([]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/student/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          message: inputMessage.trim() || '',
          images: imagesToSend.map(img => ({
            data: img.preview,
            name: img.name,
            type: img.file.type
          })),
          gradeSection: gradeSection,
          masterPrompt: masterPrompt,
          chatHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
            images: m.images || []
          }))
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };
        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
        saveChatToStorage(updatedMessages);

        // Update quota from backend response
        if (data.quota) {
          setQuota(data.quota);
        }
      } else {
        // Handle quota limit error
        if (response.status === 429 && data.quota) {
          setQuota(data.quota);
        }

        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.message || 'Sorry, I encountered an error. Please try again later.',
          timestamp: new Date().toISOString()
        };
        const updatedMessages = [...newMessages, errorMessage];
        setMessages(updatedMessages);
        saveChatToStorage(updatedMessages);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Unable to connect to the server. Please check your connection and try again.',
        timestamp: new Date().toISOString()
      };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      saveChatToStorage(updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history? This will not reset your question count.')) {
      setMessages([]);
      setUploadedImages([]);
      const storageKey = getStorageKey();
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('Please select image files only.');
      return;
    }

    // Limit to 5 images max
    const remainingSlots = 5 - uploadedImages.length;
    if (imageFiles.length > remainingSlots) {
      alert(`You can upload a maximum of 5 images. ${remainingSlots} slot(s) remaining.`);
      imageFiles.splice(remainingSlots);
    }

    imageFiles.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`Image ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImages(prev => [...prev, {
          id: Date.now() + Math.random(),
          file: file,
          preview: reader.result,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Handler for Paper Correction button
  const handlePaperCorrectionClick = () => {
    setShowPaperCorrectionModal(true);
    // Add user message showing the clicked option
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: 'Paper Correction',
      timestamp: new Date().toISOString(),
      isButtonClick: true
    };
    setMessages(prev => [...prev, userMessage]);
    saveChatToStorage([...messages, userMessage]);
  };

  // Handler for Study Time table button
  const handleStudyTimetableClick = () => {
    setStudyTimetableFlow('subjects');
    setSelectedSubject(null);
    setSelectedModule(null);
    // Add user message showing the clicked option
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: 'Study Time table',
      timestamp: new Date().toISOString(),
      isButtonClick: true
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    // Check if student has enrolled subjects
    if (studentSubjects.length === 0) {
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'You are not currently enrolled in any subjects. Please contact your administrator to enroll in courses first.',
        timestamp: new Date().toISOString(),
        showSubjects: false
      };
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      saveChatToStorage(updatedMessages);
      return;
    }
    
    // Add assistant message showing subjects
    const subjectList = studentSubjects.map(s => `- ${s.name}`).join('\n');
    const assistantMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: `Here are your enrolled subjects:\n\n${subjectList}\n\nPlease select a subject to view its modules and timetable.`,
      timestamp: new Date().toISOString(),
      showSubjects: true
    };
    const updatedMessages = [...newMessages, assistantMessage];
    setMessages(updatedMessages);
    saveChatToStorage(updatedMessages);
  };

  // Handler for Quick Answer button
  const handleQuickAnswerClick = () => {
    // Add user message showing the clicked option
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: 'Quick Answer',
      timestamp: new Date().toISOString(),
      isButtonClick: true
    };
    setMessages(prev => [...prev, userMessage]);
    saveChatToStorage([...messages, userMessage]);
    
    // Show assistant message for quick answer
    const assistantMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: 'I\'m ready to answer your questions quickly! Just type your question in the input box below and I\'ll provide you with a concise answer.',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, assistantMessage]);
    saveChatToStorage([...messages, userMessage, assistantMessage]);
  };

  // Handler for paper correction image upload
  const handlePaperCorrectionImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image is too large. Maximum size is 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPaperCorrectionImage({
        file: file,
        preview: reader.result,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  // Handler for submitting paper correction
  const handlePaperCorrectionSubmit = async () => {
    if (!paperCorrectionImage) {
      alert('Please upload an image first.');
      return;
    }

    // Check quota
    if (quota.remaining <= 0) {
      alert(`You have reached the daily limit of ${quota.limit} messages.`);
      return;
    }

    setShowPaperCorrectionModal(false);
    setIsLoading(true);

    // Add image to messages
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: 'Paper Correction',
      images: [{
        id: Date.now(),
        data: paperCorrectionImage.preview,
        name: paperCorrectionImage.name
      }],
      timestamp: new Date().toISOString()
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const response = await fetch(`${API_URL}/api/student/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          message: 'Act as a papper correction and papper marking teacher mark the papeer and show the results after marking the image',
          images: [{
            data: paperCorrectionImage.preview,
            name: paperCorrectionImage.name,
            type: paperCorrectionImage.file.type
          }],
          gradeSection: gradeSection,
          masterPrompt: masterPrompt,
          chatHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
            images: m.images || []
          }))
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };
        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
        saveChatToStorage(updatedMessages);

        if (data.quota) {
          setQuota(data.quota);
        }
      } else {
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.message || 'Sorry, I encountered an error. Please try again later.',
          timestamp: new Date().toISOString()
        };
        const updatedMessages = [...newMessages, errorMessage];
        setMessages(updatedMessages);
        saveChatToStorage(updatedMessages);
      }
    } catch (err) {
      console.error('Error sending paper correction:', err);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Unable to connect to the server. Please check your connection and try again.',
        timestamp: new Date().toISOString()
      };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      saveChatToStorage(updatedMessages);
    } finally {
      setIsLoading(false);
      setPaperCorrectionImage(null);
    }
  };

  // Handler for subject selection in study timetable
  const handleSubjectSelect = (subject, messageId) => {
    setSelectedSubject(subject);
    setStudyTimetableFlow('modules');
    
    setMessages(prevMessages => {
      // Update the assistant message to mark the selected subject
      const updatedMessages = prevMessages.map(msg => {
        if (msg.id === messageId && msg.showSubjects) {
          return { ...msg, selectedSubjectId: subject.id };
        }
        return msg;
      });
      
      // Add user message showing the selected subject
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: subject.name,
        timestamp: new Date().toISOString(),
        isSelection: true
      };
      const messagesWithUser = [...updatedMessages, userMessage];
      
      // Add assistant message showing modules
      const subjectModules = modules[subject.id] || [];
      const moduleList = subjectModules.map(m => `- ${m.name}`).join('\n');
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Here are the modules for ${subject.name}:\n\n${moduleList}\n\nPlease select a module to view its timetable.`,
        timestamp: new Date().toISOString(),
        modules: subjectModules
      };
      const finalMessages = [...messagesWithUser, assistantMessage];
      
      saveChatToStorage(finalMessages);
      return finalMessages;
    });
  };

  // Handler for module selection in study timetable
  const handleModuleSelect = (module, messageId) => {
    setSelectedModule(module);
    setStudyTimetableFlow('timetable');
    
    setMessages(prevMessages => {
      // Update the assistant message to mark the selected module
      const updatedMessages = prevMessages.map(msg => {
        if (msg.id === messageId && msg.modules) {
          return { ...msg, selectedModuleId: module.id };
        }
        return msg;
      });
      
      // Add user message showing the selected module
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: module.name,
        timestamp: new Date().toISOString(),
        isSelection: true
      };
      const messagesWithUser = [...updatedMessages, userMessage];
      
      // Get submodules for this module
      const moduleSubModules = subModules[module.id] || [];
      
      // Find the selected subject from previous messages
      let selectedSubjectData = null;
      for (let i = messagesWithUser.length - 1; i >= 0; i--) {
        if (messagesWithUser[i].showSubjects && messagesWithUser[i].selectedSubjectId) {
          selectedSubjectData = studentSubjects.find(s => s.id === messagesWithUser[i].selectedSubjectId);
          break;
        }
      }
      
      // Create timetable display
      const timetableContent = `Timetable for ${module.name}:\n\n${moduleSubModules.map(sub => 
        `- ${sub.name}: ${sub.timeAllocation} hours`
      ).join('\n')}\n\nTotal: ${moduleSubModules.reduce((sum, sub) => sum + sub.timeAllocation, 0)} hours`;
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: timetableContent,
        timestamp: new Date().toISOString(),
        timetable: {
          module: module,
          subModules: moduleSubModules,
          subjectId: selectedSubjectData?.id || null,
          subjectName: selectedSubjectData?.name || null
        }
      };
      const finalMessages = [...messagesWithUser, assistantMessage];
      
      saveChatToStorage(finalMessages);
      return finalMessages;
    });
  };

  // Handler for saving timetable
  const handleSaveTimetable = async (messageId) => {
    if (!student?.id) return;
    
    setSavingTimetable(prev => ({ ...prev, [messageId]: true }));
    
    setMessages(prevMessages => {
      // Find the message with the timetable
      const timetableMessage = prevMessages.find(msg => msg.id === messageId && msg.timetable);
      if (!timetableMessage || !timetableMessage.timetable) {
        setSavingTimetable(prev => ({ ...prev, [messageId]: false }));
        return prevMessages;
      }
      
      const { timetable } = timetableMessage;
      const { module, subModules: moduleSubModules, subjectId, subjectName } = timetable;
      
      // Save timetable asynchronously
      (async () => {
        try {
          const response = await fetch(`${API_URL}/api/students/${student.id}/timetables`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subjectId: subjectId || selectedSubject?.id || '',
              subjectName: subjectName || selectedSubject?.name || '',
              moduleId: module.id,
              moduleName: module.name,
              subModules: moduleSubModules,
              totalHours: moduleSubModules.reduce((sum, sub) => sum + sub.timeAllocation, 0)
            }),
          });

          const data = await response.json();

          if (data.success) {
            // Update message to show saved status
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                return { ...msg, timetableSaved: true };
              }
              return msg;
            }));
            
            // Show success message with monthly count
            const remaining = 3 - (data.monthlyCount || 0);
            const successMessage = {
              id: Date.now(),
              role: 'assistant',
              content: `✅ Timetable for ${module.name} has been saved successfully!${remaining > 0 ? `\n\nYou have ${remaining} timetable${remaining !== 1 ? 's' : ''} remaining this month.` : '\n\n⚠️ You have reached your monthly limit of 3 timetables.'}`,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => {
              const updated = [...prev, successMessage];
              saveChatToStorage(updated);
              return updated;
            });
          } else {
            // Show error message with limit information
            const errorMessage = {
              id: Date.now(),
              role: 'assistant',
              content: `❌ ${data.message || 'Failed to save timetable. Please try again.'}\n\nYou can update an existing timetable or wait until next month to save a new one.`,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => {
              const updated = [...prev, errorMessage];
              saveChatToStorage(updated);
              return updated;
            });
          }
        } catch (err) {
          console.error('Error saving timetable:', err);
          const errorMessage = {
            id: Date.now(),
            role: 'assistant',
            content: '❌ Unable to save timetable. Please check your connection and try again.',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => {
            const updated = [...prev, errorMessage];
            saveChatToStorage(updated);
            return updated;
          });
        } finally {
          setSavingTimetable(prev => ({ ...prev, [messageId]: false }));
        }
      })();
      
      return prevMessages;
    });
  };

  // Don't render if student is not available
  if (!student || !student.id) {
    return null;
  }

  const remainingQuestions = quota.remaining;

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            backgroundSize: '200% 200%',
            border: 'none',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            minWidth: '140px',
            animation: 'floatBounce 3s ease-in-out infinite, pulseGlow 2s ease-in-out infinite',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.7), 0 0 0 4px rgba(99, 102, 241, 0.2)';
            e.currentTarget.style.animation = 'none';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
            e.currentTarget.style.animation = 'floatBounce 3s ease-in-out infinite, pulseGlow 2s ease-in-out infinite';
          }}
        >
          {/* Shimmer Effect Overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
            animation: 'shimmerButton 3s infinite',
            pointerEvents: 'none'
          }} />
          
          {/* Teacher Avatar */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
            animation: 'iconPulse 2s ease-in-out infinite'
          }}>
            <HiOutlineAcademicCap size={20} color="#6366f1" />
          </div>
          
          {/* Text Content */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '2px',
            color: 'white',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              lineHeight: '1.2',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}>
              "Institute Name"
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: '500',
              lineHeight: '1.2',
              opacity: 0.95,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}>
              AI Teacher
            </div>
          </div>
        </Button>
      )}

      {/* Full-Width Chat Modal - Gemini AI Style */}
      <Modal
        show={isOpen}
        onHide={() => setIsOpen(false)}
        fullscreen
        backdrop="static"
        style={{ zIndex: 1050 }}
      >
        <Modal.Header
          style={{
            border: 'none',
            padding: '20px 32px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              position: 'relative',
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              <HiOutlineCpuChip size={24} />
              <div style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid white',
                animation: 'pulse 2s ease-in-out infinite'
              }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h5 style={{
                  margin: 0,
                  fontWeight: '700',
                  fontSize: '20px',
                  color: '#0f172a',
                  letterSpacing: '-0.5px'
                }}>
                  “Institute Name” AI Study Assistant
                </h5>
                <Badge style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Powered By NexGen-AI
                </Badge>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <small style={{
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <HiOutlineLightBulb size={14} />
                  {remainingQuestions} messages remaining today
                </small>
              </div>
            </div>
          </div>
          <Button
            variant="link"
            onClick={() => setIsOpen(false)}
            style={{
              color: '#64748b',
              padding: '8px',
              minWidth: 'auto',
              textDecoration: 'none',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <HiXMark size={24} />
          </Button>
        </Modal.Header>

        <Modal.Body
          style={{
            padding: 0,
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 140px)',
            overflow: 'hidden'
          }}
        >
          {/* Messages Area - Gemini Style */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              maxWidth: '1200px',
              margin: '0 auto',
              width: '100%',
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none' /* IE and Edge */
            }}
            className="hide-scrollbar"
          >
            {messages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '100px 20px',
                color: '#64748b',
                maxWidth: '700px',
                margin: '0 auto'
              }}>
                <div style={{
                  position: 'relative',
                  display: 'inline-block',
                  marginBottom: '32px'
                }}>
                  <div style={{
                    fontSize: '80px',
                    marginBottom: '0',
                    opacity: 0.9,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'float 3s ease-in-out infinite'
                  }}>
                    <HiOutlineCpuChip />
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulse 2s ease-in-out infinite',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)'
                  }}>
                    <HiOutlineSparkles size={12} color="white" />
                  </div>
                </div>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#0f172a',
                  letterSpacing: '-0.5px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Learn & Grow with [Institute Name] AI-Study Assistant
                </h3>
                <p style={{
                  margin: '0 0 12px 0',
                  fontSize: '18px',
                  lineHeight: '1.7',
                  color: '#475569',
                  fontWeight: '400'
                }}>
                  I'm your intelligent study companion powered by AI. Ask me anything and I'll help you understand concepts, solve problems, and excel in your studies.
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                  marginTop: '32px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={handlePaperCorrectionClick}
                    style={{
                      padding: '12px 20px',
                      background: '#fef2f2',
                      borderRadius: '12px',
                      border: '1px solid #fecaca',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: 'none',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <HiOutlineDocumentText size={18} color="#ef4444" />
                    <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: '600' }}>
                      Paper Correction
                    </span>
                  </button>
                  <button
                    onClick={handleStudyTimetableClick}
                    style={{
                      padding: '12px 20px',
                      background: '#f0f9ff',
                      borderRadius: '12px',
                      border: '1px solid #e0f2fe',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: 'none',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e0f2fe';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f0f9ff';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <HiOutlineClock size={18} color="#0ea5e9" />
                    <span style={{ fontSize: '13px', color: '#0c4a6e', fontWeight: '600' }}>
                      Study Time table
                    </span>
                  </button>
                  <button
                    onClick={handleQuickAnswerClick}
                    style={{
                      padding: '12px 20px',
                      background: '#f0fdf4',
                      borderRadius: '12px',
                      border: '1px solid #bbf7d0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: 'none',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#dcfce7';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f0fdf4';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <HiOutlineQuestionMarkCircle size={18} color="#10b981" />
                    <span style={{ fontSize: '13px', color: '#166534', fontWeight: '600' }}>
                      Quick Answer
                    </span>
                  </button>
                </div>
                <div style={{
                  marginTop: '40px',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  display: 'inline-block'
                }}>
                  <p style={{
                    margin: '0',
                    fontSize: '14px',
                    color: '#475569',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'inline-block',
                      animation: 'pulse 2s ease-in-out infinite'
                    }} />
                    You have <strong style={{ color: '#6366f1', fontWeight: '700' }}>{remainingQuestions}</strong> messages remaining today
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    width: '100%',
                    animation: 'fadeIn 0.3s ease-in'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      minWidth: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      alignItems: message.role === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {/* Avatar/Icon */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '6px',
                      flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
                    }}>
                      <div style={{
                        position: 'relative',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: message.role === 'user'
                          ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                          : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: message.role === 'user' ? 'white' : '#6366f1',
                        flexShrink: 0,
                        boxShadow: message.role === 'assistant'
                          ? '0 2px 8px rgba(99, 102, 241, 0.15)'
                          : '0 2px 8px rgba(99, 102, 241, 0.3)',
                        border: message.role === 'assistant' ? '2px solid #e0f2fe' : 'none'
                      }}>
                        {message.role === 'user' ? (
                          <HiOutlineChatBubbleLeftRight size={18} />
                        ) : (
                          <HiOutlineCpuChip size={18} />
                        )}
                        {message.role === 'assistant' && (
                          <div style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '2px solid white',
                            animation: 'pulse 2s ease-in-out infinite'
                          }} />
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: message.role === 'user' ? '#6366f1' : '#0ea5e9',
                          textTransform: 'capitalize',
                          letterSpacing: '0.3px'
                        }}>
                          {message.role === 'user' ? 'You' : 'AI Assistant'}
                        </span>
                        {message.role === 'assistant' && (
                          <span style={{
                            fontSize: '10px',
                            color: '#94a3b8',
                            fontWeight: '500',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Powered by AI
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Message Bubble */}
                    <div
                      style={{
                        padding: '18px 24px',
                        borderRadius: message.role === 'user'
                          ? '24px 24px 6px 24px'
                          : '24px 24px 24px 6px',
                        background: message.role === 'user'
                          ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        color: message.role === 'user' ? '#ffffff' : '#0f172a',
                        boxShadow: message.role === 'user'
                          ? '0 4px 12px rgba(99, 102, 241, 0.25)'
                          : '0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(99, 102, 241, 0.05)',
                        wordWrap: 'break-word',
                        fontSize: '15px',
                        lineHeight: '1.7',
                        whiteSpace: 'pre-wrap',
                        border: message.role === 'assistant'
                          ? '1px solid #e2e8f0'
                          : 'none',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        if (message.role === 'assistant') {
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(99, 102, 241, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (message.role === 'assistant') {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(99, 102, 241, 0.05)';
                        }
                      }}
                    >
                      {message.content && (
                        <div>{message.content}</div>
                      )}
                      
                      {/* Show subjects list when study timetable flow is active */}
                      {message.role === 'assistant' && message.showSubjects && studentSubjects.length > 0 && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#0f172a' }}>Select a subject:</div>
                          {studentSubjects.map((subject) => {
                            const isSelected = message.selectedSubjectId === subject.id;
                            const isDisabled = message.selectedSubjectId && message.selectedSubjectId !== subject.id;
                            
                            return (
                              <button
                                key={subject.id}
                                onClick={() => !isDisabled && handleSubjectSelect(subject, message.id)}
                                disabled={isDisabled}
                                style={{
                                  padding: '12px 16px',
                                  background: isSelected 
                                    ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                                    : isDisabled 
                                    ? '#f1f5f9'
                                    : '#f0f9ff',
                                  border: isSelected 
                                    ? '2px solid #0284c7'
                                    : '1px solid #e0f2fe',
                                  borderRadius: '8px',
                                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                                  textAlign: 'left',
                                  transition: 'all 0.2s ease',
                                  color: isSelected 
                                    ? 'white'
                                    : isDisabled
                                    ? '#94a3b8'
                                    : '#0c4a6e',
                                  fontWeight: isSelected ? '700' : '500',
                                  fontSize: '14px',
                                  opacity: isDisabled ? 0.6 : 1,
                                  position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isDisabled && !isSelected) {
                                    e.currentTarget.style.background = '#e0f2fe';
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isDisabled && !isSelected) {
                                    e.currentTarget.style.background = '#f0f9ff';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                  }
                                }}
                              >
                                {subject.name}
                                {isSelected && (
                                  <span style={{
                                    position: 'absolute',
                                    right: '12px',
                                    fontSize: '16px'
                                  }}>✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Show modules list when a subject is selected */}
                      {message.role === 'assistant' && message.modules && message.modules.length > 0 && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#0f172a' }}>Select a module:</div>
                          {message.modules.map((module) => {
                            const isSelected = message.selectedModuleId === module.id;
                            const isDisabled = message.selectedModuleId && message.selectedModuleId !== module.id;
                            
                            return (
                              <button
                                key={module.id}
                                onClick={() => !isDisabled && handleModuleSelect(module, message.id)}
                                disabled={isDisabled}
                                style={{
                                  padding: '12px 16px',
                                  background: isSelected 
                                    ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                                    : isDisabled 
                                    ? '#f1f5f9'
                                    : '#f0f9ff',
                                  border: isSelected 
                                    ? '2px solid #0284c7'
                                    : '1px solid #e0f2fe',
                                  borderRadius: '8px',
                                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                                  textAlign: 'left',
                                  transition: 'all 0.2s ease',
                                  color: isSelected 
                                    ? 'white'
                                    : isDisabled
                                    ? '#94a3b8'
                                    : '#0c4a6e',
                                  fontWeight: isSelected ? '700' : '500',
                                  fontSize: '14px',
                                  opacity: isDisabled ? 0.6 : 1,
                                  position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isDisabled && !isSelected) {
                                    e.currentTarget.style.background = '#e0f2fe';
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isDisabled && !isSelected) {
                                    e.currentTarget.style.background = '#f0f9ff';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                  }
                                }}
                              >
                                {module.name}
                                {isSelected && (
                                  <span style={{
                                    position: 'absolute',
                                    right: '12px',
                                    fontSize: '16px'
                                  }}>✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Show timetable table when a module is selected */}
                      {message.role === 'assistant' && message.timetable && message.timetable.subModules && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontWeight: '600', marginBottom: '12px', color: '#0f172a', fontSize: '16px' }}>
                            Timetable for {message.timetable.module.name}:
                          </div>
                          <Table striped bordered hover style={{ fontSize: '14px', margin: 0, marginBottom: '16px' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '10px', fontWeight: '600' }}>Submodule</th>
                                <th style={{ padding: '10px', fontWeight: '600', textAlign: 'center' }}>Time Allocation (Hours)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {message.timetable.subModules.map((subModule) => (
                                <tr key={subModule.id}>
                                  <td style={{ padding: '10px' }}>{subModule.name}</td>
                                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#6366f1' }}>
                                    {subModule.timeAllocation} hours
                                  </td>
                                </tr>
                              ))}
                              <tr style={{ background: '#f8fafc', fontWeight: '700' }}>
                                <td style={{ padding: '10px' }}>Total</td>
                                <td style={{ padding: '10px', textAlign: 'center', color: '#6366f1' }}>
                                  {message.timetable.subModules.reduce((sum, sub) => sum + sub.timeAllocation, 0)} hours
                                </td>
                              </tr>
                            </tbody>
                          </Table>
                          <Button
                            onClick={() => handleSaveTimetable(message.id)}
                            disabled={savingTimetable[message.id] || message.timetableSaved}
                            style={{
                              background: message.timetableSaved
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '10px 20px',
                              fontWeight: '600',
                              fontSize: '14px',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: (savingTimetable[message.id] || message.timetableSaved) ? 'not-allowed' : 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: message.timetableSaved
                                ? '0 2px 8px rgba(16, 185, 129, 0.3)'
                                : '0 2px 8px rgba(99, 102, 241, 0.3)',
                              opacity: (savingTimetable[message.id] || message.timetableSaved) ? 0.8 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (!savingTimetable[message.id] && !message.timetableSaved) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!savingTimetable[message.id] && !message.timetableSaved) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
                              }
                            }}
                          >
                            {savingTimetable[message.id] ? (
                              <>
                                <Spinner size="sm" style={{ marginRight: '8px' }} />
                                Saving...
                              </>
                            ) : message.timetableSaved ? (
                              <>
                                <HiOutlineBookmark size={18} />
                                Timetable Saved ✓
                              </>
                            ) : (
                              <>
                                <HiOutlineBookmark size={18} />
                                Save Timetable
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {message.images && message.images.length > 0 && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginTop: message.content ? '8px' : '0'
                        }}>
                          {message.images.map((img) => (
                            <div key={img.id} style={{
                              position: 'relative',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              maxWidth: '200px',
                              maxHeight: '200px',
                              border: message.role === 'user'
                                ? '2px solid rgba(255, 255, 255, 0.3)'
                                : '2px solid #e2e8f0'
                            }}>
                              <img
                                src={img.data}
                                alt={img.name || 'Uploaded image'}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {message.role === 'assistant' && (
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '12px',
                          opacity: 0.3
                        }}>
                          <HiOutlineSparkles size={12} color="#6366f1" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                width: '100%'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6366f1'
                    }}>
                      <HiOutlineSparkles size={16} />
                    </div>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b'
                    }}>
                      AI Assistant
                    </span>
                  </div>
                  <div style={{
                    padding: '18px 24px',
                    borderRadius: '24px 24px 24px 6px',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s linear infinite'
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: '#0f172a', fontSize: '15px', fontWeight: '600' }}>
                        AI is thinking
                      </span>
                      <span style={{ color: '#64748b', fontSize: '12px' }}>
                        Processing your question...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Gemini Style */}
          <div
            style={{
              borderTop: '1px solid #e2e8f0',
              padding: '16px 24px',
              background: '#ffffff',
              maxWidth: '1200px',
              margin: '0 auto',
              width: '100%'
            }}
          >
            {quota.remaining <= 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: '#fef2f2',
                borderRadius: '12px',
                color: '#dc2626',
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid #fecaca'
              }}>
                You've reached the daily limit of {quota.limit} messages. Please try again tomorrow.
              </div>
            ) : (
              <Form onSubmit={handleSendMessage}>
                {/* Image Preview Area */}
                {uploadedImages.length > 0 && (
                  <div style={{
                    marginBottom: '12px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {uploadedImages.map((img) => (
                      <div key={img.id} style={{
                        position: 'relative',
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '2px solid #e2e8f0'
                      }}>
                        <img
                          src={img.preview}
                          alt={img.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            padding: 0
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  className="gradient-input-container"
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-end',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '28px',
                    padding: '10px 10px 10px 24px',
                    border: '2px solid transparent',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 6px rgba(99, 102, 241, 0.1), 0 4px 12px rgba(99, 102, 241, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: '24px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none'
                  }}>
                    <HiOutlineLightBulb size={18} />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || quota.remaining <= 0 || uploadedImages.length >= 5}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: uploadedImages.length >= 5 ? '#cbd5e1' : '#6366f1',
                      cursor: uploadedImages.length >= 5 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      if (uploadedImages.length < 5 && !isLoading && quota.remaining > 0) {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title={uploadedImages.length >= 5 ? 'Maximum 5 images allowed' : 'Upload image'}
                  >
                    <HiOutlinePhoto size={20} />
                  </Button>
                  <Form.Control
                    as="textarea"
                    rows={1}
                    placeholder="Ask me anything about your course materials..."
                    value={inputMessage}
                    onChange={(e) => {
                      setInputMessage(e.target.value);
                      // Auto-resize textarea
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    disabled={isLoading || quota.remaining <= 0}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: '12px 0 12px 32px',
                      fontSize: '15px',
                      color: '#0f172a',
                      resize: 'none',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      flex: 1,
                      boxShadow: 'none',
                      fontWeight: '400',
                      lineHeight: '1.6'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if ((inputMessage.trim() || uploadedImages.length > 0) && !isLoading) {
                          handleSendMessage(e);
                        }
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={(!inputMessage.trim() && uploadedImages.length === 0) || isLoading || quota.remaining <= 0}
                    style={{
                      background: ((inputMessage.trim() || uploadedImages.length > 0) && !isLoading && quota.remaining > 0)
                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                        : '#cbd5e1',
                      border: 'none',
                      borderRadius: '50%',
                      width: '52px',
                      height: '52px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      flexShrink: 0,
                      boxShadow: ((inputMessage.trim() || uploadedImages.length > 0) && !isLoading && quota.remaining > 0)
                        ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                        : 'none',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if ((inputMessage.trim() || uploadedImages.length > 0) && !isLoading && quota.remaining > 0) {
                        e.currentTarget.style.transform = 'scale(1.08) rotate(5deg)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                      e.currentTarget.style.boxShadow = ((inputMessage.trim() || uploadedImages.length > 0) && !isLoading && quota.remaining > 0)
                        ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                        : 'none';
                    }}
                  >
                    <HiPaperAirplane size={22} color="white" style={{ transform: 'rotate(-45deg)' }} />
                    {((inputMessage.trim() || uploadedImages.length > 0) && !isLoading && quota.remaining > 0) && (
                      <div style={{
                        position: 'absolute',
                        top: '-50%',
                        left: '-50%',
                        width: '200%',
                        height: '200%',
                        background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                        animation: 'shimmer 2s infinite'
                      }} />
                    )}
                  </Button>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px',
                  padding: '0 8px'
                }}>
                  <small style={{
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {remainingQuestions} messages remaining • Press Enter to send, Shift+Enter for new line
                    {uploadedImages.length > 0 && ` • ${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''} attached`}
                  </small>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleClearChat}
                    style={{
                      color: '#64748b',
                      textDecoration: 'none',
                      fontSize: '12px',
                      padding: '4px 8px',
                      fontWeight: '500',
                      borderRadius: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#64748b';
                    }}
                  >
                    Clear Chat
                  </Button>
                </div>
              </Form>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* Paper Correction Modal - Enhanced UI */}
      <Modal
        show={showPaperCorrectionModal}
        onHide={() => {
          setShowPaperCorrectionModal(false);
          setPaperCorrectionImage(null);
        }}
        centered
        size="lg"
        style={{ zIndex: 1060 }}
      >
        <Modal.Header
          style={{
            border: 'none',
            padding: '24px 28px',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fef2f2 100%)',
            backgroundSize: '200% 200%',
            borderBottom: '1px solid #fecaca',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Animated background pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(239, 68, 68, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(220, 38, 38, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                animation: 'shimmer 3s infinite'
              }} />
              <HiOutlineDocumentText size={28} style={{ position: 'relative', zIndex: 1 }} />
            </div>
            <div style={{ flex: 1 }}>
              <Modal.Title style={{ 
                margin: 0, 
                color: '#991b1b', 
                fontWeight: '700',
                fontSize: '24px',
                letterSpacing: '-0.5px',
                marginBottom: '4px'
              }}>
                Paper Correction
              </Modal.Title>
              <div style={{ 
                color: '#b91c1c', 
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <HiOutlineSparkles size={14} />
                AI-powered paper marking and feedback
              </div>
            </div>
          </div>
          <Button
            variant="link"
            onClick={() => {
              setShowPaperCorrectionModal(false);
              setPaperCorrectionImage(null);
            }}
            style={{
              color: '#991b1b',
              padding: '8px',
              minWidth: 'auto',
              textDecoration: 'none',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              position: 'relative',
              zIndex: 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#991b1b';
            }}
          >
            <HiXMark size={24} />
          </Button>
        </Modal.Header>
        
        <Modal.Body style={{ padding: '28px', background: '#ffffff' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {!paperCorrectionImage ? (
              <>
                {/* Upload Area */}
                <div 
                  style={{
                    border: '3px dashed #fecaca',
                    borderRadius: '20px',
                    padding: '60px 40px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => paperCorrectionFileInputRef.current?.click()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ef4444';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#fecaca';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Animated icon container */}
                  <div style={{
                    width: '100px',
                    height: '100px',
                    margin: '0 auto 20px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)',
                    position: 'relative',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}>
                    <HiOutlinePhoto size={48} color="white" />
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#10b981',
                      border: '3px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <HiOutlineCamera size={12} color="white" />
                    </div>
                  </div>
                  
                  <div style={{ 
                    color: '#991b1b', 
                    fontWeight: '700', 
                    fontSize: '20px',
                    marginBottom: '8px',
                    letterSpacing: '-0.3px'
                  }}>
                    Drop your paper here or click to browse
                  </div>
                  <div style={{ 
                    color: '#b91c1c', 
                    fontSize: '14px',
                    marginBottom: '16px',
                    fontWeight: '500'
                  }}>
                    Take a clear photo or upload an image file
                  </div>
                  
                  {/* File info */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: '#991b1b',
                    fontWeight: '600',
                    marginTop: '8px'
                  }}>
                    <HiOutlineDocumentText size={14} />
                    JPG, PNG • Max 10MB
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  <Button
                    onClick={() => paperCorrectionFileInputRef.current?.click()}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      border: 'none',
                      color: 'white',
                      padding: '14px 28px',
                      borderRadius: '12px',
                      fontWeight: '700',
                      fontSize: '15px',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minWidth: '180px',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                    }}
                  >
                    <HiOutlinePhoto size={20} />
                    Upload from Device
                  </Button>
                  <Button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setPaperCorrectionImage({
                              file: file,
                              preview: reader.result,
                              name: file.name
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    style={{
                      background: 'white',
                      border: '2px solid #ef4444',
                      color: '#ef4444',
                      padding: '14px 28px',
                      borderRadius: '12px',
                      fontWeight: '700',
                      fontSize: '15px',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minWidth: '180px',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <HiOutlineCamera size={20} />
                    Take Photo
                  </Button>
                </div>

                {/* Tips Section */}
                <div style={{
                  marginTop: '8px',
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderRadius: '12px',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '12px'
                  }}>
                    <HiOutlineLightBulb size={18} color="#0ea5e9" />
                    <div style={{ 
                      fontWeight: '700', 
                      color: '#0c4a6e',
                      fontSize: '14px'
                    }}>
                      Tips for best results:
                    </div>
                  </div>
                  <ul style={{
                    margin: 0,
                    paddingLeft: '24px',
                    color: '#075985',
                    fontSize: '13px',
                    lineHeight: '1.8'
                  }}>
                    <li>Ensure good lighting and clear focus</li>
                    <li>Capture the entire paper in the frame</li>
                    <li>Avoid shadows and glare on the paper</li>
                    <li>Make sure text is readable and not blurry</li>
                  </ul>
                </div>
              </>
            ) : (
              <div>
                {/* Image Preview */}
                <div style={{
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '3px solid #fecaca',
                  marginBottom: '20px',
                  background: '#fef2f2',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.15)'
                }}>
                  <img
                    src={paperCorrectionImage.preview}
                    alt="Paper to correct"
                    style={{
                      width: '100%',
                      maxHeight: '500px',
                      objectFit: 'contain',
                      display: 'block',
                      background: '#ffffff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setPaperCorrectionImage(null)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(8px)',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      padding: 0,
                      transition: 'all 0.2s ease',
                      fontWeight: 'bold'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    ×
                  </button>
                  
                  {/* Image info badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    padding: '8px 14px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '20px',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <HiOutlineDocumentText size={14} />
                    {paperCorrectionImage.name}
                  </div>
                </div>
                
                {/* Ready to submit message */}
                <div style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  borderRadius: '12px',
                  border: '2px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <HiOutlineSparkles size={20} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      color: '#166534', 
                      fontSize: '15px',
                      fontWeight: '700',
                      marginBottom: '2px'
                    }}>
                      Ready for AI Correction
                    </div>
                    <div style={{ 
                      color: '#15803d', 
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      Your paper is ready to be analyzed. Click submit to get AI-powered feedback and marks.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <input
              type="file"
              ref={paperCorrectionFileInputRef}
              accept="image/*"
              onChange={handlePaperCorrectionImageUpload}
              style={{ display: 'none' }}
            />
          </div>
        </Modal.Body>
        
        <Modal.Footer style={{ 
          border: 'none', 
          padding: '20px 28px', 
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Button
            variant="secondary"
            onClick={() => {
              setShowPaperCorrectionModal(false);
              setPaperCorrectionImage(null);
            }}
            style={{
              borderRadius: '10px',
              padding: '12px 24px',
              fontWeight: '600',
              fontSize: '15px',
              border: 'none',
              background: 'white',
              color: '#64748b',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#475569';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePaperCorrectionSubmit}
            disabled={!paperCorrectionImage || isLoading}
            style={{
              borderRadius: '10px',
              padding: '12px 32px',
              fontWeight: '700',
              fontSize: '15px',
              border: 'none',
              background: paperCorrectionImage && !isLoading
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : '#cbd5e1',
              color: 'white',
              boxShadow: paperCorrectionImage && !isLoading
                ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                : 'none',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (paperCorrectionImage && !isLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (paperCorrectionImage && !isLoading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
              }
            }}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" style={{ marginRight: '8px' }} />
                Processing...
              </>
            ) : (
              <>
                <HiOutlineDocumentText size={18} />
                Submit for Correction
              </>
            )}
            {paperCorrectionImage && !isLoading && (
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                animation: 'shimmer 2s infinite'
              }} />
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default StudentChatbot;

