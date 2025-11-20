// In: server.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { ApolloServer } = require('apollo-server-express');
const path = require('path');
const { graphqlUploadExpress } = require('graphql-upload');

const upload = require('./config/multer-config');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const viewRoutes = require('./routes/viewRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

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


// --- Static routes, one for each town page ---
app.get('/town/Windhoek', (req, res) => { res.render('pages/towns/windhoek'); });
app.get('/town/Swakopmund', (req, res) => { res.render('pages/towns/swakopmund'); });
app.get('/town/Walvis-Bay', (req, res) => { res.render('pages/towns/walvisbay'); });
app.get('/town/Oshakati', (req, res) => { res.render('pages/towns/oshakati'); });
app.get('/town/Rundu', (req, res) => { res.render('pages/towns/rundu'); });
app.get('/town/Keetmanshoop', (req, res) => { res.render('pages/towns/keetmanshoop'); });
app.get('/town/Tsumeb', (req, res) => { res.render('pages/towns/tsumeb'); });
app.get('/town/Luderitz', (req, res) => { res.render('pages/towns/luderitz'); });
app.get('/town/Gobabis', (req, res) => { res.render('pages/towns/gobabis'); });
app.get('/town/Katima-Mulilo', (req, res) => { res.render('pages/towns/katimamulilo'); });


app.use('/', viewRoutes);

// MongoDB Connection and Server Start
async function startServer() {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();
  app.use(graphqlUploadExpress());
  apolloServer.applyMiddleware({ app });

  app.listen({ port: PORT, host: HOST }, () => {
    console.log(`Server ready at http://${HOST}:${PORT}`);
    console.log(`GraphQL endpoint at http://localhost:${PORT}${apolloServer.graphqlPath}`);
  });
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully.');
    startServer();
  })
  .catch(err => {
    console.error('FATAL: MongoDB Connection Error:', err);
  });