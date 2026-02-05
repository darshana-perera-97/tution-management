import React from 'react';
import { Navbar, Nav, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineUser, 
  HiOutlineCog6Tooth, 
  HiOutlineArrowRightOnRectangle
} from 'react-icons/hi2';
import '../App.css';

const StudentTopNavbar = ({ student }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('student');
    localStorage.removeItem('isStudentAuthenticated');
    navigate('/student/login');
  };

  return (
    <Navbar className="top-navbar" expand="lg" style={{ 
      background: 'white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      padding: '12px 24px',
      borderRadius: '0',
      marginBottom: '0'
    }}>
      <Navbar.Brand className="top-navbar-brand" style={{ 
        fontSize: '20px',
        fontWeight: '700',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        Student Portal
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
        <Nav>
          <Dropdown align="end">
            <Dropdown.Toggle as={Nav.Link} className="top-navbar-user" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#1e293b',
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}>
              <span className="user-avatar" style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px'
              }}>
                <HiOutlineUser />
              </span>
              <span className="user-name" style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#1e293b'
              }}>
                {student?.fullName || 'Student'}
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu className="user-dropdown">
              <Dropdown.Item className="user-dropdown-item">
                <span className="dropdown-icon">
                  <HiOutlineUser />
                </span>
                <span>Profile</span>
              </Dropdown.Item>
              <Dropdown.Item className="user-dropdown-item">
                <span className="dropdown-icon">
                  <HiOutlineCog6Tooth />
                </span>
                <span>Settings</span>
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item className="user-dropdown-item" onClick={handleLogout}>
                <span className="dropdown-icon">
                  <HiOutlineArrowRightOnRectangle />
                </span>
                <span>Logout</span>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default StudentTopNavbar;

