import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';

function AppNavbar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await fetch('http://localhost:3001/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    navigate('/');
  };

  if (!user) return null;

  const isStudente = user.ruolo === 'studente';
  const navbarColor = isStudente ? 'success' : 'danger';

  return (
    <Navbar bg={navbarColor} variant="dark" expand="lg" className="py-3">
      <Container className="position-relative">
        {/* Pulsanti a sinistra */}
        <div className="d-flex gap-2">
          {location.pathname.startsWith('/docente') && (
            <Button
              size="md"
              variant="outline-light"
              onClick={() => navigate(`/stato-classe`)}
            >
              Stato Classe
            </Button>
          )}
          {location.pathname.startsWith('/stato-classe') && (
            <Button
              size="md"
              variant="outline-light"
              onClick={() => navigate('/docente')}
            >
              Compiti
            </Button>
          )}
        </div>

        {/* Titolo centrale */}
        <Navbar.Brand
          className="mx-auto position-absolute start-50 translate-middle-x fs-1 fw-bold"
          style={{ letterSpacing: '1px' }}
        >
          <span style={{ fontFamily: 'Segoe UI Semibold, sans-serif' }}>EZ</span>{' '}
          <span style={{ fontWeight: '300', fontFamily: 'Segoe UI, sans-serif' }}>Homework</span>
        </Navbar.Brand>

        {/* Utente e logout a destra */}
        <Navbar.Collapse className="justify-content-end">
          <Nav className="align-items-center fs-5">
            <Nav.Item
              className="me-3 d-flex align-items-center"
              style={{ fontFamily: 'Consolas, monospace', color: '#e0e0e0' }}
            >
              <i className="bi bi-person-circle me-2 fs-4" />
              {user.nome}
            </Nav.Item>
            <Button size="md" variant="outline-light" onClick={handleLogout}>
              Logout
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;
