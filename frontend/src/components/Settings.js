import React from 'react';
import { Container } from 'react-bootstrap';
import '../App.css';

const Settings = () => {
  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div>
          <h2 className="dashboard-title">Settings</h2>
          <p className="dashboard-subtitle">Manage system settings</p>
        </div>
      </div>

      <div className="dashboard-content-card">
        <div className="card-body p-5 text-center">
          <h5 className="card-title mb-3">System Settings</h5>
          <p className="text-muted">Settings functionality will be implemented here.</p>
        </div>
      </div>
    </Container>
  );
};

export default Settings;

