import swaggerJsdoc from 'swagger-jsdoc';

// Get env vars directly to avoid circular dependency with index.ts
const port = process.env.PORT || '3000';
const apiPrefix = process.env.API_PREFIX || '/api';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Transport Relay API',
      version: '1.0.0',
      description: `
## Transport Relay Backend API Documentation

API REST pour l'application Transport Relay - Plateforme de partage de courses taxi entre chauffeurs.

### Fonctionnalités principales :
- **Authentification** : Inscription, connexion, gestion des tokens JWT
- **Courses** : Publication, acceptation, gestion des courses
- **Chat** : Messagerie en temps réel entre chauffeurs
- **Documents** : Upload et téléchargement de documents
- **Abonnements** : Gestion des abonnements via Stripe

### Authentification
La plupart des endpoints nécessitent une authentification via JWT.
Incluez le token dans le header : \`Authorization: Bearer <token>\`

### Visibilité des données
- Les données sensibles (nom client, téléphone, adresse) sont masquées pour les courses non acceptées
- Après acceptation, le publisher et le taker ont accès aux informations complètes
      `,
      contact: {
        name: 'Transport Relay Support',
        email: 'support@taxirelay.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${port}${apiPrefix}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenu via /auth/login ou /auth/register',
        },
      },
      schemas: {
        // Error Response
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        // User
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['driver', 'admin'] },
            statsPublished: { type: 'integer' },
            statsAccepted: { type: 'integer' },
            rating: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // Ride
        Ride: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            zone: { type: 'string' },
            department: { type: 'string' },
            distance: { type: 'string' },
            exactDistance: { type: 'string' },
            status: { type: 'string', enum: ['available', 'accepted', 'published', 'completed', 'cancelled'] },
            courseType: { type: 'string', enum: ['normal', 'medical'] },
            medicalType: { type: 'string', enum: ['hospitalisation', 'consultation'], nullable: true },
            scheduledDate: { type: 'string', format: 'date' },
            departureTime: { type: 'string', pattern: '^[0-2][0-9]:[0-5][0-9]$' },
            arrivalTime: { type: 'string', pattern: '^[0-2][0-9]:[0-5][0-9]$' },
            clientName: { type: 'string', description: 'Masqué si non autorisé' },
            clientPhone: { type: 'string', description: 'Masqué si non autorisé' },
            pickup: { type: 'string', description: 'Masqué si non autorisé' },
            destination: { type: 'string', description: 'Masqué si non autorisé' },
            publishedBy: { type: 'string', format: 'uuid' },
            acceptedBy: { type: 'string', format: 'uuid', nullable: true },
            publishedAt: { type: 'string', format: 'date-time' },
            acceptedAt: { type: 'string', format: 'date-time', nullable: true },
            documents: { type: 'array', items: { $ref: '#/components/schemas/Document' } },
          },
        },
        // Chat Message
        ChatMessage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            rideId: { type: 'integer' },
            senderId: { type: 'string', format: 'uuid' },
            senderRole: { type: 'string', enum: ['publisher', 'taker'] },
            messageType: { type: 'string', enum: ['text', 'attachment'] },
            content: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            attachment: { $ref: '#/components/schemas/Attachment' },
          },
        },
        // Document
        Document: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            rideId: { type: 'integer' },
            name: { type: 'string' },
            uri: { type: 'string' },
            mimeType: { type: 'string' },
            size: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // Attachment
        Attachment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fileName: { type: 'string' },
            uri: { type: 'string' },
            mimeType: { type: 'string' },
            size: { type: 'integer' },
          },
        },
        // Pagination
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
        // Auth Tokens
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Token manquant ou invalide',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFoundError: {
          description: 'Ressource non trouvée',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Erreur de validation des données',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentification et gestion des utilisateurs' },
      { name: 'Rides', description: 'Gestion des courses' },
      { name: 'Chat', description: 'Messagerie en temps réel' },
      { name: 'Documents', description: 'Upload et gestion des documents' },
      { name: 'Users', description: 'Profils utilisateurs' },
      { name: 'Subscriptions', description: 'Gestion des abonnements' },
    ],
  },
  apis: ['./src/docs/*.yaml'],
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
