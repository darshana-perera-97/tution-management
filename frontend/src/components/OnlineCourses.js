import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Modal, Form, Alert, Row, Col, Badge } from 'react-bootstrap';
import {
  HiOutlineBookOpen,
  HiOutlineGlobeAlt,
  HiOutlinePencil,
  HiOutlinePaperAirplane,
  HiOutlineLink,
  HiOutlineVideoCamera,
  HiOutlinePlus,
  HiOutlineXMark,
} from 'react-icons/hi2';
import '../App.css';
import API_URL from '../config';

const OnlineCourses = () => {
  const [courses, setCourses] = useState([]);
  const [onlineCourses, setOnlineCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [formData, setFormData] = useState({
    onlineDetails: '',
    classwork: '',
    classGroupLink: '',
    videoRecordingLinks: [],
  });
  const [notificationMessage, setNotificationMessage] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');

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
    setFormData({
      onlineDetails: course.onlineDetails || '',
      classwork: course.classwork || '',
      classGroupLink: course.classGroupLink || '',
      videoRecordingLinks: Array.isArray(course.videoRecordingLinks) ? [...course.videoRecordingLinks] : [],
    });
    setNotificationMessage('');
    setNewVideoUrl('');
    setShowManageModal(true);
    setError('');
    setSuccess('');
  };

  const closeManage = () => {
    setShowManageModal(false);
    setSelectedCourse(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
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
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Course details saved successfully.');
        setSelectedCourse({ ...selectedCourse, ...formData });
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
    e.preventDefault();
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
      } else {
        setError(data.message || 'Failed to send notification');
      }
    } catch (err) {
      setError('Failed to send notification.');
    } finally {
      setSendingNotification(false);
    }
  };

  const addVideoLink = () => {
    const url = (newVideoUrl || '').trim();
    if (!url) return;
    if (!formData.videoRecordingLinks.includes(url)) {
      setFormData((prev) => ({
        ...prev,
        videoRecordingLinks: [...prev.videoRecordingLinks, url],
      }));
      setNewVideoUrl('');
    }
  };

  const removeVideoLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      videoRecordingLinks: prev.videoRecordingLinks.filter((_, i) => i !== index),
    }));
  };

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
                <Card.Body style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <HiOutlineBookOpen style={{ fontSize: '20px', color: '#6366f1' }} />
                    <Badge
                      style={{
                        background: getModeLabel(course.mode) === 'Hybrid' ? '#e0e7ff' : '#dbeafe',
                        color: getModeLabel(course.mode) === 'Hybrid' ? '#4338ca' : '#1d4ed8',
                        border: 'none',
                        fontSize: '11px',
                      }}
                    >
                      {getModeLabel(course.mode)}
                    </Badge>
                  </div>
                  <h6 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>
                    {course.courseName}
                  </h6>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    {course.subject} • {course.grade}
                  </p>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="mt-3 w-100"
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

      <Modal show={showManageModal} onHide={closeManage} size="lg" centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedCourse?.courseName} — Online / Hybrid
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label>
                <HiOutlineBookOpen style={{ marginRight: '6px' }} />
                Course details (description for students)
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.onlineDetails}
                onChange={(e) => setFormData((p) => ({ ...p, onlineDetails: e.target.value }))}
                placeholder="e.g. What this course covers, how classes are conducted..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                <HiOutlinePencil style={{ marginRight: '6px' }} />
                Classwork
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.classwork}
                onChange={(e) => setFormData((p) => ({ ...p, classwork: e.target.value }))}
                placeholder="Assignments, notes, or classwork instructions..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                <HiOutlineLink style={{ marginRight: '6px' }} />
                Class group link (WhatsApp / Google Classroom / etc.)
              </Form.Label>
              <Form.Control
                type="url"
                value={formData.classGroupLink}
                onChange={(e) => setFormData((p) => ({ ...p, classGroupLink: e.target.value }))}
                placeholder="https://..."
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>
                <HiOutlineVideoCamera style={{ marginRight: '6px' }} />
                Video recording links (YouTube)
              </Form.Label>
              <div className="d-flex gap-2 mb-2">
                <Form.Control
                  type="url"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="Paste YouTube link"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVideoLink())}
                />
                <Button type="button" variant="outline-primary" onClick={addVideoLink}>
                  <HiOutlinePlus /> Add
                </Button>
              </div>
              {formData.videoRecordingLinks.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {formData.videoRecordingLinks.map((url, index) => (
                    <li
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        marginBottom: '6px',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                        {url}
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="text-danger p-0"
                        onClick={() => removeVideoLink(index)}
                      >
                        <HiOutlineXMark />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Form.Group>

            <hr />

            <h6 className="mb-2">
              <HiOutlinePaperAirplane style={{ marginRight: '6px' }} />
              Send notification to enrolled students
            </h6>
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={2}
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Type a message to send via WhatsApp to all enrolled students..."
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="mt-2"
                onClick={handleSendNotification}
                disabled={!notificationMessage.trim() || sendingNotification}
              >
                {sendingNotification ? 'Sending...' : 'Send notification'}
              </Button>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="secondary" onClick={closeManage}>
                Close
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save course details'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default OnlineCourses;
