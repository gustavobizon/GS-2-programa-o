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

// Middleware de validação de dados
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

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        dogName TEXT UNIQUE
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

//rota para inserir dados no banco de dados
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


// Rota para cadastrar um novo usuário
app.post('/register', async (req, res) => {
    const { username, password, dogName } = req.body;  
    try {
        db.get('SELECT * FROM usuarios WHERE username = ?', [username], async (err, row) => {
            if (row) {
                return res.status(400).json({ message: 'Usuário já existe' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            db.run('INSERT INTO usuarios (username, password, dogName) VALUES (?, ?, ?)', 
                [username, hashedPassword, dogName], (err) => {
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

// Rota para recuperação de senha
app.post('/recover-password', async (req, res) => {
    const { username, dogName } = req.body;

    db.get('SELECT * FROM usuarios WHERE username = ? AND dogName = ?', [username, dogName], async (err, row) => {
        if (!row) {
            return res.status(400).json({ message: 'Usuário ou nome do cachorro incorretos' });
        }

        res.json({ message: 'Validação bem-sucedida.', password: row.password });
    });
});

// Rota para alterar a senha
app.post('/change-password', async (req, res) => {
    const { username, newPassword } = req.body;

    db.get('SELECT * FROM usuarios WHERE username = ?', [username], (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Erro ao acessar o banco de dados.' });
        }
        if (!row) {
            return res.status(400).json({ message: 'Usuário não encontrado.' });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        db.run('UPDATE usuarios SET password = ? WHERE username = ?', [hashedPassword, username], function(err) {
            if (err) {
                return res.status(500).json({ message: 'Erro ao atualizar a senha.' });
            }
            return res.json({ message: 'Senha alterada com sucesso!' });
        });
    });
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

        const token = jwt.sign({ userId: row.id }, SECRET_KEY, { expiresIn: '1h' }); 
        res.json({ message: 'Login realizado com sucesso', token });
    });
});


// Rota para limpar todos os dados da tabela
app.delete('/limpar-dados', authenticateJWT, (req, res) => {
    const query = `DELETE FROM dados_sensores`;

    db.run(query, [], (err) => {
        if (err) {
            console.error('Erro ao limpar dados do banco de dados:', err.message);
            res.status(500).send('Erro ao limpar os dados.');
        } else {
            console.log('Dados da tabela limpos com sucesso.');
            res.send('Dados da tabela foram limpos com sucesso.');
        }
    });
});


app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});