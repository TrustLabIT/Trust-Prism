# TrustLab Diagnostics

Monorepo with two apps.

```
Trust-Prism/
├── frontend/   React admin panel (CRA, React 19, MUI, Redux Toolkit, Firebase, Socket.IO client)
└── backend/    Node.js API (Express + Socket.IO)
```

## Frontend

```bash
cd frontend
npm start      # dev server → http://localhost:3000/admin
npm run build  # production build
```

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev    # nodemon → http://localhost:5000
npm start      # plain node
```

Health check: `GET http://localhost:5000/api/health`
