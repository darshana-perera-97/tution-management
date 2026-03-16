import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Row, Col, Badge, Nav, Tab, Modal, Table } from 'react-bootstrap';
import {
  HiOutlineBookOpen,
  HiOutlineGlobeAlt,
  HiOutlinePencil,
  HiOutlinePaperAirplane,
  HiOutlineLink,
  HiOutlineVideoCamera,
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineArrowLeft,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentList,
} from 'react-icons/hi2';
import '../App.css';
import API_URL from '../config';

const OnlineCourses = () => {
  const [courses, setCourses] = useState([]);
  const [onlineCourses, setOnlineCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [formData, setFormData] = useState({
    onlineDetails: '',
    classwork: '',
    classGroupLink: '',
    videoRecordingLinks: [],
    meetingLinks: [],
  });
  const [notificationMessage, setNotificationMessage] = useState('');
  const [activeTab, setActiveTab] = useState('calendar');
  const [extraClasses, setExtraClasses] = useState([]);
  const [lmsContent, setLmsContent] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskSubmissions, setTaskSubmissions] = useState({});
  const [showMeetingLinkModal, setShowMeetingLinkModal] = useState(false);
  const [editingMeetingLink, setEditingMeetingLink] = useState(null);
  const [meetingLinkForm, setMeetingLinkForm] = useState({
    label: '',
    url: '',
    scheduleLabel: '',
    meetingDate: '',
    meetingTime: '',
    linkType: 'usual', // 'usual' | 'extra'
  });
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({ url: '', title: '', description: '' });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '' });
  const [taskAttachment, setTaskAttachment] = useState(null);
  const [studyMaterialFile, setStudyMaterialFile] = useState(null);
  const [studyMaterialTitle, setStudyMaterialTitle] = useState('');
  const [studyMaterialType, setStudyMaterialType] = useState('pdf');
  const [showStudyMaterialModal, setShowStudyMaterialModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState(null);
  const [courseNotifications, setCourseNotifications] = useState([]);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedTaskForSubmissions, setSelectedTaskForSubmissions] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const isOnlineOrHybrid = (mode) => {
    const m = (mode || '').toLowerCase();
    return m === 'online' || m === 'hybrid';
  };
  const getModeLabel = (mode) => {
    const m = (mode || '').toLowerCase();
    return m === 'online' ? 'Online' : m === 'hybrid' ? 'Hybrid' : 'Physical';
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/courses`);
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses || []);
        const online = (data.courses || []).filter((c) => isOnlineOrHybrid(c.mode));
        setOnlineCourses(online);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const openManage = (course) => {
    setSelectedCourse(course);
    const vLinks = Array.isArray(course.videoRecordingLinks) ? course.videoRecordingLinks : [];
    const normalizedV = vLinks.map((item, i) => typeof item === 'string' ? { id: `v${i}`, url: item, title: '', description: '' } : { ...item, id: item.id || `v${i}` });
    setFormData({
      onlineDetails: course.onlineDetails || '',
      classwork: course.classwork || '',
      classGroupLink: course.classGroupLink || '',
      videoRecordingLinks: normalizedV,
      meetingLinks: Array.isArray(course.meetingLinks) ? [...course.meetingLinks] : [],
    });
    setNotificationMessage('');
    setCourseNotifications([]);
    setActiveTab('calendar');
    setError('');
    setSuccess('');
  };

  useEffect(() => {
    if (!selectedCourse) return;
    const cid = selectedCourse.id;
    fetch(`${API_URL}/api/extra-classes?courseId=${cid}`).then(r => r.json()).then(d => d.success && setExtraClasses(d.extraClasses || [])).catch(() => setExtraClasses([]));
    fetch(`${API_URL}/api/courses/${cid}/lms`).then(r => r.json()).then(d => d.success && setLmsContent(d.content || [])).catch(() => setLmsContent([]));
    fetch(`${API_URL}/api/courses/${cid}/tasks`).then(r => r.json()).then(d => d.success && setTasks(d.tasks || [])).catch(() => setTasks([]));
    fetch(`${API_URL}/api/courses/${cid}/notifications`).then(r => r.json()).then(d => d.success && setCourseNotifications(d.notifications || [])).catch(() => setCourseNotifications([]));
  }, [selectedCourse?.id]);

  useEffect(() => {
    if (!selectedCourse || tasks.length === 0) return;
    tasks.forEach(t => {
      fetch(`${API_URL}/api/courses/${selectedCourse.id}/tasks/${t.id}/submissions`)
        .then(r => r.json())
        .then(d => { if (d.success) setTaskSubmissions(prev => ({ ...prev, [t.id]: d.submissions || [] })); })
        .catch(() => {});
    });
  }, [selectedCourse?.id, tasks]);

  useEffect(() => {
    const len = formData.meetingLinks.length;
    if (len === 0) setSelectedMeetingIndex(null);
    else if (selectedMeetingIndex === null || selectedMeetingIndex >= len) setSelectedMeetingIndex(0);
  }, [formData.meetingLinks.length]);

  const closeManage = () => {
    setSelectedCourse(null);
  };

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!selectedCourse) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_URL}/api/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onlineDetails: formData.onlineDetails,
          classwork: formData.classwork,
          classGroupLink: formData.classGroupLink,
          videoRecordingLinks: formData.videoRecordingLinks,
          meetingLinks: formData.meetingLinks,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Course details saved successfully.');
        setSelectedCourse(prev => prev ? { ...prev, ...formData } : null);
        fetchCourses();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to save');
      }
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotification = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!selectedCourse || !notificationMessage.trim()) return;
    setSendingNotification(true);
    setError('');
    setSuccess('');
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('message', notificationMessage.trim());
      const response = await fetch(
        `${API_URL}/api/courses/${selectedCourse.id}/bulk-message`,
        { method: 'POST', body: formDataToSend }
      );
      const data = await response.json();
      if (data.success) {
        setSuccess('Notification sent to enrolled students.');
        setNotificationMessage('');
        setTimeout(() => setSuccess(''), 3000);
        // refresh last notifications
        fetch(`${API_URL}/api/courses/${selectedCourse.id}/notifications`)
          .then(r => r.json())
          .then(d => d.success && setCourseNotifications(d.notifications || []))
          .catch(() => {});
      } else {
        setError(data.message || 'Failed to send notification');
      }
    } catch (err) {
      setError('Failed to send notification.');
    } finally {
      setSendingNotification(false);
    }
  };

  const persistMeetingLinks = async (links) => {
    if (!selectedCourse) return;
    try {
      await fetch(`${API_URL}/api/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingLinks: links }),
      });
    } catch (e) {
      // silent fail; main save still available on other tabs
    }
  };

  const persistVideoLinks = async (links) => {
    if (!selectedCourse) return;
    try {
      await fetch(`${API_URL}/api/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoRecordingLinks: links }),
      });
    } catch (e) {
      // ignore auto-save errors
    }
  };

  const saveMeetingLink = () => {
    const { label, url, scheduleLabel, meetingDate, meetingTime, linkType } = meetingLinkForm;
    if (!url.trim()) return;
    const type = linkType === 'extra' ? 'extra' : 'usual';
    let nextLinks;
    if (editingMeetingLink !== null) {
      nextLinks = formData.meetingLinks.map((m, i) =>
        i === editingMeetingLink
          ? {
              ...m,
              label: label.trim(),
              url: url.trim(),
              scheduleLabel: scheduleLabel.trim(),
              meetingDate: meetingDate || '',
              meetingTime: meetingTime || '',
              linkType: type,
            }
          : m
      );
      setEditingMeetingLink(null);
    } else {
      nextLinks = [
        ...formData.meetingLinks,
        {
          id: `m${Date.now()}`,
          label: label.trim(),
          url: url.trim(),
          scheduleLabel: scheduleLabel.trim(),
          meetingDate: meetingDate || '',
          meetingTime: meetingTime || '',
          linkType: type,
        },
      ];
    }
    setFormData(prev => ({ ...prev, meetingLinks: nextLinks }));
    persistMeetingLinks(nextLinks);
    setMeetingLinkForm({
      label: '',
      url: '',
      scheduleLabel: '',
      meetingDate: '',
      meetingTime: '',
      linkType: 'usual',
    });
    setShowMeetingLinkModal(false);
  };

  const removeMeetingLink = (index) => {
    const nextLinks = formData.meetingLinks.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, meetingLinks: nextLinks }));
    persistMeetingLinks(nextLinks);
    setSelectedMeetingIndex(prev => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const saveVideo = () => {
    const { url, title, description } = videoForm;
    if (!url.trim()) return;
    let nextLinks;
    if (editingVideo !== null) {
      nextLinks = formData.videoRecordingLinks.map((v, i) =>
        i === editingVideo ? { ...v, url: url.trim(), title: title.trim(), description: description.trim() } : v
      );
      setEditingVideo(null);
    } else {
      nextLinks = [
        ...formData.videoRecordingLinks,
        { id: `v${Date.now()}`, url: url.trim(), title: title.trim(), description: description.trim() },
      ];
    }
    setFormData(prev => ({ ...prev, videoRecordingLinks: nextLinks }));
    persistVideoLinks(nextLinks);
    setVideoForm({ url: '', title: '', description: '' });
    setShowVideoModal(false);
  };

  const removeVideo = (index) => {
    const nextLinks = formData.videoRecordingLinks.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, videoRecordingLinks: nextLinks }));
    persistVideoLinks(nextLinks);
  };

  const addTask = async () => {
    if (!taskForm.title.trim() || !selectedCourse) return;
    try {
      const form = new FormData();
      form.append('title', taskForm.title.trim());
      form.append('description', taskForm.description || '');
      form.append('dueDate', taskForm.dueDate || '');
      if (taskAttachment) {
        form.append('attachment', taskAttachment);
      }
      const res = await fetch(`${API_URL}/api/courses/${selectedCourse.id}/tasks`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => [...prev, data.task]);
        setTaskForm({ title: '', description: '', dueDate: '' });
        setTaskAttachment(null);
        setShowTaskModal(false);
        setSuccess('Task added.');
        setTimeout(() => setSuccess(''), 2000);
      } else setError(data.message || 'Failed to add task');
    } catch (err) {
      setError('Failed to add task');
    }
  };

  const deleteTask = async (taskId) => {
    if (!selectedCourse || !window.confirm('Delete this task?')) return;
    try {
      const res = await fetch(`${API_URL}/api/courses/${selectedCourse.id}/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setSuccess('Task deleted.');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError('Failed to delete task');
    }
  };

  const uploadStudyMaterial = async () => {
    if (!selectedCourse || !studyMaterialTitle.trim() || !studyMaterialFile) return;
    setUploadingMaterial(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('type', studyMaterialType);
      fd.append('title', studyMaterialTitle.trim());
      fd.append('file', studyMaterialFile);
      const res = await fetch(`${API_URL}/api/courses/${selectedCourse.id}/lms`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setLmsContent(prev => [...prev, data.content]);
        setStudyMaterialTitle('');
        setStudyMaterialFile(null);
        setSuccess('Material uploaded.');
        setTimeout(() => setSuccess(''), 2000);
      } else setError(data.message || 'Upload failed');
    } catch (err) {
      setError('Upload failed');
    } finally {
      setUploadingMaterial(false);
    }
  };

  const deleteLmsContent = async (contentId) => {
    if (!selectedCourse || !window.confirm('Remove this material?')) return;
    try {
      const res = await fetch(`${API_URL}/api/courses/${selectedCourse.id}/lms/${contentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setLmsContent(prev => prev.filter(c => c.id !== contentId));
        setSuccess('Removed.');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError('Failed to remove');
    }
  };

  const fetchSubmissionsForTask = (taskId) => {
    if (!selectedCourse) return;
    fetch(`${API_URL}/api/courses/${selectedCourse.id}/tasks/${taskId}/submissions`).then(r => r.json()).then(d => {
      if (d.success) setTaskSubmissions(prev => ({ ...prev, [taskId]: d.submissions || [] }));
    }).catch(() => {});
  };

  // —— Detail page (tabbed) when a course is selected ——
  if (selectedCourse) {
    return (
      <div style={{ textAlign: 'left' }}>
        <Button
          variant="link"
          className="p-0 mb-3"
          onClick={closeManage}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#6366f1',
            fontWeight: '600',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          <HiOutlineArrowLeft size={20} />
          Back to Online Courses
        </Button>

        <Card style={{ border: 'none', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '24px' }}>
          <Card.Body style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>
                {selectedCourse.courseName}
              </h2>
              <Badge
                style={{
                  background: getModeLabel(selectedCourse.mode) === 'Hybrid' ? '#a5b4fc' : '#7dd3fc',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  padding: '4px 10px',
                  fontWeight: '600',
                }}
              >
                {getModeLabel(selectedCourse.mode)}
              </Badge>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                {selectedCourse.subject} • {selectedCourse.grade}
              </span>
            </div>
          </Card.Body>
        </Card>

        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

        <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
          <Card style={{ border: 'none', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '0 16px', background: 'transparent' }}>
              <Nav variant="tabs" style={{ borderBottom: 'none', background: 'transparent' }}>
                {['calendar', 'notifications', 'materials', 'videos', 'classwork'].map((key, i) => (
                  <Nav.Item key={key}>
                    <Nav.Link eventKey={key} style={{ border: 'none', borderBottom: activeTab === key ? '3px solid #6366f1' : '3px solid transparent', color: activeTab === key ? '#6366f1' : '#64748b', fontWeight: 600, padding: '14px 16px' }}>
                      {key === 'calendar' && <><HiOutlineCalendar style={{ marginRight: '6px', verticalAlign: 'middle' }} />Calendar</>}
                      {key === 'notifications' && <><HiOutlinePaperAirplane style={{ marginRight: '6px', verticalAlign: 'middle' }} />Notifications</>}
                      {key === 'materials' && <><HiOutlineDocumentText style={{ marginRight: '6px', verticalAlign: 'middle' }} />Study Materials</>}
                      {key === 'videos' && <><HiOutlineVideoCamera style={{ marginRight: '6px', verticalAlign: 'middle' }} />Video Recording</>}
                      {key === 'classwork' && <><HiOutlineClipboardDocumentList style={{ marginRight: '6px', verticalAlign: 'middle' }} />Classwork</>}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
            </div>

            <Card.Body style={{ padding: '24px', textAlign: 'left' }}>
              <Tab.Content>
                <Tab.Pane eventKey="calendar">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <h5 style={{ fontWeight: '600', margin: 0 }}>Class times &amp; meeting links</h5>
                    <Button
                      size="sm"
                      variant="primary"
                      className="add-operator-btn"
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => {
                        setEditingMeetingLink(null);
                        setMeetingLinkForm({
                          label: '',
                          url: '',
                          scheduleLabel: '',
                          meetingDate: '',
                          meetingTime: '',
                          linkType: 'usual',
                        });
                        setShowMeetingLinkModal(true);
                      }}
                    >
                      <HiOutlinePlus style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      Add Meeting Links
                    </Button>
                  </div>
                  <Row>
                    <Col md={5}>
                      {formData.meetingLinks.length === 0 ? (
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>No meeting links. Use &quot;Add Meeting Links&quot; above.</p>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {formData.meetingLinks.map((m, i) => (
                            <li key={m.id || i}>
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedMeetingIndex(i)}
                                onKeyDown={(e) => e.key === 'Enter' && setSelectedMeetingIndex(i)}
                                style={{
                                  padding: '12px 14px',
                                  marginBottom: '8px',
                                  borderRadius: '10px',
                                  border: selectedMeetingIndex === i ? '2px solid #6366f1' : '1px solid #e2e8f0',
                                  background: selectedMeetingIndex === i ? '#eef2ff' : '#f8fafc',
                                  cursor: 'pointer',
                                }}
                              >
                                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{m.label || 'Link'}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '13px', color: '#64748b' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: m.linkType === 'extra' ? '#fef3c7' : '#e0e7ff',
                                    color: m.linkType === 'extra' ? '#92400e' : '#3730a3',
                                    fontWeight: '500',
                                  }}>
                                    {m.linkType === 'extra' ? 'Extra clz' : 'Usual class'}
                                  </span>
                                  {m.meetingDate && <span>{m.meetingDate}</span>}
                                  {m.meetingTime && <span>{m.meetingTime}</span>}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Col>
                    <Col md={7}>
                      <h6 style={{ fontWeight: '600', marginBottom: '10px', color: '#64748b' }}>Details</h6>
                      {formData.meetingLinks.length === 0 ? (
                        <Card style={{ border: '1px solid #e2e8f0' }}>
                          <Card.Body>
                            <p style={{ margin: 0, color: '#94a3b8' }}>No meeting links. Add one using &quot;Add Meeting Links&quot; to see details here.</p>
                          </Card.Body>
                        </Card>
                      ) : selectedMeetingIndex === null ? (
                        <Card style={{ border: '1px solid #e2e8f0' }}>
                          <Card.Body>
                            <p style={{ margin: 0, color: '#94a3b8' }}>Select a meeting link from the list to view details.</p>
                          </Card.Body>
                        </Card>
                      ) : (() => {
                        const m = formData.meetingLinks[selectedMeetingIndex];
                        return (
                          <Card style={{ border: '1px solid #e2e8f0' }}>
                            <Card.Body>
                              <div style={{ marginBottom: '14px' }}>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: m.linkType === 'extra' ? '#fef3c7' : '#e0e7ff',
                                  color: m.linkType === 'extra' ? '#92400e' : '#3730a3',
                                  fontWeight: '600',
                                  fontSize: '13px',
                                }}>
                                  {m.linkType === 'extra' ? 'Extra clz' : 'Usual class'}
                                </span>
                              </div>
                              <p style={{ marginBottom: '8px' }}><strong>Label:</strong> {m.label || '—'}</p>
                              <p style={{ marginBottom: '8px' }}><strong>Date:</strong> {m.meetingDate || '—'}</p>
                              <p style={{ marginBottom: '8px' }}><strong>Time:</strong> {m.meetingTime || '—'}</p>
                              {m.scheduleLabel ? <p style={{ marginBottom: '8px' }}><strong>Schedule note:</strong> {m.scheduleLabel}</p> : null}
                              <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  as="a"
                                  href={m.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Join Class
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-secondary"
                                  onClick={() => {
                                    if (m.url) {
                                      navigator.clipboard?.writeText(m.url).catch(() => {});
                                    }
                                  }}
                                >
                                  Copy Link
                                </Button>
                              </div>
                              <div>
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  className="me-2"
                                  onClick={() => {
                                    setEditingMeetingLink(selectedMeetingIndex);
                                    setMeetingLinkForm({
                                      label: m.label || '',
                                      url: m.url || '',
                                      scheduleLabel: m.scheduleLabel || '',
                                      meetingDate: m.meetingDate || '',
                                      meetingTime: m.meetingTime || '',
                                      linkType: m.linkType === 'extra' ? 'extra' : 'usual',
                                    });
                                    setShowMeetingLinkModal(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button size="sm" variant="outline-danger" onClick={() => removeMeetingLink(selectedMeetingIndex)}>
                                  Remove
                                </Button>
                              </div>
                            </Card.Body>
                          </Card>
                        );
                      })()}
                    </Col>
                  </Row>
                </Tab.Pane>

                <Tab.Pane eventKey="notifications">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <Form.Label style={{ fontWeight: '600', color: '#1e293b', marginBottom: 0 }}>Send Notifications</Form.Label>
                      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: 0 }}>e.g. online class link, reminders, announcements.</p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="add-operator-btn"
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => {
                        setNotificationMessage('');
                        setShowNotificationModal(true);
                      }}
                    >
                      <HiOutlinePaperAirplane style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      Send New Notification
                    </Button>
                  </div>
                  <h6 style={{ fontWeight: '600', marginBottom: '8px', color: '#64748b', marginTop: '12px' }}>Last 10 notifications</h6>
                  {courseNotifications.length === 0 ? (
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>No notifications sent yet for this course.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '260px', overflowY: 'auto' }}>
                      {courseNotifications.map((n) => (
                        <li key={n.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', marginBottom: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                            {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                          </div>
                          <div style={{ fontSize: '13px', color: '#0f172a', whiteSpace: 'pre-wrap' }}>
                            {n.message}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Tab.Pane>

                <Tab.Pane eventKey="materials">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <h5 style={{ fontWeight: '600', margin: 0 }}>PDFs &amp; documents</h5>
                    <Button
                      variant="primary"
                      size="sm"
                      className="add-operator-btn"
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => {
                        setStudyMaterialTitle('');
                        setStudyMaterialType('pdf');
                        setStudyMaterialFile(null);
                        setShowStudyMaterialModal(true);
                      }}
                    >
                      <HiOutlinePlus /> Add Study Material
                    </Button>
                  </div>
                  {lmsContent.filter(c => c.type === 'pdf' || c.type === 'doc').length === 0 ? <p style={{ color: '#94a3b8' }}>No study materials yet. Upload PDF or Word documents for students to download.</p> : (
                    <Table responsive size="sm" style={{ margin: 0 }}>
                      <thead><tr><th>Title</th><th>Type</th><th>Added</th><th></th></tr></thead>
                      <tbody>
                        {lmsContent.filter(c => c.type === 'pdf' || c.type === 'doc').map(c => (
                          <tr key={c.id}>
                            <td>{c.title}</td>
                            <td>{c.type}</td>
                            <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</td>
                            <td><a href={`${API_URL}${c.fileUrl}`} target="_blank" rel="noopener noreferrer" className="me-2">Download</a><Button variant="link" size="sm" className="text-danger p-0" onClick={() => deleteLmsContent(c.id)}>Remove</Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Tab.Pane>

                <Tab.Pane eventKey="videos">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <h5 style={{ fontWeight: '600', margin: 0 }}>Video recordings</h5>
                    <Button
                      variant="primary"
                      size="sm"
                      className="add-operator-btn"
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => { setEditingVideo(null); setVideoForm({ url: '', title: '', description: '' }); setShowVideoModal(true); }}>
                      <HiOutlinePlus /> Add video link
                    </Button>
                  </div>
                  {formData.videoRecordingLinks.length === 0 ? <p style={{ color: '#94a3b8' }}>No video recordings. Add YouTube links with title and description.</p> : (
                    <Row className="g-3">
                      {formData.videoRecordingLinks.map((v, i) => (
                        <Col md={6} key={v.id || i}>
                          <Card style={{ border: '1px solid #e2e8f0' }}>
                            <Card.Body>
                              <h6 style={{ marginBottom: '4px' }}>{v.title || 'Video'}</h6>
                              {v.description && <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>{v.description}</p>}
                              <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', wordBreak: 'break-all' }}>{v.url}</a>
                              <div style={{ marginTop: '10px' }}>
                                <Button
                                  size="sm"
                                  variant="outline-secondary"
                                  className="me-1"
                                  onClick={() => {
                                    setEditingVideo(i);
                                    setVideoForm({ url: v.url || '', title: v.title || '', description: v.description || '' });
                                    setShowVideoModal(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() => {
                                    if (window.confirm('Remove this video recording?')) {
                                      removeVideo(i);
                                    }
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Tab.Pane>

                <Tab.Pane eventKey="classwork">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <h5 style={{ fontWeight: '600', margin: 0 }}>Classwork &amp; tasks</h5>
                    <Button
                      variant="primary"
                      size="sm"
                      className="add-operator-btn"
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => { setTaskForm({ title: '', description: '', dueDate: '' }); setShowTaskModal(true); }}>
                      <HiOutlinePlus /> Add new Task
                    </Button>
                  </div>
                  {tasks.length === 0 ? <p style={{ color: '#94a3b8' }}>No tasks yet. Add homework or tasks; students can upload submissions (image, PDF, doc).</p> : (
                    <Row className="g-3">
                      {tasks.map((t) => (
                        <Col md={6} lg={4} key={t.id}>
                          <Card style={{ border: '1px solid #e2e8f0' }}>
                            <Card.Body>
                              <h6 style={{ marginBottom: '4px' }}>{t.title}</h6>
                              {t.description && <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>{t.description}</p>}
                              {t.dueDate && <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Due: {t.dueDate}</p>}
                              <Button
                                size="sm"
                                variant="outline-primary"
                                className="me-1"
                                onClick={() => {
                                  fetchSubmissionsForTask(t.id);
                                  setSelectedTaskForSubmissions(t);
                                  setShowSubmissionsModal(true);
                                }}
                              >
                                View submissions
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => deleteTask(t.id)}>Delete</Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Tab.Pane>
              </Tab.Content>
            </Card.Body>
          </Card>
        </Tab.Container>

        <Modal show={showMeetingLinkModal} onHide={() => setShowMeetingLinkModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editingMeetingLink !== null ? 'Edit' : 'Add'} meeting link</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={meetingLinkForm.linkType}
                onChange={(e) => setMeetingLinkForm(prev => ({ ...prev, linkType: e.target.value }))}
              >
                <option value="usual">Ussual Class</option>
                <option value="extra">Extra class</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Label</Form.Label>
              <Form.Control
                value={meetingLinkForm.label}
                onChange={(e) => setMeetingLinkForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g. Weekly class"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Meeting date</Form.Label>
              <Form.Control
                type="date"
                value={meetingLinkForm.meetingDate}
                onChange={(e) => setMeetingLinkForm(prev => ({ ...prev, meetingDate: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Meeting time</Form.Label>
              <Form.Control
                type="time"
                value={meetingLinkForm.meetingTime}
                onChange={(e) => setMeetingLinkForm(prev => ({ ...prev, meetingTime: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>URL</Form.Label>
              <Form.Control
                type="url"
                value={meetingLinkForm.url}
                onChange={(e) => setMeetingLinkForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Schedule note (optional)</Form.Label>
              <Form.Control
                value={meetingLinkForm.scheduleLabel}
                onChange={(e) => setMeetingLinkForm(prev => ({ ...prev, scheduleLabel: e.target.value }))}
                placeholder="e.g. Every Monday 7.00pm"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowMeetingLinkModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveMeetingLink}>Save</Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showStudyMaterialModal} onHide={() => setShowStudyMaterialModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Add Study Material</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={studyMaterialTitle}
                onChange={(e) => setStudyMaterialTitle(e.target.value)}
                placeholder="e.g. Chapter 1 Notes"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={studyMaterialType}
                onChange={(e) => setStudyMaterialType(e.target.value)}
              >
                <option value="pdf">PDF</option>
                <option value="doc">Word/Doc</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>File</Form.Label>
              <Form.Control
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setStudyMaterialFile(e.target.files?.[0] || null)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowStudyMaterialModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                await uploadStudyMaterial();
                setShowStudyMaterialModal(false);
              }}
              disabled={!studyMaterialTitle.trim() || !studyMaterialFile || uploadingMaterial}
            >
              {uploadingMaterial ? 'Uploading...' : 'Upload'}
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showNotificationModal} onHide={() => setShowNotificationModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Send Notification</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Type your message (e.g. online class link, reminder)..."
                style={{ textAlign: 'left' }}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNotificationModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                await handleSendNotification();
                setShowNotificationModal(false);
              }}
              disabled={!notificationMessage.trim() || sendingNotification}
            >
              {sendingNotification ? 'Sending...' : 'Send Notifications'}
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showVideoModal} onHide={() => setShowVideoModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editingVideo !== null ? 'Edit' : 'Add'} video recording</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2"><Form.Label>YouTube URL</Form.Label><Form.Control type="url" value={videoForm.url} onChange={(e) => setVideoForm(prev => ({ ...prev, url: e.target.value }))} placeholder="https://youtube.com/..." /></Form.Group>
            <Form.Group className="mb-2"><Form.Label>Title</Form.Label><Form.Control value={videoForm.title} onChange={(e) => setVideoForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Week 1 – Introduction" /></Form.Group>
            <Form.Group className="mb-2"><Form.Label>Description (optional)</Form.Label><Form.Control as="textarea" rows={2} value={videoForm.description} onChange={(e) => setVideoForm(prev => ({ ...prev, description: e.target.value }))} /></Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowVideoModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveVideo}>Save</Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showTaskModal} onHide={() => setShowTaskModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Add new Task</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Homework 1"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Description (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Due date (optional)</Form.Label>
              <Form.Control
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Attach document (optional)</Form.Label>
              <Form.Control
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(e) => setTaskAttachment(e.target.files?.[0] || null)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowTaskModal(false); setTaskAttachment(null); }}>Cancel</Button>
            <Button variant="primary" onClick={addTask} disabled={!taskForm.title.trim()}>Add Task</Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={showSubmissionsModal}
          onHide={() => {
            setShowSubmissionsModal(false);
            setSelectedTaskForSubmissions(null);
          }}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {selectedTaskForSubmissions ? `Submissions – ${selectedTaskForSubmissions.title}` : 'Submissions'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ textAlign: 'left' }}>
            {selectedTaskForSubmissions && (taskSubmissions[selectedTaskForSubmissions.id] || []).length > 0 ? (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span style={{ fontSize: '14px', color: '#64748b' }}>
                    Total submissions: {(taskSubmissions[selectedTaskForSubmissions.id] || []).length}
                  </span>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => {
                      const subs = taskSubmissions[selectedTaskForSubmissions.id] || [];
                      subs.forEach((s) => {
                        if (s.fileUrl) {
                          const url = `${API_URL}${s.fileUrl}`;
                          window.open(url, '_blank');
                        }
                      });
                    }}
                  >
                    Download all
                  </Button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <Table striped bordered hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>File</th>
                        <th>Submitted at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(taskSubmissions[selectedTaskForSubmissions.id] || []).map((s, index) => (
                        <tr key={s.id}>
                          <td>{index + 1}</td>
                          <td>{s.studentName || s.studentId || '-'}</td>
                          <td>
                            {s.fileUrl ? (
                              <a
                                href={`${API_URL}${s.fileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {s.fileName || 'File'}
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            {s.submittedAt
                              ? new Date(s.submittedAt).toLocaleString()
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: '#94a3b8' }}>No submissions for this task yet.</p>
            )}
          </Modal.Body>
        </Modal>
      </div>
    );
  }

  // —— List view: cards ——
  return (
    <>
      <div className="dashboard-header mb-4" style={{ textAlign: 'left' }}>
        <h2 className="dashboard-title">Online Courses</h2>
        <p className="dashboard-subtitle" style={{ textAlign: 'left' }}>
          Manage details, classwork, group link, and video recordings for online and hybrid courses.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          Loading...
        </div>
      ) : onlineCourses.length === 0 ? (
        <Card style={{ border: 'none', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Card.Body style={{ textAlign: 'center', padding: '60px 24px' }}>
            <HiOutlineGlobeAlt style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px' }} />
            <p style={{ margin: 0, color: '#64748b' }}>No online or hybrid courses. Create a course and set its mode to Online or Hybrid in Courses.</p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {onlineCourses.map((course) => (
            <Col key={course.id} xs={12} sm={6} md={4} lg={3}>
              <Card
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: '#fff',
                  textAlign: 'left',
                }}
                onClick={() => openManage(course)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.12)';
                  e.currentTarget.style.borderColor = '#6366f1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <Card.Body style={{ padding: '20px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <HiOutlineBookOpen style={{ fontSize: '20px', color: '#6366f1' }} />
                    <Badge
                      style={{
                        background: getModeLabel(course.mode) === 'Hybrid' ? '#a5b4fc' : '#7dd3fc',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11px',
                        padding: '4px 10px',
                        fontWeight: '600',
                      }}
                    >
                      {getModeLabel(course.mode)}
                    </Badge>
                  </div>
                  <h6 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600', color: '#1e293b', textAlign: 'left' }}>
                    {course.courseName}
                  </h6>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b', textAlign: 'left' }}>
                    {course.subject} • {course.grade}
                  </p>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="mt-3"
                    style={{ textAlign: 'left' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openManage(course);
                    }}
                  >
                    <HiOutlinePencil style={{ marginRight: '6px' }} />
                    Manage
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </>
  );
};

export default OnlineCourses;
