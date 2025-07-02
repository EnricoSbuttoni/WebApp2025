import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/loginPage';
import HomePage from './pages/homePage';
import { AuthProvider } from './contexts/authContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import DocentePage from './pages/Docente';
import StudentePage from './pages/Studente';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <PrivateRoute>
                <HomePage />
              </PrivateRoute>
            }
          />
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
