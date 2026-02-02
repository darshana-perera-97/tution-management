import React from 'react';
import { Navbar, Nav, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineUser, 
  HiOutlineCog6Tooth, 
  HiOutlineArrowRightOnRectangle 
} from 'react-icons/hi2';
import '../App.css';

const TopNavbar = ({ admin }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin');
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  return (
    <Navbar className="top-navbar" expand="lg">
      <Navbar.Brand className="top-navbar-brand">
        Admin Panel
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
        <Nav>
          <Dropdown align="end">
            <Dropdown.Toggle as={Nav.Link} className="top-navbar-user">
              <span className="user-avatar">
                <HiOutlineUser />
              </span>
              <span className="user-name">{admin?.name || admin?.email || 'Admin'}</span>
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

export default TopNavbar;

