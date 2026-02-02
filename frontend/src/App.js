import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import OperatorLogin from './components/OperatorLogin';
import Dashboard from './components/Dashboard';
import OperatorDashboard from './components/OperatorDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/operator/login" element={<OperatorLogin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/operator/dashboard" element={<OperatorDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
