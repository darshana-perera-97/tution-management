import React from 'react';
import { Navbar, Nav, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineUser, 
  HiOutlineCog6Tooth, 
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3
} from 'react-icons/hi2';
import '../App.css';

const OperatorTopNavbar = ({ operator, onMenuToggle }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('operator');
    localStorage.removeItem('isOperatorAuthenticated');
    navigate('/operator/login');
  };

  return (
    <Navbar className="top-navbar" expand="lg">
      <button className="mobile-menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
        <HiOutlineBars3 />
      </button>
      <Navbar.Brand className="top-navbar-brand">
        Operator Panel
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
        <Nav>
          <Dropdown align="end">
            <Dropdown.Toggle as={Nav.Link} className="top-navbar-user">
              <span className="user-avatar">
                <HiOutlineUser />
              </span>
              <span className="user-name">{operator?.name || operator?.email || 'Operator'}</span>
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

export default OperatorTopNavbar;

