require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'police-municipale-secret',
    resave: false,
    saveUninitialized: false
}));

// Passport Discord
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/auth/callback',
    scope: ['identify', 'guilds', 'guild.members']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

app.use(passport.initialize());
app.use(passport.session());

// Variables globales
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.guildId = process.env.GUILD_ID;
    next();
});

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const aiRoutes = require('./routes/ai');
const statsRoutes = require('./routes/stats');

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/ai', aiRoutes);
app.use('/stats', statsRoutes);

// Home
app.get('/', (req, res) => {
    res.render('index');
});

// Start
app.listen(PORT, () => {
    console.log(`🚀 Site web démarré sur http://localhost:${PORT}`);
});
