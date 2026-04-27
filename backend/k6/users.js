import http from "k6/http";
import { check, group, sleep } from "k6";
import {
  makeRequest,
  uniqueId,
  randomEmail,
  checkResponse,
  thinkTime,
  API_BASE_URL,
  login,
  loginStudent,
  loginInstructorOrAssistant,
  logout,
  setupAllTestUsers,
} from "./utils.js";

// Set expected status codes for all HTTP requests to avoid k6 treating non-200 responses as errors, which allows us to test various scenarios without prematurely failing the test.
// For example, some endpoints might return 403 for unauthorized access, and we want to check that behavior without k6 marking it as a failed request.
// We can adjust the expected status codes as needed based on the endpoints we are testing.
http.setResponseCallback(http.expectedStatuses(200, 201, 403, 409));

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.1"],
  },
};

export default function usersLoadTest() {
  // Setup all test user roles once (signup each role one time)
  setupAllTestUsers();
  sleep(thinkTime());

  // Login as admin for initial endpoints
  login();
  sleep(thinkTime());

  group("Users - Get Tracks", function () {
    // * Make an authenticated request to get user tracks (We have to be logged in to access this endpoint, so we call login() at the beginning of the test)
    const response = makeRequest("GET", "/user/tracks");
    checkResponse(response, 200, "Get User Tracks");
    sleep(thinkTime());
  });

  group("Users - Get Courses", function () {
    // * Make an authenticated request to get user courses (We have to be logged in to access this endpoint, so we call login() at the beginning of the test)
    // We'll get 200 even if there are no tracks
    const response = makeRequest("GET", "/user/courses");
    checkResponse(response, 200, "Get User Courses");
    sleep(thinkTime());
  });

  group("Users - Update Profile", function () {
    // * Updating user profile with a new username
    // will always work, because we're logged in and also we're providing the username to update also the user is not deleted
    const updatePayload = JSON.stringify({
      username: `updated_user${uniqueId()}`,
    });

    const response = makeRequest("PATCH", "/user", updatePayload);
    // We expect a 200 status code for a successful update, but we might also get a 400 if the username is already taken or if there's some validation error. Since we're generating a unique username, we should mostly see 200, but we want to allow for 400 as well in our checks.
    check(response, {
      "Update user status is 200 or 400": (r) => r.status === 200 || r.status === 400, // Allowing 400 in case of validation errors, but we want to ensure that the endpoint is responsive and handles the request correctly, whether it succeeds or fails due to validation. ! 400 will not happen
    });
    sleep(thinkTime());
  });

  group("Users - Get Staff Requests", function () {
    logout();
    loginInstructorOrAssistant();
    sleep(thinkTime());

    // * Make an authenticated request to get staff requests
    // This route requires INSTRUCTOR or ASSISTANT role.
    const response = makeRequest("GET", "/user/staff-requests");
    check(response, {
      "Get staff requests status is 200": (r) => r.status === 200,
    });
    sleep(thinkTime());
  });

  group("Users - Get Staff Requests As Student", function () {
    logout();
    loginStudent();
    sleep(thinkTime());

    // * Make an authenticated request to get staff requests with the wrong role
    // Students should not be allowed to access staff requests.
    const response = makeRequest("GET", "/user/staff-requests");
    check(response, {
      "Get staff requests as student status is 403": (r) => r.status === 403,
    });
    sleep(thinkTime());
  });

  group("Users - Get Student Requests", function () {
    logout();
    loginStudent();
    sleep(thinkTime());

    // * Make an authenticated request to get student requests
    const response = makeRequest("GET", "/user/student-requests");
    check(response, {
      "Get student requests status is 200": (r) => r.status === 200,
    });
    sleep(thinkTime());
  });

  group("Users - Get Student Requests As Instructor", function () {
    logout();
    loginInstructorOrAssistant();
    sleep(thinkTime());

    // * Make an authenticated request to get student requests with the wrong role
    // Instructors and assistants should not be allowed to access student requests.
    const response = makeRequest("GET", "/user/student-requests");
    check(response, {
      "Get student requests as instructor status is 403": (r) => r.status === 403,
    });
    sleep(thinkTime());
  });
}
