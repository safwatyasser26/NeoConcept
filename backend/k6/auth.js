import { check, group, sleep } from "k6";
import { makeRequest, uniqueId, randomEmail, checkResponse, thinkTime, API_BASE_URL } from "./utils.js";
import http from "k6/http";

// Set expected status codes for all HTTP requests to avoid k6 treating non-200 responses as errors, which allows us to test various scenarios without prematurely failing the test.
// For example, some endpoints might return 401 for unauthorized access, and we want to check that behavior without k6 marking it as a failed request.
// We can adjust the expected status codes as needed based on the endpoints we are testing.
http.setResponseCallback(http.expectedStatuses(200, 201, 400, 401, 409));

// Number of virtual users and duration of the test can be adjusted as needed
export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    // 95% of requests should complete within 500ms, and 99% within 1000ms
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    // Less than 10% of requests should fail
    http_req_failed: ["rate<0.1"],
  },
};

export default function authLoadTest() {
  // Register
  // Register will always work and give us a status code that is not an error
  group("Auth - Signup", function () {
    const signupPayload = JSON.stringify({
      username: `user${uniqueId()}`,
      email: randomEmail(),
      password: "test123456",
      role: "STUDENT",
    });

    const response = makeRequest("POST", "/auth/signup", signupPayload);
    checkResponse(response, 201, "Signup");
    // Sleeping for 100ms to 500ms to simulate user think time after signup
    sleep(thinkTime());
  });

  // Login
  // Login will always work and give us a status code that is not an error, because first we register the user, then we login with the same credentials, so we can check for 200 only
  group("Auth - Login", function () {
    const testEmail = `test${uniqueId()}@test.com`;

    // First signup
    const signupPayload = JSON.stringify({
      username: `user${uniqueId()}`,
      email: testEmail,
      password: "test123456",
      role: "STUDENT",
    });

    // Have to signup first to ensure the user exists before trying to login
    makeRequest("POST", "/auth/signup", signupPayload);

    // Then try to login
    const loginPayload = JSON.stringify({
      email: testEmail,
      password: "test123456",
    });

    const loginResponse = makeRequest("POST", "/auth/login", loginPayload);
    checkResponse(loginResponse, 200, "Login");
    // Sleeping for 100ms to 500ms to simulate user think time after login
    sleep(thinkTime());

    // Logout after login
    const logoutResponse = makeRequest("GET", "/auth/logout", "");
    // The logout will return 200 and we'll remove the jwt cookie while will make the current virutal user logged out
    checkResponse(logoutResponse, 200, "Logout");
    sleep(thinkTime());
  });

  // Check auth status
  // * We made the user logged out so that this route will return us 401 as we're not logged in (We don't have the jwt cookie)
  group("Auth - Check Status", function () {
    const response = http.get(`${API_BASE_URL}/auth`);

    // Should be 401 since not authenticated
    check(response, {
      "Auth check status is 401": (r) => r.status === 401,
    });
    sleep(thinkTime());
  });

  group("Auth - Resend Confirmation Email", function () {
    const resendEmail = randomEmail();

    // Signup first
    const signupPayload = JSON.stringify({
      username: `user${uniqueId()}`,
      email: resendEmail,
      password: "test123456",
      role: "STUDENT",
    });

    const signupResponse = http.post(`${API_BASE_URL}/auth/signup`, signupPayload, {
      headers: { "Content-Type": "application/json" },
    });
    checkResponse(signupResponse, 201, "Resend confirmation signup");

    // Resend confirmation
    // ! If the email is confirmed, it will not work and will return 400 (This will happen when the enviorment is development but in production the email will not be confirmed so it will work and return 201, so we can check for both 201 and 400)
    const resendPayload = JSON.stringify({
      email: resendEmail,
    });

    const response = makeRequest("POST", "/auth/resend-confirmation-email", resendPayload);
    check(response, {
      "Resend confirmation email status is 201 or 400": (r) => r.status === 201 || r.status === 400,
    });
    sleep(thinkTime());
  });

  group("Auth - Forgot Password", function () {
    const testEmail = randomEmail();

    // Signup first
    const signupPayload = JSON.stringify({
      username: `user${uniqueId()}`,
      email: testEmail,
      password: "test123456",
      role: "STUDENT",
    });

    http.post(`${API_BASE_URL}/auth/signup`, signupPayload, {
      headers: { "Content-Type": "application/json" },
    });

    // Request password reset
    // * will work because it's not related to the login logic
    // * will alaways return 201 because it will not check if the email exists or not to avoid email enumeration, so we can check for 201 only
    const forgotPayload = JSON.stringify({
      email: testEmail,
    });

    const response = makeRequest("POST", "/auth/forgot-password", forgotPayload);

    check(response, {
      "Forgot password status is 201": (r) => r.status === 201,
    });
    sleep(thinkTime());
  });
}
