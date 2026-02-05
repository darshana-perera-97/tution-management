import React from 'react';
import { Nav } from 'react-bootstrap';
import { 
  HiOutlineChartBar, 
  HiOutlineBookOpen,
  HiOutlineUserGroup,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCurrencyDollar,
  HiOutlineArrowRightOnRectangle
} from 'react-icons/hi2';
import '../App.css';

const TeacherSidebar = ({ activeItem, onItemClick, className, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HiOutlineChartBar },
    { id: 'my-courses', label: 'My Courses', icon: HiOutlineBookOpen },
    { id: 'my-students', label: 'My Students', icon: HiOutlineUserGroup },
    { id: 'attendance', label: 'Attendance', icon: HiOutlineClipboardDocumentCheck },
    { id: 'income', label: 'Income', icon: HiOutlineCurrencyDollar },
  ];

  return (
    <div className={`sidebar ${className || ''}`}>
      <div className="sidebar-header">
        <h3 className="sidebar-logo">Teacher Panel</h3>
      </div>
      <Nav className="flex-column sidebar-nav">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Nav.Link
              key={item.id}
              className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => onItemClick(item.id)}
            >
              <span className="sidebar-icon">
                <IconComponent />
              </span>
              <span className="sidebar-label">{item.label}</span>
            </Nav.Link>
          );
        })}
        {onLogout && (
          <Nav.Link
            className="sidebar-item sidebar-logout d-lg-none"
            onClick={onLogout}
          >
            <span className="sidebar-icon">
              <HiOutlineArrowRightOnRectangle />
            </span>
            <span className="sidebar-label">Logout</span>
          </Nav.Link>
        )}
      </Nav>
    </div>
  );
};

export default TeacherSidebar;

