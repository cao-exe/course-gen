import request from 'supertest'; // Supertest for HTTP assertions
import { expect } from 'chai'; // Chai for assertions
import { app, parseTime, hasTimeConflict, getAllValidCombinations, generateSchedulesForUser} from '../app.mjs'; // Import your Express app
import mongoose from 'mongoose'; // Mongoose for database operations
import { User, Course, Schedule } from '../db.mjs'; // Import models from your DB file

describe('Express Routes with Supertest (ES6)', function () {
  this.timeout(10000); // Set timeout for async operations

  let server; // Server instance

  before(async () => {
    // Connect to MongoDB
    await mongoose.connect(process.env.DSN, { useNewUrlParser: true, useUnifiedTopology: true });

    // Start the server
    server = app.listen();
  });

  after(async () => {
    // Cleanup: Remove all test data and disconnect from MongoDB
    await User.deleteMany({});
    await Course.deleteMany({});
    await Schedule.deleteMany({});
    await mongoose.disconnect();
    server.close();
  });

  describe('No authentication ', () => {
    it('should redirect to login page when accessing /index without login', async () => {
      const res = await request(app).get('/index');
      expect(res.status).to.equal(302); // Expect redirect
      expect(res.header.location).to.include('/login'); // Check redirect location
    });
  });
  
  describe('Password Length', () => {
    it('should return error message', async () => {
      const res = await request(app).post('/register').send({
        username: 'newuser',
        password: 'short'
      });
      expect(res.status).to.equal(400); // Redirect after registration
    });
  });
  
  describe('parseTime', () => {
    it('should convert "10:30" to 630 minutes', () => {
      const result = parseTime('10:30');
      expect(result).to.equal(630);
    });

    it('should convert "00:00" to 0 minutes', () => {
      const result = parseTime('00:00');
      expect(result).to.equal(0);
    });

    it('should convert "23:59" to 1439 minutes', () => {
      const result = parseTime('23:59');
      expect(result).to.equal(1439);
    });
  });

  describe('hasTimeConflict', () => {
    const course1 = {
      days: ['Monday', 'Wednesday'],
      startTime: '10:00',
      endTime: '11:00',
    };

    const course2 = {
      days: ['Monday'],
      startTime: '10:30',
      endTime: '11:30',
    };

    const course3 = {
      days: ['Tuesday'],
      startTime: '12:00',
      endTime: '13:00',
    };

    it('should return true for conflicting courses', () => {
      const result = hasTimeConflict(course1, course2);
      expect(result).to.be.true;
    });

    it('should return false for non-conflicting courses', () => {
      const result = hasTimeConflict(course1, course3);
      expect(result).to.be.false;
    });
  
      });
  });