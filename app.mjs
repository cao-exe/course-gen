import './config.mjs';
import './db.mjs';
import express from 'express'
import session from 'express-session';
import path from 'path'
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import hbs from 'hbs';
import passport from 'passport';
import * as auth from './auth.mjs';



const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set('view engine', 'hbs');
app.set('views', path.join(process.cwd(), 'src', 'views')); 
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: 'secret', // Replace with a secure secret key
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set secure: true if using HTTPS in production
}));

// Bootstrap Middleware
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/css', express.static(path.join(__dirname, 'src/public/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

const Course = mongoose.model('Course');
const Schedule = mongoose.model('Schedule');
const User = mongoose.model('User');

// Passport strategy for local authentication
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));

/////////////////////////////////////////////////////////



app.get('/', (req, res) => {
    res.redirect('login');
    }
);


app.get('/register', (req, res) => {
    res.render('register',{noNavbar: true});
    }
);
app.post('/register', auth.registerUser);
app.get('/login', (req, res) => {   
    res.render('login',{noNavbar: true});
    }
);
app.post('/login', auth.loginUser);
app.get('/logout', auth.logoutUser);

app.get('/index', async (req, res) => {
    if (req.isAuthenticated()) {
        const user = await User.findById(req.user._id).populate('courses').populate({
            path: 'schedules',
            populate: {
                path: 'courses',
                model: 'Course'
            }
        })
        .populate('savedschedules') // Populate saved schedules
        .exec();
        res.render('index', {user});
    } else {
        res.redirect('/login');
    }
});

app.get('/add-course', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('add-course')
    }
    else {
        res.redirect('/login');
    }
});

app.post('/add-course', async (req, res) => {
    const { title, professor, days, startTime, endTime, courseCredits, priority } = req.body;
    const course = new Course({
        user: req.user._id, // Set to the authenticated user's ID
        title,
        professor,
        days,
        startTime,
        endTime,
        courseCredits,
        priority: !!priority,
        createdAt: new Date()
    });
    await course.save();
    try {
        await User.findByIdAndUpdate(req.user._id, { $push: { courses: course._id } }).exec();
    } catch (err) {
        console.error(err);
    }
    res.redirect('index');
}
);



async function generateSchedulesForUser(userId) {
    try {
      // Fetch all courses for the user
      const courses = await Course.find({ user: userId });
  
      // Generate all valid combinations under the credit limit without time conflicts
      const courseCombinations = getAllValidCombinations(courses, 18);
  
      const schedules = [];
  
      for (let i = 0; i < courseCombinations.length; i++) {
        const combination = courseCombinations[i];
  
        // Calculate total credits and priority count
        const totalCredits = combination.reduce((sum, course) => sum + course.courseCredits, 0);
        const priorityCount = combination.filter(course => course.priority).length;
  
        // Create a new schedule document
        const schedule = new Schedule({
          user: userId,
          name: `Schedule ${i + 1}`,
          courses: combination.map(course => course._id),
          priorityCount: priorityCount,
          totalCredits: totalCredits,
        });
  
        // Save the schedule to the database
        await schedule.save();
        schedules.push(schedule);
      }
  
      // Sort the schedules by priorityCount in descending order
      schedules.sort((a, b) => {
        if (b.priorityCount === a.priorityCount) {
          return b.totalCredits - a.totalCredits;
        }
        return b.priorityCount - a.priorityCount;
      });
      return schedules;
    } catch (error) {
      console.error('Error generating schedules:', error);
      throw error;
    }
  }
  
  // Helper function to generate all valid combinations under the credit limit without time conflicts
  function getAllValidCombinations(courses, creditLimit) {
    const results = [];
    const totalCourses = courses.length;
  
    // Total number of combinations is 2^n (excluding the empty set)
    const totalCombinations = Math.pow(2, totalCourses);
  
    for (let i = 1; i < totalCombinations; i++) {
      const combination = [];
      let totalCredits = 0;
      let valid = true;
  
      for (let j = 0; j < totalCourses; j++) {
        // Check if the j-th bit is set in i
        if (i & (1 << j)) {
          const course = courses[j];
  
          // Check for time conflicts with existing courses in the combination
          for (const existingCourse of combination) {
            if (hasTimeConflict(course, existingCourse)) {
              valid = false;
              break;
            }
          }
  
          if (!valid) {
            break;
          }
  
          combination.push(course);
          totalCredits += course.courseCredits;
  
          // Early exit if totalCredits exceeds creditLimit
          if (totalCredits > creditLimit) {
            valid = false;
            break;
          }
        }
      }
  
      // Add combination if it's valid and totalCredits is within the limit
      if (valid && totalCredits <= creditLimit) {
        results.push(combination);
      }
    }
  
    return results;
  }
  
  // Helper function to check for time conflicts between two courses
  function hasTimeConflict(course1, course2) {
    // Check if the courses share any days
    const sharedDays = course1.days.filter(day => course2.days.includes(day));
    if (sharedDays.length === 0) {
      // No shared days, so no conflict
      return false;
    }
  
    // Convert start and end times to minutes
    const start1 = parseTime(course1.startTime);
    const end1 = parseTime(course1.endTime);
    const start2 = parseTime(course2.startTime);
    const end2 = parseTime(course2.endTime);
  
    // Check for time overlap
    const overlap = start1 < end2 && start2 < end1;
    return overlap;
  }
  
  // Helper function to parse time strings in "HH:mm" format to minutes
  function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }


app.post('/generate-schedules', async (req, res) => {
    if (req.isAuthenticated()) {
        await Schedule.deleteMany({ user: req.user._id }).exec();
        const schedules = await generateSchedulesForUser(req.user._id);
        console.log('Generated schedules:', schedules);
        for (const schedule of schedules) {
            schedule.user = req.user._id;
            await schedule.save();
            await User.findByIdAndUpdate(req.user._id, { $push: { schedules: schedule._id } }).exec();
        }
        res.redirect('index');
    } else {
        res.redirect('/login');
    }
});

app.post('/delete-course/:id', async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const courseId = req.params.id;
        
            // Verify that the course belongs to the user
            const course = await Course.findOne({ _id: courseId, user: req.user._id });
            if (!course) {
                return res.status(404).send('Course not found');
            }
        
            // Delete the course
            await Course.findByIdAndDelete(courseId);
            
            // Update the user's courses array
            await User.findByIdAndUpdate(req.user._id, { $pull: { courses: courseId } }).exec();
        
            // Redirect back to the courses page
            res.redirect('/index'); // Adjust the redirect path as needed
        } catch (error) {
            console.error('Error deleting course:', error);
            res.status(500).send('Server Error');
        }
    } else {
        res.redirect('/login');
    }
});

app.post('/save-schedule/:id', async (req, res) => {
  if (req.isAuthenticated()) {
      try {
          const scheduleId = req.params.id;

          // Find the schedule to be saved
          const schedule = await Schedule.findById(scheduleId).populate('courses').exec();
          if (!schedule) {
              return res.status(404).send('Schedule not found');
          }

          // Create a SavedSchedule object
          const savedSchedule = new mongoose.model('SavedSchedule')({
              user: req.user._id,
              name: schedule.name,
              courses: schedule.courses.map(course => ({
                  title: course.title,
                  professor: course.professor,
                  priority: course.priority,
                  days: course.days,
                  startTime: course.startTime,
                  endTime: course.endTime,
                  courseCredits: course.courseCredits,
              })),
              priorityCount: schedule.priorityCount,
              totalCredits: schedule.totalCredits,
              createdAt: new Date(),
          });

          // Save the SavedSchedule to the database
          await savedSchedule.save();

          // Add the saved schedule to the user's `savedschedules` array
          await User.findByIdAndUpdate(req.user._id, { $push: { savedschedules: savedSchedule._id } }).exec();

          res.redirect('/index'); // Redirect back to the index page
      } catch (error) {
          console.error('Error saving schedule:', error);
          res.status(500).send('Server Error');
      }
  } else {
      res.redirect('/login');
  }
});

app.post('/delete-saved-schedule/:id', async (req, res) => {
  if (req.isAuthenticated()) {
      try {
          const savedScheduleId = req.params.id;

          // Verify that the saved schedule belongs to the user
          const savedSchedule = await mongoose.model('SavedSchedule').findOne({
              _id: savedScheduleId,
              user: req.user._id,
          });
          if (!savedSchedule) {
              return res.status(404).send('Saved schedule not found');
          }

          // Delete the saved schedule
          await mongoose.model('SavedSchedule').findByIdAndDelete(savedScheduleId);

          // Remove the reference from the user's `savedschedules` array
          await User.findByIdAndUpdate(req.user._id, {
              $pull: { savedschedules: savedScheduleId },
          }).exec();

          res.redirect('/index'); // Redirect back to the index page
      } catch (error) {
          console.error('Error deleting saved schedule:', error);
          res.status(500).send('Server Error');
      }
  } else {
      res.redirect('/login');
  }
});



app.listen(process.env.PORT || 3000);
