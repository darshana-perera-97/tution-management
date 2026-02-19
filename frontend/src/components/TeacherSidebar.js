import React from 'react';
import { Nav } from 'react-bootstrap';
import { 
  HiOutlineChartBar, 
  HiOutlineBookOpen,
  HiOutlineUserGroup,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCurrencyDollar,
  HiOutlineArrowRightOnRectangle,
  HiOutlineAcademicCap,
  HiChevronLeft,
  HiChevronRight
} from 'react-icons/hi2';
import '../App.css';

const TeacherSidebar = ({ activeItem, onItemClick, className, onLogout, isCollapsed, onToggleCollapse }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HiOutlineChartBar },
    { id: 'my-courses', label: 'My Courses', icon: HiOutlineBookOpen },
    { id: 'my-students', label: 'My Students', icon: HiOutlineUserGroup },
    { id: 'attendance', label: 'Attendance', icon: HiOutlineClipboardDocumentCheck },
    { id: 'income', label: 'Income', icon: HiOutlineCurrencyDollar },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${className || ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">
          <HiOutlineAcademicCap />
        </div>
        {!isCollapsed && (
          <h3 className="sidebar-logo">Teacher Panel</h3>
        )}
      </div>
      <Nav className="flex-column sidebar-nav">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Nav.Link
              key={item.id}
              className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => onItemClick(item.id)}
              title={isCollapsed ? item.label : ''}
            >
              <span className="sidebar-icon">
                <IconComponent />
              </span>
              {!isCollapsed && (
                <span className="sidebar-label">{item.label}</span>
              )}
            </Nav.Link>
          );
        })}
        {onLogout && (
          <Nav.Link
            className="sidebar-item sidebar-logout d-lg-none"
            onClick={onLogout}
            title={isCollapsed ? 'Logout' : ''}
          >
            <span className="sidebar-icon">
              <HiOutlineArrowRightOnRectangle />
            </span>
            {!isCollapsed && (
              <span className="sidebar-label">Logout</span>
            )}
          </Nav.Link>
        )}
      </Nav>
      
      {/* Toggle Button */}
      {onToggleCollapse && (
        <button 
          onClick={onToggleCollapse}
          className="sidebar-toggle-btn"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <HiChevronRight size={16} /> : <HiChevronLeft size={16} />}
        </button>
      )}
    </div>
  );
};

export default TeacherSidebar;

