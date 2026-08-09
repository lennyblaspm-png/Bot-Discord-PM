const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/', passport.authenticate('discord', { scope: ['identify', 'guilds', 'guild.members'] }));

router.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

module.exports = router;
