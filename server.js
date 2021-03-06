// Le package `dotenv` permet de pouvoir definir des variables d'environnement dans le fichier `.env`
// Nous utilisons le fichier `.slugignore` afin d'ignorer le fichier `.env` dans l'environnement Heroku
require("dotenv").config();

// Le package `mongoose` est un ODM (Object-Document Mapping) permettant de manipuler les documents de la base de données comme si c'étaient des objets
var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, function(err) {
  if (err) console.error("Could not connect to mongodb.");
});

var express = require("express");
var app = express();

// Le package `helmet` est une collection de protections contre certaines vulnérabilités HTTP
var helmet = require("helmet");
app.use(helmet());

// Les réponses (> 1024 bytes) du serveur seront compressées au format GZIP pour diminuer la quantité d'informations transmise
var compression = require("compression");
app.use(compression());

// Parse le `body` des requêtes HTTP reçues
var bodyParser = require("body-parser");
app.use(bodyParser.json());

// Initialisation des models
var User = require("./models/User");
var Room = require("./models/Room");
var City = require("./models/City");

// Le package `passport`
var passport = require("passport");
app.use(passport.initialize()); // TODO test

// Nous aurons besoin de 2 strategies :
// - `local` permettra de gérer le login nécessitant un mot de passe
var LocalStrategy = require("passport-local").Strategy;
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passReqToCallback: true,
      session: false
    },
    User.authenticateLocal()
  )
);

// - `http-bearer` permettra de gérer toute les requêtes authentifiées à l'aide d'un `token`
var HTTPBearerStrategy = require("passport-http-bearer").Strategy;
passport.use(new HTTPBearerStrategy(User.authenticateBearer())); // La méthode `authenticateBearer` a été déclarée dans le model User

app.get("/", function(req, res) {
  res.send("Welcome to the Airbnb API.");
});

// `Cross-Origin Resource Sharing` est un mechanisme permettant d'autoriser les requêtes provenant d'un nom de domaine different
// Ici, nous autorisons l'API à repondre aux requêtes AJAX venant d'autres serveurs
var cors = require("cors");
app.use("/api", cors());

// Les routes sont séparées dans plusieurs fichiers
var coreRoutes = require("./routes/core.js");
var userRoutes = require("./routes/user.js");
var roomRoutes = require("./routes/room.js");
// Les routes relatives aux utilisateurs auront pour prefix d'URL `/user`
app.use("/api", coreRoutes);
app.use("/api/user", userRoutes);
app.use("/api/room", roomRoutes);

// Toutes les méthodes HTTP (GET, POST, etc.) des pages non trouvées afficheront une erreur 404
app.all("*", function(req, res) {
  res.status(404).json({ error: "Not Found" });
});

// Le dernier middleware de la chaîne gérera les d'erreurs
// Ce `error handler` doit définir obligatoirement 4 paramètres
// Définition d'un middleware : https://expressjs.com/en/guide/writing-middleware.html
app.use(function(err, req, res, next) {
  if (res.statusCode === 200) res.status(400);
  console.error(err);

  if (process.env.NODE_ENV === "production") err = "An error occurred";
  res.json({ error: err });
});

app.listen(process.env.PORT, function() {
  console.log(`Airbnb API running on port ${process.env.PORT}`);
});

// TODO test
// console.log(`process.env.NODE_ENV = ${process.env.NODE_ENV}`);
