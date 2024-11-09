import mongoose from 'mongoose';
import dotenv from 'dotenv';
import passportLocalMongoose from 'passport-local-mongoose';

dotenv.config();
mongoose.connect(process.env.DSN)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Error connecting to MongoDB', err));



// User Schema
/**
 * User schema definition.
 * 
 * @typedef {Object} UserSchema
 * @property {string} username - The unique username of the user. Required.
 * @property {Array<ObjectId>} schedules - An array of schedule references associated with the user.
 * @property {Array<ObjectId>} courses - An array of course references associated with the user.
 */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  schedules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Schedule' }],
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
});

// Schedule Schema
/**
 * Schedule schema definition.
 * 
 * @typedef {Object} Schedule
 * @property {ObjectId} user - Reference to the User who owns the schedule. Required.
 * @property {string} name - The name of the schedule. Required.
 * @property {ObjectId[]} courses - Array of references to Course objects.
 * @property {number} priorityCount - The number of priority courses. Defaults to 0.
 * @property {Date} [createdAt=Date.now] - The date when the schedule was created. Defaults to the current date.
 */
const scheduleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  priorityCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Course Schema
/**
 * Course schema definition.
 * 
 * @typedef {Object} Course
 * @property {Schema.Types.ObjectId} user - Reference to the User schema, required.
 * @property {string} title - Title of the course, required.
 * @property {string} professor - Name of the professor, required.
 * @property {boolean} [priority=false] - Indicates if the course is a priority, defaults to false.
 * @property {string[]} days - Days the course is held, required.
 * @property {string} startTime - Start time of the course, required.
 * @property {string} endTime - End time of the course, required.
 * @property {number} courseCredits - Number of credits the course is worth, required.
 * @property {Date} [createdAt=Date.now] - Date when the course was created, defaults to current date.
 */
const courseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  professor: { type: String, required: true },
  priority: { type: Boolean, default: false },
  days: { type: [String], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  courseCredits: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});


userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);
const Schedule = mongoose.model('Schedule', scheduleSchema);
const Course = mongoose.model('Course', courseSchema);

mongoose.model('User', userSchema);
mongoose.model('Schedule', scheduleSchema);
mongoose.model('Course', courseSchema);

export { User, Schedule, Course };