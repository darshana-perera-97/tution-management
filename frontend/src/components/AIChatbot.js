import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Alert, Card, Tab, Tabs, Row, Col } from 'react-bootstrap';
import '../App.css';
import API_URL from '../config';

const AIChatbot = () => {
  const [activeTab, setActiveTab] = useState('grade1-5');
  const [contents, setContents] = useState({
    'grade1-5': [],
    'grade6-11': [],
    'grade12-13': []
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewContent, setViewContent] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [combinedText, setCombinedText] = useState('');
  const [processingText, setProcessingText] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState(null);

  useEffect(() => {
    fetchContents();
    fetchCombinedText();
  }, [activeTab]);

  const fetchCombinedText = async () => {
    try {
      setProcessingText(true);
      // Fetch combined text (automatically processed and saved in backend)
      const url = `${API_URL}/api/ai-chatbot/${activeTab}/combined-text`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setCombinedText(data.combinedText || '');
      }
    } catch (err) {
      console.error('Error fetching combined text:', err);
      setCombinedText('');
    } finally {
      setProcessingText(false);
    }
  };

  const fetchContents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ai-chatbot/${activeTab}`);
      const data = await response.json();
      if (data.success) {
        setContents(prev => ({
          ...prev,
          [activeTab]: data.contents || []
        }));
      }
    } catch (err) {
      console.error('Error fetching contents:', err);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setError('');
    setExtractedText('');

    // Basic text extraction for PDF and text files
    if (file.type === 'application/pdf') {
      // For PDF, we'll extract text on the backend
      setExtractedText('PDF file selected. Text will be extracted after upload.');
    } else if (file.type === 'text/plain' || file.type.includes('text/')) {
      // Read text files directly
      const reader = new FileReader();
      reader.onload = (event) => {
        setExtractedText(event.target.result);
      };
      reader.readAsText(file);
    } else if (file.type.includes('word') || file.type.includes('document')) {
      setExtractedText('Document file selected. Text will be extracted after upload.');
    } else {
      setExtractedText('File selected. Text extraction may be limited.');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile || !title.trim()) {
      setError('Please select a file and enter a title');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title);
      formData.append('gradeSection', activeTab);

      const response = await fetch(`${API_URL}/api/ai-chatbot/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Content uploaded successfully!');
        setSelectedFile(null);
        setTitle('');
        setExtractedText('');
        setShowUploadModal(false);
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        await fetchContents();
        // Combined text will be automatically generated and saved in backend
        // Wait a bit for backend to process, then fetch
        setTimeout(async () => {
          await fetchCombinedText();
        }, 2000);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to upload content');
      }
    } catch (err) {
      console.error('Error uploading content:', err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setTitle('');
    setExtractedText('');
    setError('');
    setSuccess('');
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
  };

  const handleViewContent = (content) => {
    setViewContent(content);
    setShowViewModal(true);
  };

  const handleDeleteContent = async (contentId) => {
    if (!window.confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/ai-chatbot/${contentId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Content deleted successfully!');
        await fetchContents();
        // Combined text will be automatically generated and saved in backend
        // Wait a bit for backend to process, then fetch
        setTimeout(async () => {
          await fetchCombinedText();
        }, 2000);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to delete content');
      }
    } catch (err) {
      console.error('Error deleting content:', err);
      setError('Unable to connect to server. Please try again later.');
    }
  };

  const currentContents = contents[activeTab] || [];

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h2 className="dashboard-title">AI Chatbot Content</h2>
            <p className="dashboard-subtitle">
              Manage content separately for each grade section. Each section has its own documents.
            </p>
          </div>
          <Button
            className="add-operator-btn"
            onClick={() => setShowUploadModal(true)}
          >
            + Upload to {activeTab.replace('grade', 'Grade ').replace('-', '-')}
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

      {/* Grade Section Tabs */}
      <Card className="mb-4">
        <Card.Body>
          <div className="mb-3">
            <Alert variant="info" className="mb-0">
              <strong>Note:</strong> Each grade section is independent. Documents uploaded to one section will only appear in that section.
            </Alert>
          </div>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            <Tab eventKey="grade1-5" title={`Grade 1-5 (${contents['grade1-5']?.length || 0})`}>
              <div className="mt-3">
                <p className="text-muted">
                  <strong>Independent section for Grade 1-5 students</strong>
                  <br />
                  Upload and manage documents separately for this grade range.
                </p>
              </div>
            </Tab>
            <Tab eventKey="grade6-11" title={`Grade 6-11 (${contents['grade6-11']?.length || 0})`}>
              <div className="mt-3">
                <p className="text-muted">
                  <strong>Independent section for Grade 6-11 students</strong>
                  <br />
                  Upload and manage documents separately for this grade range.
                </p>
              </div>
            </Tab>
            <Tab eventKey="grade12-13" title={`Grade 12-13 (${contents['grade12-13']?.length || 0})`}>
              <div className="mt-3">
                <p className="text-muted">
                  <strong>Independent section for Grade 12-13 students</strong>
                  <br />
                  Upload and manage documents separately for this grade range.
                </p>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Combined Extracted Content - Full Width First */}
      <Card className="mb-4">
        <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h5 className="mb-0">
                  Combined Extracted Content
                  <span className="badge bg-success ms-2">AI Processed</span>
                </h5>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={fetchCombinedText}
                  disabled={processingText || currentContents.length === 0}
                >
                  {processingText ? 'Processing with AI...' : 'Refresh'}
                </Button>
              </div>
          {currentContents.length === 0 ? (
            <div className="text-center text-muted py-5">
              <p>Upload documents to see extracted content here.</p>
            </div>
          ) : processingText ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Processing content...</p>
            </div>
          ) : (
            <div
              style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '5px',
                minHeight: '300px',
                maxHeight: '500px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                border: '1px solid #dee2e6',
                textAlign: 'left'
              }}
            >
              {combinedText ? (
                <div style={{ textAlign: 'left' }}>
                  <div className="mb-2 text-muted small" style={{ textAlign: 'left' }}>
                    <strong>Total Documents:</strong> {currentContents.length} | 
                    <strong> Characters:</strong> {combinedText.length} |
                    <span className="badge bg-info ms-2">Processed by OpenAI GPT-3.5</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                    {combinedText}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted py-5">
                  <p>No extracted text available. Click "Refresh" to process documents.</p>
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Uploaded Contents - Full Width Below */}
      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
              Uploaded Contents ({currentContents.length})
            </h5>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setShowUploadModal(true)}
            >
              + Add More
            </Button>
          </div>
          {currentContents.length === 0 ? (
            <div className="text-center text-muted py-5">
              <p>No content uploaded yet for this section.</p>
              <p className="small">Click "Upload to {activeTab.replace('grade', 'Grade ').replace('-', '-')}" to add content to this section.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>File Name</th>
                    <th>File Type</th>
                    <th>Uploaded Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentContents.map((content, index) => (
                    <tr 
                      key={content.id}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: selectedContentId === content.id ? '#e7f3ff' : 'inherit'
                      }}
                      onClick={() => setSelectedContentId(content.id === selectedContentId ? null : content.id)}
                    >
                      <td>{index + 1}</td>
                      <td>{content.title}</td>
                      <td>{content.fileName || '-'}</td>
                      <td>{content.fileType || '-'}</td>
                      <td>
                        {content.createdAt
                          ? new Date(content.createdAt).toLocaleString()
                          : '-'}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleViewContent(content)}
                          >
                            View
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteContent(content.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Upload Modal */}
      <Modal
        show={showUploadModal}
        onHide={handleCloseUploadModal}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Upload Content - {activeTab.replace('grade', 'Grade ').replace('-', '-')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <strong>Uploading to:</strong> {activeTab.replace('grade', 'Grade ').replace('-', '-')} section
            <br />
            <small>This document will only be available in this grade section.</small>
          </Alert>
          <Form onSubmit={handleUpload}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter content title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Upload File (PDF, DOC, DOCX, TXT)</Form.Label>
              <Form.Control
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                required
                className="form-control-custom"
              />
              <Form.Text className="text-muted">
                Supported formats: PDF, DOC, DOCX, TXT (Max 50MB)
              </Form.Text>
            </Form.Group>

            {extractedText && (
              <Form.Group className="mb-3">
                <Form.Label>Extracted Text Preview</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={10}
                  value={extractedText}
                  readOnly
                  className="form-control-custom"
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
                <Form.Text className="text-muted">
                  This is a preview of the extracted text. Full extraction will be done on the server.
                </Form.Text>
              </Form.Group>
            )}

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
              <Button variant="secondary" onClick={handleCloseUploadModal} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !selectedFile || !title.trim()}
              >
                {loading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* View Content Modal */}
      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>{viewContent?.title || 'Content Details'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewContent && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Title:</strong> {viewContent.title}
                </Col>
                <Col md={6}>
                  <strong>Grade Section:</strong>{' '}
                  {viewContent.gradeSection?.replace('grade', 'Grade ').replace('-', '-') || '-'}
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>File Name:</strong> {viewContent.fileName || '-'}
                </Col>
                <Col md={6}>
                  <strong>File Type:</strong> {viewContent.fileType || '-'}
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={12}>
                  <strong>Uploaded Date:</strong>{' '}
                  {viewContent.createdAt
                    ? new Date(viewContent.createdAt).toLocaleString()
                    : '-'}
                </Col>
              </Row>
              {viewContent.fileUrl && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong>File:</strong>{' '}
                    <a
                      href={`${API_URL}${viewContent.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View/Download File
                    </a>
                  </Col>
                </Row>
              )}
              {viewContent.extractedText && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong>Extracted Text:</strong>
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '5px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word'
                      }}
                    >
                      {viewContent.extractedText}
                    </div>
                  </Col>
                </Row>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AIChatbot;

