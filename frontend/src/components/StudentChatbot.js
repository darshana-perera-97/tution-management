import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Form, InputGroup, Badge, Spinner, Modal } from 'react-bootstrap';
import { 
  HiOutlineChatBubbleLeftRight, 
  HiXMark, 
  HiPaperAirplane, 
  HiOutlineSparkles,
  HiOutlineCpuChip,
  HiOutlineLightBulb,
  HiOutlineAcademicCap
} from 'react-icons/hi2';
import API_URL from '../config';

const StudentChatbot = ({ student }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quota, setQuota] = useState({ count: 0, remaining: 15, limit: 15 });
  const [gradeSection, setGradeSection] = useState(null);
  const [masterPrompt, setMasterPrompt] = useState('');
  const messagesEndRef = useRef(null);

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

      // Fetch quota from backend
      fetchQuota();

      // Fetch master prompt (combined text) for this grade section
      if (section) {
        fetchMasterPrompt(section);
      }
    }
  }, [student]);

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
    
    if (!inputMessage.trim() || isLoading) return;

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
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/student/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          message: inputMessage.trim(),
          gradeSection: gradeSection,
          masterPrompt: masterPrompt,
          chatHistory: messages.map(m => ({
            role: m.role,
            content: m.content
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
      const storageKey = getStorageKey();
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
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
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            border: 'none',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
          }}
        >
          <HiOutlineChatBubbleLeftRight size={24} color="white" />
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
                  AI Study Assistant
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
                  AI Powered
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
                  Welcome to AI Study Assistant
                </h3>
                <p style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '18px',
                  lineHeight: '1.7',
                  color: '#475569',
                  fontWeight: '400'
                }}>
                  I'm your intelligent study companion powered by AI. Ask me anything about your course materials, and I'll help you understand concepts, solve problems, and excel in your studies.
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                  marginTop: '32px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    padding: '12px 20px',
                    background: '#f0f9ff',
                    borderRadius: '12px',
                    border: '1px solid #e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <HiOutlineAcademicCap size={18} color="#0ea5e9" />
                    <span style={{ fontSize: '13px', color: '#0c4a6e', fontWeight: '600' }}>
                      Course Materials
                    </span>
                  </div>
                  <div style={{
                    padding: '12px 20px',
                    background: '#f5f3ff',
                    borderRadius: '12px',
                    border: '1px solid #e9d5ff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <HiOutlineLightBulb size={18} color="#8b5cf6" />
                    <span style={{ fontSize: '13px', color: '#6b21a8', fontWeight: '600' }}>
                      Problem Solving
                    </span>
                  </div>
                  <div style={{
                    padding: '12px 20px',
                    background: '#f0fdf4',
                    borderRadius: '12px',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <HiOutlineSparkles size={18} color="#10b981" />
                    <span style={{ fontSize: '13px', color: '#166534', fontWeight: '600' }}>
                      AI Powered
                    </span>
                  </div>
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
                        transition: 'all 0.2s ease'
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
                      {message.content}
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
                    <Spinner animation="border" size="sm" style={{ color: '#6366f1' }} />
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
                        if (inputMessage.trim() && !isLoading) {
                          handleSendMessage(e);
                        }
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading || quota.remaining <= 0}
                    style={{
                      background: inputMessage.trim() && !isLoading && quota.remaining > 0
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
                      boxShadow: inputMessage.trim() && !isLoading && quota.remaining > 0
                        ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                        : 'none',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if (inputMessage.trim() && !isLoading && quota.remaining > 0) {
                        e.currentTarget.style.transform = 'scale(1.08) rotate(5deg)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                      e.currentTarget.style.boxShadow = inputMessage.trim() && !isLoading && quota.remaining > 0
                        ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                        : 'none';
                    }}
                  >
                    {isLoading ? (
                      <Spinner animation="border" size="sm" style={{ color: 'white', borderWidth: '2px' }} />
                    ) : (
                      <HiPaperAirplane size={22} color="white" style={{ transform: 'rotate(-45deg)' }} />
                    )}
                    {inputMessage.trim() && !isLoading && quota.remaining > 0 && (
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
    </>
  );
};

export default StudentChatbot;

