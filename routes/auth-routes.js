const router = require('express').Router();
const passport = require('passport');

router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

router.get('/login', passport.authenticate('google', {
    scope: ['profile']
}));

router.get('/login/redirect', passport.authenticate('google'), (req, res) => {
    res.redirect('/chatroom');
});

module.exports = router;
