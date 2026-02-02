import React from 'react';
import { Container } from 'react-bootstrap';
import '../App.css';

const Payments = () => {
  return (
    <Container fluid>
      <div className="operators-header mb-4">
        <div>
          <h2 className="dashboard-title">Payments</h2>
          <p className="dashboard-subtitle">Manage payment records</p>
        </div>
      </div>

      <div className="dashboard-content-card">
        <div className="card-body p-5 text-center">
          <h5 className="card-title mb-3">Payment Management</h5>
          <p className="text-muted">Payment management functionality will be implemented here.</p>
        </div>
      </div>
    </Container>
  );
};

export default Payments;

