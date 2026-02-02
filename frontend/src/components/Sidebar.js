import React from 'react';
import { Nav } from 'react-bootstrap';
import { 
  HiOutlineChartBar, 
  HiOutlineUserGroup, 
  HiOutlineAcademicCap,
  HiOutlineBriefcase,
  HiOutlineBookOpen,
  HiOutlineCreditCard,
  HiOutlineDocumentChartBar,
  HiOutlineClipboardDocumentCheck
} from 'react-icons/hi2';
import '../App.css';

const Sidebar = ({ activeItem, onItemClick, className }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HiOutlineChartBar },
    { id: 'students', label: 'Students', icon: HiOutlineUserGroup },
    { id: 'teachers', label: 'Teachers', icon: HiOutlineAcademicCap },
    { id: 'operators', label: 'Operators', icon: HiOutlineBriefcase },
    { id: 'courses', label: 'Courses', icon: HiOutlineBookOpen },
    { id: 'payments', label: 'Payments', icon: HiOutlineCreditCard },
    { id: 'attendance', label: 'Attendance', icon: HiOutlineClipboardDocumentCheck },
    { id: 'reports', label: 'Reports', icon: HiOutlineDocumentChartBar },
  ];

  return (
    <div className={`sidebar ${className || ''}`}>
      <div className="sidebar-header">
        <h3 className="sidebar-logo">Tuition Management</h3>
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
      </Nav>
    </div>
  );
};

export default Sidebar;

