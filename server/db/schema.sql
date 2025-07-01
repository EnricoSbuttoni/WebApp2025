-- Utenti (sia docenti che studenti)
CREATE TABLE Utente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    ruolo TEXT NOT NULL CHECK (ruolo IN ('studente', 'docente'))
);

-- Studenti (estensione Utente)
CREATE TABLE Studente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    userId INTEGER NOT NULL UNIQUE,
    FOREIGN KEY(userId) REFERENCES Utente(id)
);

-- Docenti (estensione Utente)
CREATE TABLE Docente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    userId INTEGER NOT NULL UNIQUE,
    FOREIGN KEY(userId) REFERENCES Utente(id)
);

-- Compiti creati da un docente, assegnati a un gruppo
CREATE TABLE Compito (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domanda TEXT NOT NULL,
    docenteId INTEGER NOT NULL,
    stato TEXT NOT NULL CHECK (stato IN ('aperto', 'chiuso')),
    FOREIGN KEY(docenteId) REFERENCES Docente(id)
);

-- Gruppi associati a un compito (1 gruppo per compito)
CREATE TABLE Gruppo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compitoId INTEGER NOT NULL UNIQUE,
    FOREIGN KEY(compitoId) REFERENCES Compito(id)
);

-- Studenti nei gruppi (molti-a-molti)
CREATE TABLE StudenteGruppo (
    gruppoId INTEGER NOT NULL,
    studenteId INTEGER NOT NULL,
    PRIMARY KEY (gruppoId, studenteId),
    FOREIGN KEY(gruppoId) REFERENCES Gruppo(id),
    FOREIGN KEY(studenteId) REFERENCES Studente(id)
);

-- Risposta testuale inviata dal gruppo (solo 1 per compito)
CREATE TABLE Risposta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gruppoId INTEGER NOT NULL UNIQUE,
    testo TEXT NOT NULL,
    FOREIGN KEY(gruppoId) REFERENCES Gruppo(id)
);

-- Valutazione assegnata a un compito (solo se la risposta esiste)
CREATE TABLE Valutazione (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compitoId INTEGER NOT NULL UNIQUE,
    voto INTEGER NOT NULL CHECK (voto >= 0 AND voto <= 30),
    FOREIGN KEY(compitoId) REFERENCES Compito(id)
);
