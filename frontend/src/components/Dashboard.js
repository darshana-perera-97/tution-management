import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineUserGroup, 
  HiOutlineAcademicCap, 
  HiOutlineBookOpen, 
  HiOutlineCurrencyDollar 
} from 'react-icons/hi2';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import Operators from './Operators';
import Teachers from './Teachers';
import Courses from './Courses';
import '../App.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [activeItem, setActiveItem] = useState('dashboard');

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const adminData = localStorage.getItem('admin');
    
    if (!isAuthenticated || !adminData) {
      navigate('/admin/login');
    } else {
      setAdmin(JSON.parse(adminData));
    }
  }, [navigate]);

  const handleItemClick = (itemId) => {
    setActiveItem(itemId);
    // Handle navigation or content change based on itemId
    console.log('Selected:', itemId);
  };

  if (!admin) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <Sidebar activeItem={activeItem} onItemClick={handleItemClick} />
      <div className="dashboard-content">
        <TopNavbar admin={admin} />
        <div className="dashboard-main">
          <Container fluid>
            {activeItem === 'operators' ? (
              <Operators />
            ) : activeItem === 'teachers' ? (
              <Teachers />
            ) : activeItem === 'courses' ? (
              <Courses />
            ) : (
              <>
                <div className="dashboard-header mb-4">
                  <h2 className="dashboard-title">
                    {activeItem.charAt(0).toUpperCase() + activeItem.slice(1)}
                  </h2>
                  <p className="dashboard-subtitle">Welcome back, {admin.name || admin.email}</p>
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

export default Dashboard;

