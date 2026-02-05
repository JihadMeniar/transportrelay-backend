# Transport Relay Backend API

Backend API pour l'application TaxiRelay - Plateforme de partage de courses avec chat en temps réel.

## 🛠️ Stack Technique

- **Backend**: Node.js + Express + TypeScript
- **Base de données**: PostgreSQL 15
- **Authentification**: JWT
- **WebSocket**: Socket.io (chat temps réel)
- **Upload**: Multer (stockage local)
- **Validation**: Zod
- **Déploiement**: Docker + Docker Compose

## 📁 Structure du Projet

```
taxirelay-backend/
├── src/
│   ├── config/                 # Configuration (DB, JWT, Multer)
│   ├── database/               # Migrations & connexion
│   ├── shared/                 # Code partagé (types, middleware, utils)
│   ├── features/               # Features par domaine (auth, rides, chat, etc.)
│   ├── websocket/              # WebSocket server
│   ├── app.ts                  # Configuration Express
│   └── server.ts               # Point d'entrée
├── uploads/                    # Stockage fichiers
├── logs/                       # Logs application
└── docker/                     # Configuration Docker
```

## 🚀 Installation & Démarrage

### Prérequis
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15 (si sans Docker)

### Avec Docker (Recommandé)

```bash
# 1. Cloner le projet
cd taxirelay-backend

# 2. Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env si nécessaire

# 3. Démarrer les services
cd docker
docker-compose up -d

# 4. Vérifier les logs
docker-compose logs -f backend

# 5. Tester l'API
curl http://localhost:3000/health
```

### Sans Docker

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer PostgreSQL
# Créer une base de données 'taxirelay'

# 3. Configurer .env
cp .env.example .env
# Éditer DATABASE_URL et autres variables

# 4. Exécuter les migrations
npm run migrate

# 5. Démarrer le serveur
npm run dev
```

## 🗄️ Base de Données

### Migrations
Les migrations SQL sont dans `src/database/migrations/` :
1. `001_create_users.sql` - Table utilisateurs
2. `002_create_rides.sql` - Table courses
3. `003_create_ride_documents.sql` - Documents des courses
4. `004_create_chat_messages.sql` - Messages chat
5. `005_create_message_attachments.sql` - Pièces jointes
6. `006_create_indexes.sql` - Index de performance

### Exécuter les migrations
```bash
npm run migrate
```

### Seed data (optionnel)
```bash
npm run seed
```

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur (protected)
- `POST /api/auth/refresh` - Refresh token

### Rides (`/api/rides`)
- `GET /api/rides` - Liste des courses
- `GET /api/rides/:id` - Détails d'une course
- `POST /api/rides` - Publier une course
- `GET /api/rides/my-rides` - Mes courses
- `PATCH /api/rides/:id/accept` - Accepter une course
- `PATCH /api/rides/:id/status` - Modifier le statut
- `DELETE /api/rides/:id` - Supprimer une course

### Chat (`/api/chat`)
- `GET /api/chat/rides/:rideId/messages` - Historique des messages
- `POST /api/chat/rides/:rideId/messages` - Envoyer un message
- `POST /api/chat/rides/:rideId/messages/attachment` - Envoyer avec fichier
- `WebSocket /ws/chat` - Connexion temps réel

### Documents (`/api/documents`)
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/:id/download` - Télécharger document
- `DELETE /api/documents/:id` - Supprimer document

### Users (`/api/users`)
- `GET /api/users/:id/stats` - Statistiques publiques
- `GET /api/users/profile` - Mon profil
- `PATCH /api/users/profile` - Modifier le profil

## 🔐 Authentification

L'API utilise JWT (JSON Web Tokens) pour l'authentification.

### Obtenir un token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

### Utiliser le token
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## ⚡ WebSocket (Chat temps réel)

### Connexion
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});
```

### Events
- `join_ride` - Rejoindre une room de course
- `leave_ride` - Quitter une room
- `new_message` - Nouveau message reçu
- `typing` / `stop_typing` - Indicateur de frappe
- `ride_accepted` - Notification d'acceptation
- `ride_status_updated` - Mise à jour du statut

## 📤 Upload de Fichiers

### Limites
- Max 5 fichiers par course
- Max 10MB par fichier
- Max 10MB total par course
- Types acceptés: PDF, images (JPEG, PNG), Word docs

### Exemple
```bash
curl -X POST http://localhost:3000/api/rides \
  -H "Authorization: Bearer TOKEN" \
  -F "zone=Centre-ville" \
  -F "department=75" \
  -F "documents=@document1.pdf" \
  -F "documents=@document2.png"
```

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests avec watch
npm run test:watch

# Coverage
npm run test:coverage
```

## 🔧 Scripts NPM

```bash
npm run dev          # Démarrage en mode développement (hot reload)
npm run build        # Build production
npm start            # Démarrage production
npm run migrate      # Exécuter les migrations
npm run seed         # Seed data de test
npm test             # Tests
npm run lint         # Linter
npm run format       # Formatter le code
```

## 🐳 Docker Commands

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down

# Rebuild les images
docker-compose build

# Exécuter des commandes dans le container
docker-compose exec backend npm run migrate
docker-compose exec postgres psql -U taxirelay_user -d taxirelay
```

## 📊 Monitoring & Logs

Les logs sont stockés dans le dossier `logs/` :
- `app.log` - Logs d'application
- `error.log` - Erreurs uniquement

## 🔒 Sécurité

- Passwords hachés avec bcrypt (10 salt rounds)
- JWT avec expiration (24h access, 7d refresh)
- CORS configuré
- Rate limiting (100 req/15min)
- Validation stricte des entrées (Zod)
- Helmet pour headers sécurisés
- File upload: validation MIME type + taille

## 🚀 Déploiement Production

### Variables d'environnement à changer
1. `JWT_SECRET` - Secret fort (min 32 caractères)
2. `JWT_REFRESH_SECRET` - Secret fort différent
3. `DATABASE_PASSWORD` - Mot de passe fort
4. `NODE_ENV=production`
5. `CORS_ORIGIN` - URL frontend production

### Checklist
- [ ] Configurer HTTPS
- [ ] Changer tous les secrets
- [ ] Configurer backup database
- [ ] Configurer monitoring (Sentry, LogRocket)
- [ ] Optimiser PostgreSQL
- [ ] Configurer CDN pour uploads (optionnel)

## 📝 Documentation API

La documentation complète de l'API est disponible à :
- Swagger UI: `http://localhost:3000/api-docs` (TODO)
- Postman Collection: `docs/postman/` (TODO)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit les changes (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 License

ISC

## 👥 Auteurs

TaxiRelay Team

## 🐛 Bugs & Support

Pour reporter un bug ou demander de l'aide, ouvrir une issue sur GitHub.

---

**Version**: 1.0.0
**Dernière mise à jour**: 2026-01-23
