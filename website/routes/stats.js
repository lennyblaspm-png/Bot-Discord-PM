const express = require('express');
const router = express.Router();

function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth');
}

router.get('/', ensureAuth, (req, res) => {
    res.render('stats');
});

module.exports = router;
