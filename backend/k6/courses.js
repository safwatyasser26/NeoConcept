import http from "k6/http";
import { check, group, sleep } from "k6";
import {
  API_BASE_URL,
  login,
  loginStudent,
  loginInstructorOrAssistant,
  makeRequest,
  uniqueId,
  checkResponse,
  thinkTime,
  logout,
  setupAllTestUsers,
} from "./utils.js";

// Set expected status codes for all HTTP requests to avoid k6 treating non-200 responses as errors, which allows us to test various scenarios without prematurely failing the test.
// For example, some endpoints might return 403 for unauthorized access, and we want to check that behavior without k6 marking it as a failed request.
// We can adjust the expected status codes as needed based on the endpoints we are testing.
// ! We added 409 because in the logging when we create user, they may be exist before in the database so this will give us 409
http.setResponseCallback(http.expectedStatuses(200, 201, 400, 403, 409));

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.1"],
  },
};

let courseId = null;
let trackId = null;

export default function coursesLoadTest() {
  // Setup all test user roles once (signup each role one time)
  setupAllTestUsers();
  sleep(thinkTime());

  // * Get all courses (public endpoint)
  group("Courses - List All", function () {
    // All coursers will always give 200 and a list (Empty or not) so we can check for 200 only
    const response = http.get(`${API_BASE_URL}/courses`, {
      headers: { "Content-Type": "application/json" },
    });
    checkResponse(response, 200, "List Courses");

    // * Extract a course ID for later use
    try {
      const body = JSON.parse(response.body);
      if (body.data && Array.isArray(body.data) && body.data.length > 0) {
        courseId = body.data[0].id;
      }
    } catch (e) {
      // Continue even if parsing fails
    }
    sleep(thinkTime());
  });

  // * Get course by ID
  if (courseId) {
    group("Courses - Get by ID", function () {
      const response = http.get(`${API_BASE_URL}/courses/${courseId}`, {
        headers: { "Content-Type": "application/json" },
      });
      // We don't have to test for 404 here because we got the ID from the previous request, so it should exist. If it doesn't, it's a problem.
      checkResponse(response, 200, "Get Course by ID");
      sleep(thinkTime());
    });
  }

  // * Search courses
  group("Courses - Search", function () {
    // Searching for "test" should return 200 with a list (even if empty), so we can check for 200 only
    // In the database we search in message or description so searching for "test" should return some results because we have "Load test course" in the description of the created courses in the previous test
    const response = http.get(`${API_BASE_URL}/courses?search=test`, {
      headers: { "Content-Type": "application/json" },
    });
    checkResponse(response, 200, "Search Courses");
    sleep(thinkTime());
  });

  // * Get all tracks so we can filter courses by a real track id
  group("Tracks - List All", function () {
    const response = http.get(`${API_BASE_URL}/tracks`, {
      headers: { "Content-Type": "application/json" },
    });
    checkResponse(response, 200, "List Tracks");

    try {
      const body = JSON.parse(response.body);
      if (body.data && Array.isArray(body.data) && body.data.length > 0) {
        trackId = body.data[0].id;
      }
    } catch (e) {
      // Continue even if parsing fails
    }
    sleep(thinkTime());
  });

  // * Filter by track
  if (trackId) {
    group("Courses - Filter by Track", function () {
      const response = http.get(`${API_BASE_URL}/courses?track=${trackId}`, {
        headers: { "Content-Type": "application/json" },
      });
      checkResponse(response, 200, "Filter Courses by Track");
      sleep(thinkTime());
    });
  }

  if (courseId) {
    // Join flow should run as student

    loginStudent();
    sleep(thinkTime());

    group("Courses - Join Course", function () {
      const joinPayload = JSON.stringify({
        courseId: courseId,
      });

      const response = makeRequest("PATCH", "/user/join-course", joinPayload);
      check(response, {
        "Join course status is 200 or 400 or 403": (r) => [200, 400, 403].includes(r.status), // 400 if it has no instructors
      });
      sleep(thinkTime());
    });

    // Try to join course as instructor (should get 403)
    logout();
    loginInstructorOrAssistant();
    sleep(thinkTime());

    group("Courses - Join Course As Instructor", function () {
      const joinPayload = JSON.stringify({
        courseId: courseId,
      });

      const response = makeRequest("PATCH", "/user/join-course", joinPayload);
      check(response, {
        "Join course as instructor status is 403": (r) => r.status === 403,
      });
      sleep(thinkTime());
    });
  }

  // Create course (admin only)
  if (trackId) {
    group("Courses - Create (Admin only)", () => {
      // Logging in as admin to create a course.
      logout();
      login();
      sleep(thinkTime());

      const coursePayload = JSON.stringify({
        name: `LoadTestCourse${uniqueId()}`,
        description: "Load test course",
        trackId: trackId,
      });

      const response = makeRequest("POST", "/courses", coursePayload);
      check(response, {
        "Create course status is 201": (r) => [201].includes(r.status),
      });
      sleep(thinkTime());
    });
  }
}
