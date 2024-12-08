import './config.mjs';
import passport from 'passport';
import mongoose from 'mongoose';

const User = mongoose.model('User');


// Function to configure Passport and session

// Registration Handler
const registerUser = async (req, res) => {
  try {
      const { username, password } = req.body;

      // Check password length
      if (password.length < 8) {
          return res.status(400).send("Password must be at least 8 characters long");
      }

      const newUser = new User({ username });
      await User.register(newUser, password);
      passport.authenticate('local')(req, res, () => {
          res.redirect('/index');
      });
  } catch (err) {
      res.status(400).send("Registration failed");
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