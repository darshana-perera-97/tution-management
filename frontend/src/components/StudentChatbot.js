import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Form, InputGroup, Badge, Spinner } from 'react-bootstrap';
import { HiOutlineChatBubbleLeftRight, HiXMark, HiPaperAirplane } from 'react-icons/hi2';
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

      {/* Chat Window */}
      {isOpen && (
        <Card
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '380px',
            maxWidth: 'calc(100vw - 40px)',
            height: '600px',
            maxHeight: 'calc(100vh - 40px)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            border: 'none',
            overflow: 'hidden'
          }}
        >
          {/* Chat Header */}
          <Card.Header
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <h6 style={{ margin: 0, fontWeight: '600', fontSize: '16px' }}>
                AI Study Assistant
              </h6>
              <small style={{ opacity: 0.9, fontSize: '12px' }}>
                {remainingQuestions} messages remaining
              </small>
            </div>
            <Button
              variant="link"
              onClick={() => setIsOpen(false)}
              style={{
                color: 'white',
                padding: '4px',
                minWidth: 'auto',
                textDecoration: 'none'
              }}
            >
              <HiXMark size={20} />
            </Button>
          </Card.Header>

          {/* Messages Area */}
          <Card.Body
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              background: '#f8f9fa',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Hi! I'm your AI Study Assistant. Ask me anything about your course materials!
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  You have {remainingQuestions} messages remaining today.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: '8px'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      background: message.role === 'user' 
                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                        : 'white',
                      color: message.role === 'user' ? 'white' : '#1e293b',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      wordWrap: 'break-word',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      textAlign: message.role === 'user' ? 'right' : 'left'
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    background: 'white',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <Spinner animation="border" size="sm" style={{ color: '#6366f1' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </Card.Body>

          {/* Input Area */}
          <Card.Footer
            style={{
              border: 'none',
              padding: '12px',
              background: 'white',
              borderTop: '1px solid #e2e8f0'
            }}
          >
            {quota.remaining <= 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '12px',
                background: '#fef2f2',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '13px'
              }}>
                You've reached the daily limit of {quota.limit} messages. Please try again tomorrow.
              </div>
            ) : (
              <Form onSubmit={handleSendMessage}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Type your question..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isLoading || quota.remaining <= 0}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px 0 0 8px',
                      padding: '10px 12px'
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading || quota.remaining <= 0}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      border: 'none',
                      borderRadius: '0 8px 8px 0',
                      padding: '10px 16px'
                    }}
                  >
                    <HiPaperAirplane size={18} />
                  </Button>
                </InputGroup>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <small style={{ color: '#94a3b8', fontSize: '11px' }}>
                    {remainingQuestions} messages left
                  </small>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleClearChat}
                    style={{
                      color: '#64748b',
                      textDecoration: 'none',
                      fontSize: '11px',
                      padding: '0'
                    }}
                  >
                    Clear Chat
                  </Button>
                </div>
              </Form>
            )}
          </Card.Footer>
        </Card>
      )}
    </>
  );
};

export default StudentChatbot;

