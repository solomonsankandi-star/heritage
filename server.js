// In: server.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { ApolloServer } = require('apollo-server-express');
const path = require('path');
const { graphqlUploadExpress } = require('graphql-upload');

// NOTE: WebSocket-related imports ('http', 'ws', 'uuid') have been removed.

const upload = require('./config/multer-config');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const viewRoutes = require('./routes/viewRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// NOTE: Global maps for clients and scanSessions have been removed.

// Middleware & Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.post('/upload', upload.single('eventImage'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file was uploaded.' });
    res.status(200).json({ imageUrl: `/uploads/${req.file.filename}` });
});

// This route remains, as it's the destination for the QR code
app.get('/town/:townName', (req, res) => {
  res.render('town', { townName: req.params.townName });
});

// NOTE: The '/scan/confirm/:scanId' route has been removed.

app.use('/', viewRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully.'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Apollo Server (GraphQL)
async function startApolloServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // NOTE: Context no longer needs scanSessions
  });

  await server.start();
  app.use(graphqlUploadExpress());
  server.applyMiddleware({ app });

  // --- THE ONLY CODE CHANGE IS HERE ---
  // We tell the server to listen on host 0.0.0.0 and the port provided by Fly.io.
  const HOST = '0.0.0.0';

  // NOTE: We are back to using app.listen() directly, no http server wrapper needed.
  app.listen({ port: PORT, host: HOST }, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`GraphQL endpoint at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startApolloServer();