import {
  Container, Card, Button, Form, Row, Col, Spinner, Modal, Toast
} from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/authContext';
import Navbar from '../components/Navbar';

function StudentePage() {
  const { user, setUser } = useAuth();
  const [aperti, setAperti] = useState([]);
  const [chiusi, setChiusi] = useState([]);
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentCompito, setCurrentCompito] = useState(null);
  const [currentRisposta, setCurrentRisposta] = useState('');
  const [risposte, setRisposte] = useState({});
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const fetchDati = async () => {
      try {
        const resUser = await fetch('http://localhost:3001/api/mio-nome', {
          credentials: 'include'
        });
        if (!resUser.ok) throw new Error('Errore utente');
        const datiUtente = await resUser.json();
        setUser(datiUtente);

        const [resAperti, resChiusi] = await Promise.all([
          fetch('http://localhost:3001/api/miei-compiti-aperti', { credentials: 'include' }),
          fetch('http://localhost:3001/api/miei-compiti-chiusi', { credentials: 'include' })
        ]);

        const datiAperti = await resAperti.json();
        const datiChiusi = await resChiusi.json();

        setAperti(datiAperti);
        setChiusi(datiChiusi.compiti);
        setMedia(datiChiusi.media);

        const nuoveRisposte = {};
        for (const compito of datiAperti) {
          const res = await fetch(`http://localhost:3001/api/mia-risposta/${compito.compitoId}`, {
            credentials: 'include'
          });
          if (res.ok) {
            const dati = await res.json();
            if (!dati.empty) {
              nuoveRisposte[compito.compitoId] = dati.testo;
            }
          }
        }
        setRisposte(nuoveRisposte);

      } catch (err) {
        console.error('Errore caricamento dati:', err);
      }
    };

    fetchDati();
  }, [setUser]);

  const apriModaleRisposta = (compito) => {
    setCurrentCompito(compito);
    setCurrentRisposta(risposte[compito.compitoId] || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const testo = currentRisposta.trim();
    if (!testo) return alert('Inserisci un testo valido.');

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/compiti/${currentCompito.compitoId}/risposta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ testo }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Errore: ' + err.error);
        return;
      }

      setRisposte(prev => ({ ...prev, [currentCompito.compitoId]: testo }));
      setShowModal(false);
      setShowToast(true);

    } catch (err) {
      console.error('Errore invio:', err);
    } finally {
      setLoading(false);
    }
  };

  const fullName = [user?.nome, user?.cognome].filter(Boolean).join(' ') || user?.email;

  const filtraCompagni = (lista) => {
    const me = fullName.trim();
    return lista
      .split(',')
      .map(s => s.trim())
      .filter(n => n !== me)
      .join(', ');
  };

  return (
    <>
      <Navbar />
      <Container
        fluid
        className="px-4 py-4"
        style={{ minHeight: '100vh', backgroundColor: '#f9f9f9' }}
      >
        

        <Toast
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={3000}
          autohide
          bg="success"
          className="position-fixed bottom-0 end-0 m-3"
        >
          <Toast.Header>
            <strong className="me-auto">Conferma</strong>
          </Toast.Header>
          <Toast.Body className="text-white">Risposta salvata con successo!</Toast.Body>
        </Toast>

        <h4 className="mt-4">📘 Compiti Aperti</h4>
        {aperti.length === 0 ? (
          <p>Nessun compito aperto disponibile.</p>
        ) : (
          <Row>
            {aperti.map((c) => (
              <Col md={6} lg={4} key={c.compitoId} className="mb-4">
                <Card>
                  <Card.Body>
                    <Card.Title>{c.domanda}</Card.Title>
                    <Card.Text>
                      <strong>Docente:</strong> {c.nomeDocente} {c.cognomeDocente}<br />
                      <strong>Compagni di gruppo:</strong><br />
                      {filtraCompagni(c.studentiNelGruppo) || 'Nessun altro studente'}
                    </Card.Text>
                    <Button variant="success" onClick={() => apriModaleRisposta(c)}>
                      {risposte[c.compitoId] ? 'Aggiorna risposta' : 'Invia risposta'}
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        <h4 className="mt-5">📗 Compiti Valutati</h4>
        {chiusi.length === 0 ? (
          <p>Nessun compito valutato ancora.</p>
        ) : (
          <Row>
            {chiusi.map((c) => (
              <Col md={6} lg={4} key={c.id} className="mb-4">
                <Card border="success">
                  <Card.Body>
                    <Card.Title>{c.domanda}</Card.Title>
                    <Card.Text>
                      <strong>Voto:</strong> {c.voto}/30<br />
                      <strong>Compagni di gruppo:</strong><br />
                      {filtraCompagni(c.studentiNelGruppo) || 'Nessun altro studente'}
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        <h4 className="mt-4">📊 Media Ponderata</h4>
        <p className="fs-5">{media !== null ? `${media}/30` : 'Non disponibile'}</p>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{risposte[currentCompito?.compitoId] ? 'Aggiorna Risposta' : 'Invia Risposta'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group>
                <Form.Label>Risposta</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={currentRisposta}
                  onChange={(e) => setCurrentRisposta(e.target.value)}
                  required
                />
              </Form.Group>
              <Button variant="success"className="mt-3" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Salvataggio...
                  </>
                ) : (
                  risposte[currentCompito?.compitoId] ? 'Aggiorna' : 'Invia'
                )}
              </Button>
            </Form>
          </Modal.Body>
        </Modal>
      </Container>
    </>
  );
}

export default StudentePage;
