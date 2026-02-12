import React, { useState, useEffect, useRef } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import '../App.css';
import API_URL from '../config';

const WhatsAppLink = () => {
  const [qrCode, setQrCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [phoneNumber, setPhoneNumber] = useState('');
  const qrRefreshInterval = useRef(null);

  useEffect(() => {
    checkConnectionStatus();
    // Check connection status every 5 seconds
    const statusInterval = setInterval(checkConnectionStatus, 5000);
    
    return () => {
      clearInterval(statusInterval);
      if (qrRefreshInterval.current) {
        clearInterval(qrRefreshInterval.current);
      }
    };
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/status`);
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(data.connected);
        setConnectionStatus(data.connected ? 'connected' : 'disconnected');
        if (data.connected && data.phoneNumber) {
          setPhoneNumber(data.phoneNumber);
        }
      }
    } catch (err) {
      console.error('Error checking WhatsApp status:', err);
    }
  };

  const generateQRCode = async () => {
    try {
      setIsLoading(true);
      setError('');
      setConnectionStatus('connecting');
      
      const response = await fetch(`${API_URL}/api/whatsapp/generate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.qrCode) {
        console.log('QR Code received:', data.qrCode);
        setQrCode(data.qrCode);
        setConnectionStatus('connecting');
        setError(''); // Clear any previous errors
        
        // Poll for connection status
        if (qrRefreshInterval.current) {
          clearInterval(qrRefreshInterval.current);
        }
        
        qrRefreshInterval.current = setInterval(async () => {
          await checkConnectionStatus();
        }, 3000);
      } else if (data.success && data.connected) {
        // Already connected
        setIsConnected(true);
        setConnectionStatus('connected');
        setPhoneNumber(data.phoneNumber || '');
        setQrCode('');
        setError('');
      } else {
        setError(data.message || 'Failed to generate QR code');
        setConnectionStatus('disconnected');
        setQrCode('');
      }
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Unable to connect to server. Please try again later. You can try disconnecting and retrying.');
      setConnectionStatus('disconnected');
      setQrCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/whatsapp/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setQrCode('');
        setPhoneNumber('');
        if (qrRefreshInterval.current) {
          clearInterval(qrRefreshInterval.current);
        }
      } else {
        setError(data.message || 'Failed to disconnect');
      }
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
      setError('Unable to disconnect. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div>
          <h2 className="dashboard-title">WhatsApp Link</h2>
          <p className="dashboard-subtitle">Connect your WhatsApp account to send messages</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Connection Status</h5>
        </Card.Header>
        <Card.Body>
          <div className="d-flex align-items-center gap-3">
            <div className={`status-indicator ${
              connectionStatus === 'connected' ? 'connected' : 
              connectionStatus === 'connecting' ? 'connecting' : 
              'disconnected'
            }`}></div>
            <div>
              <strong>
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 
                 'Not Connected'}
              </strong>
              {connectionStatus === 'connected' && phoneNumber && (
                <div className="text-muted small mt-1">
                  Phone: {phoneNumber}
                </div>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {connectionStatus === 'connected' ? (
        <Card>
          <Card.Header>
            <h5 className="mb-0">WhatsApp Connected</h5>
          </Card.Header>
          <Card.Body>
            <Alert variant="success">
              <strong>Success!</strong> Your WhatsApp account is connected and ready to use.
              {phoneNumber && (
                <div className="mt-2">
                  Connected phone number: <strong>{phoneNumber}</strong>
                </div>
              )}
            </Alert>
            <Button 
              variant="danger" 
              onClick={disconnectWhatsApp}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect WhatsApp'
              )}
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Header>
            <h5 className="mb-0">Connect WhatsApp</h5>
          </Card.Header>
          <Card.Body>
            {error && error.includes('timeout') && (
              <Alert variant="warning" className="mb-3">
                <strong>Connection Timeout:</strong> QR code generation timed out. 
                Please try disconnecting and generating a new QR code.
                <div className="mt-2">
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={disconnectWhatsApp}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect & Retry'
                    )}
                  </Button>
                </div>
              </Alert>
            )}
            <div className="text-center">
              {qrCode ? (
                <>
                  <Alert variant="info" className="mb-4">
                    <strong>Scan this QR code with your WhatsApp mobile app:</strong>
                    <ol className="text-start mt-3 mb-0">
                      <li>Open WhatsApp on your phone</li>
                      <li>Go to Settings → Linked Devices</li>
                      <li>Tap "Link a Device"</li>
                      <li>Point your camera at this QR code</li>
                    </ol>
                  </Alert>
                  
                  <div className="d-flex justify-content-center mb-4">
                    <div className="p-4 bg-white border rounded shadow-sm" style={{ display: 'inline-block', minWidth: '300px', minHeight: '300px' }}>
                      {qrCode ? (
                        <div className="text-center">
                          <QRCodeSVG 
                            value={qrCode} 
                            size={300}
                            level="H"
                            includeMargin={true}
                            style={{ maxWidth: '100%', height: 'auto' }}
                          />
                        </div>
                      ) : (
                        <div className="d-flex align-items-center justify-content-center" style={{ width: '300px', height: '300px' }}>
                          <Spinner animation="border" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {qrCode && (
                    <div className="mb-3">
                      <small className="text-muted">
                        QR Code Value: <code>{qrCode.substring(0, 50)}...</code>
                      </small>
                    </div>
                  )}

                  <div className="mb-3">
                    <Button 
                      variant="secondary" 
                      onClick={generateQRCode}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Generating...
                        </>
                      ) : (
                        'Refresh QR Code'
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Alert variant="warning" className="mb-4">
                    <strong>Instructions:</strong>
                    <p className="mb-0 mt-2">
                      Click the button below to generate a QR code. Then scan it with your WhatsApp mobile app to connect your account.
                    </p>
                  </Alert>
                  
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={generateQRCode}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Generating QR Code...
                      </>
                    ) : (
                      'Generate QR Code'
                    )}
                  </Button>
                </>
              )}
            </div>
          </Card.Body>
        </Card>
      )}

      <style>{`
        .status-indicator {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: inline-block;
        }
        .status-indicator.connected {
          background-color: #28a745;
          box-shadow: 0 0 8px rgba(40, 167, 69, 0.5);
        }
        .status-indicator.connecting {
          background-color: #ffc107;
          box-shadow: 0 0 8px rgba(255, 193, 7, 0.5);
          animation: pulse 1.5s infinite;
        }
        .status-indicator.disconnected {
          background-color: #dc3545;
          box-shadow: 0 0 8px rgba(220, 53, 69, 0.5);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Container>
  );
};

export default WhatsAppLink;

