import { useEffect, useState } from 'react';
import { Container, Table, Button, Dropdown } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

function StatoClassePage() {
  const { idDocente } = useParams(); // per compatibilità futura
  const [report, setReport] = useState([]);
  const [sort, setSort] = useState('nome');
  const [loading, setLoading] = useState(false);

  const fetchReport = async (criterio = 'nome') => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/stato-classe?sort=${criterio}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error('Errore nel caricamento del report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(sort);
  }, [sort]);

  const sortLabel = {
    nome: 'Per nome',
    compiti: 'Per numero di compiti',
    media: 'Per media'
  };

  return (
    <>
      <Navbar />
      <Container
        fluid
        className="px-4 py-4"
        style={{ minHeight: '100vh', backgroundColor: '#f9f9f9' }}
      >
        <h2 className="mb-3">📊 Stato della Classe</h2>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>Ordinamento: {sortLabel[sort]}</h5>
          <Dropdown onSelect={(val) => setSort(val)}>
            <Dropdown.Toggle variant="secondary" size="sm">
              Cambia ordinamento
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item eventKey="nome">Per nome</Dropdown.Item>
              <Dropdown.Item eventKey="compiti">Per numero di compiti</Dropdown.Item>
              <Dropdown.Item eventKey="media">Per media</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>

        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Studente</th>
              <th>Compiti Aperti</th>
              <th>Compiti Chiusi</th>
              <th>Media</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4">Caricamento...</td>
              </tr>
            ) : (
              report.map((s) => (
                <tr key={s.id}>
                  <td>{s.nome} {s.cognome}</td>
                  <td>{s.compitiAperti}</td>
                  <td>{s.compitiChiusi}</td>
                  <td>{s.media !== null ? `${s.media}/30` : 'N.D.'}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Container>
    </>
  );
}

export default StatoClassePage;
