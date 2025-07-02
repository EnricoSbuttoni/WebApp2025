import { useAuth } from '../contexts/authContext';

function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      <h2>Benvenuto, {user?.nome}!</h2>
      <p>Ruolo: {user?.ruolo}</p>
    </div>
  );
}

export default HomePage;
