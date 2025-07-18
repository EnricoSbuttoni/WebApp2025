import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/loginPage';
import { AuthProvider } from './contexts/authContext';
import PrivateRoute from './components/PrivateRoute';
import DocentePage from './pages/Docente';
import StudentePage from './pages/Studente';
import StatoClassePage from './pages/StatoClassePage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/docente"
            element={
              <PrivateRoute>
                <DocentePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/studente"
            element={
              <PrivateRoute>
                <StudentePage />
              </PrivateRoute>
            }
          />
          <Route path="/stato-classe" element={<StatoClassePage />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
