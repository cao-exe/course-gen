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


/////////////////////////////////////////////////////////



app.get('/', (req, res) => {
    res.redirect('login');
    }
);


app.get('/register', (req, res) => {
    res.render('register');
    }
);
app.post('/register', auth.registerUser);
app.get('/login', (req, res) => {   
    res.render('login');
    }
);
app.post('/login', auth.loginUser);
app.get('/logout', auth.logoutUser);

app.get('/index', async (req, res) => {
    if (req.isAuthenticated()) {
        const user = await User.findById(req.user._id).populate('courses').populate('schedules').exec();
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



// Functions below need to be tested

function isConflict(course1, course2) {
    const daysOverlap = course1.days.some(day => course2.days.includes(day));
    if (!daysOverlap) return false;

    const start1 = new Date(`1970-01-01T${course1.startTime}:00`);
    const end1 = new Date(`1970-01-01T${course1.endTime}:00`);
    const start2 = new Date(`1970-01-01T${course2.startTime}:00`);
    const end2 = new Date(`1970-01-01T${course2.endTime}:00`);

    return (start1 < end2 && start2 < end1);
}

function generatePermutations(courses) {
    const results = [];

    function permute(arr, m = []) {
        if (arr.length === 0) {
            results.push(m);
        } else {
            for (let i = 0; i < arr.length; i++) {
                const curr = arr.slice();
                const next = curr.splice(i, 1);
                permute(curr.slice(), m.concat(next));
            }
        }
    }

    permute(courses);
    return results;
}

function calculateCredits(courses) {
    return courses.reduce((total, course) => total + course.courseCredits, 0);
}

function generateSchedules(courses) {
    const nonConflictingPermutations = generatePermutations(courses).filter(permutation => {
        for (let i = 0; i < permutation.length; i++) {
            for (let j = i + 1; j < permutation.length; j++) {
                if (isConflict(permutation[i], permutation[j])) {
                    return false;
                }
            }
        }
        return true;
    });

    const validSchedules = nonConflictingPermutations.filter(permutation => calculateCredits(permutation) <= 18);

    const schedules = validSchedules.map(scheduleCourses => {
        const priorityCount = scheduleCourses.filter(course => course.priority).length;
        return new Schedule({
            user: null, // This should be set to the appropriate user ID
            name: 'Generated Schedule',
            courses: scheduleCourses.map(course => course._id),
            priorityCount: priorityCount,
            createdAt: new Date()
        });
    });

    // Sort schedules by priority count in descending order
    schedules.sort((a, b) => b.priorityCount - a.priorityCount);

    return schedules;
}






app.listen(process.env.PORT || 3000);
