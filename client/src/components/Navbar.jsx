import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';

function Navbar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await fetch('http://localhost:3001/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    navigate('/');
  };

  if (!user) return null; // non mostrare la navbar se non loggato

  return (
    <nav>
      <span>Benvenuto, {user.nome || user.email} ({user.ruolo})</span>
      <button onClick={handleLogout}>Logout</button>
    </nav>
  );
}

export default Navbar;
