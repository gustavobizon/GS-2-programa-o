# 🚀 API de Monitoramento de Sensores com Express e SQLite

Este projeto implementa uma API para monitoramento de sensores, cadastro de usuários e autenticação usando **Express**, **SQLite**, **bcrypt** e **JWT**. 

## 🛠️ Funcionalidades

- Cadastro e autenticação de usuários.
- Inserção, consulta e limpeza de dados de sensores.
- Alteração de senha e recuperação baseada em informações de segurança.
- Middleware para validação de dados e autenticação JWT.

---

## 🛤️ Rotas da API

### 🌟 **Rotas de Usuário**

- **`POST /register`**  
  Cadastro de um novo usuário com:
  - `username`
  - `password`
  - `dogName` (nome do cachorro como chave de recuperação de senha).

- **`POST /login`**  
  Realiza o login e retorna um token JWT para autenticação.  

- **`POST /recover-password`**  
  Valida o nome de usuário e o nome do cachorro para exibir a senha (em texto claro).  

- **`POST /change-password`**  
  Permite ao usuário alterar a senha fornecendo o `username` e a nova senha.  

---

### 🖥️ **Rotas de Dados de Sensores**

- **`POST /dados-sensores`**  
  Insere dados no banco. Exemplo de payload (tambem podendo ser feito pelo site):
  ```json
  {
    "sensor_id": 1,
    "tipo_sensor": "temperatura",
    "ambiente": "sala",
    "valor": 22
  }
Autenticação JWT necessária.

- GET /dados-sensores
Retorna todos os dados de sensores armazenados.
Autenticação JWT necessária.

- DELETE /limpar-dados
Remove todos os registros da tabela de sensores.
Autenticação JWT necessária.

🔒 Middleware <br/>
- authenticateJWT <br/>
Verifica se o token JWT é válido para acessar rotas protegidas.

- validateSensorData <br/>
Garante que os dados enviados possuem os campos sensor_id, tipo_sensor, ambiente e valor válidos.

---

🗄️ Banco de Dados <br/>
As tabelas criadas no SQLite são:

**usuarios**
Campos:

 - id (identificação)
 - username (Nome)
 - password (senha)
 - dogName (nome do cachorro)

**dados_sensores**
Campos:

 - id (identificação)
 - sensor_id (identificação)
 - tipo_sensor (tipo do sensor, ex: temperatura)
 - ambiente (local do sensor, ex: sala)
 - valor (valor lido pelo sensor)
 - timestamp (data e hora do registro)

---

## ▶️ Como Rodar o Projeto <br/>
- **Instalar dependências:**
npm install
- **Iniciar o servidor:**
node server.js

---

## ⚙️ Tecnologias Utilizadas

- **Express** para criar rotas e middlewares.
- **SQLite3** como banco de dados.
- **JWT** para autenticação segura.
- **bcrypt** para criptografia de senhas.
- **CORS** para permitir acesso externo à API.
