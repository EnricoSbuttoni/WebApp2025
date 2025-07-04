import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';
import { Form, Button, Container, Alert, InputGroup } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const user = await res.json();
        setUser(user);
        if (user.ruolo === 'docente') {
          navigate('/docente');
        } else {
          navigate('/studente');
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Errore di login');
      }
    } catch {
      setErrorMsg('Errore di rete');
    }
  };

  return (
    <Container
      fluid
      className="d-flex align-items-center justify-content-center"
      style={{ height: '100vh', backgroundColor: '#f8f9fa' }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="mb-4 text-center">Login</h2>
        <Form onSubmit={handleLogin}>
          <Form.Group className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <InputGroup>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </Button>
            </InputGroup>
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100">
            Login
          </Button>

          {errorMsg && <Alert variant="danger" className="mt-3">{errorMsg}</Alert>}
        </Form>
      </div>
    </Container>
  );
}

export default LoginPage;
