const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'sua_chave_secreta';

app.use(express.json());
app.use(cors());

const db = new sqlite3.Database('banco-de-dados.db');

// Middleware para verificar o token JWT
const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

    if (token) {
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Acesso negado' });
            }
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ message: 'Token não fornecido' });
    }
};

// Middleware de validação de dados dos sensores
const validateSensorData = (req, res, next) => {
    const dadosArray = Array.isArray(req.body) ? req.body : [req.body];

    for (const dados of dadosArray) {
        const { sensor_id, tipo_sensor, ambiente, valor } = dados;

        if (!sensor_id || typeof sensor_id !== 'number') {
            return res.status(400).json({ message: 'ID do sensor inválido ou ausente.' });
        }
        if (!tipo_sensor || typeof tipo_sensor !== 'string') {
            return res.status(400).json({ message: 'Tipo de sensor inválido ou ausente.' });
        }
        if (!ambiente || typeof ambiente !== 'string') {
            return res.status(400).json({ message: 'Ambiente inválido ou ausente.' });
        }
        if (valor === undefined || typeof valor !== 'number') {
            return res.status(400).json({ message: 'Valor inválido ou ausente.' });
        }
    }

    next();
};

// Criação das tabelas no banco de dados
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        dogName TEXT UNIQUE,
        role TEXT DEFAULT 'user'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS dados_sensores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id INTEGER,
        tipo_sensor TEXT,
        ambiente TEXT,
        valor REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Rota para cadastrar um novo usuário
app.post('/register', async (req, res) => {
    const { username, password, dogName, role = 'user' } = req.body;
    try {
        db.get('SELECT * FROM usuarios WHERE username = ?', [username], async (err, row) => {
            if (row) {
                return res.status(400).json({ message: 'Usuário já existe' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            db.run('INSERT INTO usuarios (username, password, dogName, role) VALUES (?, ?, ?, ?)', 
                [username, hashedPassword, dogName, role], (err) => {
                if (err) {
                    console.error('Erro ao cadastrar usuário:', err.message);
                    return res.status(500).json({ message: 'Erro ao cadastrar usuário' });
                }
                res.status(201).json({ message: 'Usuário cadastrado com sucesso' });
            });
        });
    } catch (err) {
        console.error('Erro ao processar o cadastro:', err.message);
        res.status(500).json({ message: 'Erro ao processar o cadastro' });
    }
});

// Rota para login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM usuarios WHERE username = ?', [username], async (err, row) => {
        if (!row) {
            return res.status(400).json({ message: 'Usuário ou senha incorretos' });
        }

        const isPasswordValid = await bcrypt.compare(password, row.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Usuário ou senha incorretos' });
        }

        const token = jwt.sign({ userId: row.id, role: row.role }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ message: 'Login realizado com sucesso', token });
    });
});

// Rota para receber os dados dos sensores
app.post('/dados-sensores', authenticateJWT, validateSensorData, (req, res) => {
    const dadosArray = Array.isArray(req.body) ? req.body : [req.body];
    console.log('Dados recebidos dos sensores:', dadosArray);

    const insertPromises = dadosArray.map(dados => {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO dados_sensores (sensor_id, tipo_sensor, ambiente, valor) VALUES (?, ?, ?, ?)`,
                [dados.sensor_id, dados.tipo_sensor, dados.ambiente, dados.valor],
                (err) => {
                    if (err) {
                        console.error('Erro ao inserir dados no banco de dados:', err.message);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        });
    });

    Promise.all(insertPromises)
        .then(() => {
            console.log('Dados inseridos no banco de dados com sucesso.');
            res.send('Dados recebidos e armazenados com sucesso.');
        })
        .catch(err => {
            res.status(500).send('Erro ao processar os dados.');
        });
});

// Rota para buscar todos os dados dos sensores
app.get('/dados-sensores', authenticateJWT, (req, res) => {
    const query = `SELECT * FROM dados_sensores`;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar dados no banco de dados:', err.message);
            res.status(500).send('Erro ao buscar os dados.');
        } else {
            res.json(rows);
        }
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
