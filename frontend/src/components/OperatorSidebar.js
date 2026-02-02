import React from 'react';
import { Nav } from 'react-bootstrap';
import { 
  HiOutlineChartBar, 
  HiOutlineUserGroup, 
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineCreditCard,
  HiOutlineCog6Tooth
} from 'react-icons/hi2';
import '../App.css';

const OperatorSidebar = ({ activeItem, onItemClick }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HiOutlineChartBar },
    { id: 'students', label: 'Students', icon: HiOutlineUserGroup },
    { id: 'teachers', label: 'Teachers', icon: HiOutlineAcademicCap },
    { id: 'courses', label: 'Courses', icon: HiOutlineBookOpen },
    { id: 'payments', label: 'Payments', icon: HiOutlineCreditCard },
    { id: 'settings', label: 'Settings', icon: HiOutlineCog6Tooth },
  ];

  return (
    <div className="sidebar">
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

export default OperatorSidebar;

