import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import OperatorLogin from './components/OperatorLogin';
import TeacherLogin from './components/TeacherLogin';
import StudentLogin from './components/StudentLogin';
import Dashboard from './components/Dashboard';
import OperatorDashboard from './components/OperatorDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/operator/login" element={<OperatorLogin />} />
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/operator/dashboard" element={<OperatorDashboard />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
