import './config.mjs';
import passport from 'passport';
import mongoose from 'mongoose';

const User = mongoose.model('User');


// Function to configure Passport and session

// Registration Handler
const registerUser = async (req, res) => {
    try {
      const newUser = new User({ username: req.body.username });
      await User.register(newUser, req.body.password);
      passport.authenticate('local')(req, res, () => {
        res.redirect('/index');
      });
    } catch (err) {
      res.status(400).send(err.message);
    }
  };

// Login handler
const loginUser = passport.authenticate('local', {
    successRedirect: '/index',
    failureRedirect: '/login',
  });

// Logout handler
const logoutUser = (req, res) => {
req.logout(() => {
    res.redirect('/');
});
};


export {registerUser, loginUser, logoutUser };