import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineUserGroup, 
  HiOutlineAcademicCap, 
  HiOutlineBookOpen, 
  HiOutlineCurrencyDollar 
} from 'react-icons/hi2';
import OperatorSidebar from './OperatorSidebar';
import OperatorTopNavbar from './OperatorTopNavbar';
import Students from './Students';
import Teachers from './Teachers';
import Courses from './Courses';
import Payments from './Payments';
import Settings from './Settings';
import '../App.css';

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const [operator, setOperator] = useState(null);
  const [activeItem, setActiveItem] = useState('dashboard');

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isOperatorAuthenticated');
    const operatorData = localStorage.getItem('operator');
    
    if (!isAuthenticated || !operatorData) {
      navigate('/operator/login');
    } else {
      setOperator(JSON.parse(operatorData));
    }
  }, [navigate]);

  const handleItemClick = (itemId) => {
    setActiveItem(itemId);
  };

  if (!operator) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <OperatorSidebar activeItem={activeItem} onItemClick={handleItemClick} />
      <div className="dashboard-content">
        <OperatorTopNavbar operator={operator} />
        <div className="dashboard-main">
          <Container fluid>
            {activeItem === 'students' ? (
              <Students />
            ) : activeItem === 'teachers' ? (
              <Teachers />
            ) : activeItem === 'courses' ? (
              <Courses />
            ) : activeItem === 'payments' ? (
              <Payments />
            ) : activeItem === 'settings' ? (
              <Settings />
            ) : (
              <>
                <div className="dashboard-header mb-4">
                  <h2 className="dashboard-title">Dashboard</h2>
                  <p className="dashboard-subtitle">Welcome back, {operator.name || operator.email}</p>
                </div>

                <Row>
                  <Col md={3}>
                    <Card className="dashboard-stat-card">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineUserGroup />
                        </div>
                        <h3 className="stat-number">0</h3>
                        <p className="stat-label">Total Students</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="dashboard-stat-card">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineAcademicCap />
                        </div>
                        <h3 className="stat-number">0</h3>
                        <p className="stat-label">Total Teachers</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="dashboard-stat-card">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineBookOpen />
                        </div>
                        <h3 className="stat-number">0</h3>
                        <p className="stat-label">Active Courses</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="dashboard-stat-card">
                      <Card.Body>
                        <div className="stat-icon">
                          <HiOutlineCurrencyDollar />
                        </div>
                        <h3 className="stat-number">$0</h3>
                        <p className="stat-label">Total Revenue</p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Row className="mt-4">
                  <Col md={12}>
                    <Card className="dashboard-content-card">
                      <Card.Body>
                        <h5 className="card-title">Quick Actions</h5>
                        <p className="text-muted">Select an option from the sidebar to get started.</p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </Container>
        </div>
      </div>
    </div>
  );
};

export default OperatorDashboard;

