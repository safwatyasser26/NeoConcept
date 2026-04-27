import http from 'k6/http';
import { check, sleep } from 'k6';

// Use explicit IPv4 loopback by default to avoid localhost resolution issues on some environments.
export const API_BASE_URL_DEFAULT = 'http://127.0.0.1:9595/api/v1';
// Configurable base URL and test user credentials via environment variables
export const API_BASE_URL = __ENV.API_URL || API_BASE_URL_DEFAULT;

// Admin Test User
export const TEST_USER = {
  email: __ENV.TEST_EMAIL || 'loadtest@test.com',
  password: __ENV.TEST_PASSWORD || 'test123456',
  username: __ENV.TEST_USERNAME || 'loadtestuser',
};

// Student Test User
export const STUDENT_TEST_USER = {
  email: __ENV.TEST_STUDENT_EMAIL || `loadtest.student.${uniqueId()}@test.com`,
  password: __ENV.TEST_STUDENT_PASSWORD || 'test123456',
  username: __ENV.TEST_STUDENT_USERNAME || `lts${Math.random().toString(36).slice(2, 12)}`,
};

// Instructor Test User
export const INSTRUCTOR_TEST_USER = {
  email: __ENV.TEST_INSTRUCTOR_EMAIL || `loadtest.instructor.${uniqueId()}@test.com`,
  password: __ENV.TEST_INSTRUCTOR_PASSWORD || 'test123456',
  username: __ENV.TEST_INSTRUCTOR_USERNAME || `lti${Math.random().toString(36).slice(2, 12)}`,
};

// Assistant Test User
export const ASSISTANT_TEST_USER = {
  email: __ENV.TEST_ASSISTANT_EMAIL || `loadtest.assistant.${uniqueId()}@test.com`,
  password: __ENV.TEST_ASSISTANT_PASSWORD || 'test123456',
  username: __ENV.TEST_ASSISTANT_USERNAME || `lta${Math.random().toString(36).slice(2, 12)}`,
};

let authCookie = null;
const registeredByRole = {
  ADMIN: false,
  STUDENT: false,
  INSTRUCTOR: false,
  ASSISTANT: false,
};

// Helper function to normalize role input and ensure it's one of the expected roles, defaulting to 'ADMIN' if an invalid role is provided. This helps maintain consistency in user management across the test suite.
function normalizeRole(role = 'ADMIN') {
  const normalizedRole = `${role}`.toUpperCase();
  return ['ADMIN', 'STUDENT', 'INSTRUCTOR', 'ASSISTANT'].includes(normalizedRole) ? normalizedRole : 'ADMIN';
}

// Helper function to get the test user object based on the role. This allows us to easily retrieve the appropriate test user credentials for different roles when performing actions that require authentication.
function getUserForRole(role) {
  switch (normalizeRole(role)) {
    case 'STUDENT':
      return STUDENT_TEST_USER;
    case 'INSTRUCTOR':
      return INSTRUCTOR_TEST_USER;
    case 'ASSISTANT':
      return ASSISTANT_TEST_USER;
    default:
      return TEST_USER;
  }
}

// Signup a test user for a given role (called once during setup)
export function signupTestUser(role = 'ADMIN') {
  const normalizedRole = normalizeRole(role);
  if (registeredByRole[normalizedRole]) return;

  // Gives us the correct user object based on the role, which includes email, password, and username for the signup request.
  const user = getUserForRole(normalizedRole);

  // Payload for signup request, including the role to ensure the user is created with the correct permissions.
  const signupPayload = JSON.stringify({
    email: user.email,
    password: user.password,
    username: user.username,
    role: normalizedRole,
  });

  // Registering the test user by making a POST request to the signup endpoint with the appropriate payload and headers. The response is checked to ensure that the user was either created successfully (201) or already exists (409), which allows for idempotent setup across multiple test runs.
  const signupResponse = http.post(`${API_BASE_URL}/auth/signup`, signupPayload, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '10s',
  });

  // 201: created, 409: already exists.
  check(signupResponse, {
    [`${normalizedRole.toLowerCase()} test user signup is 201 or 409`]: (r) => r.status === 201 || r.status === 409,
  });

  registeredByRole[normalizedRole] = true;
}

// Setup all test users at the beginning of the test (signup once per role)
export function setupAllTestUsers() {
  signupTestUser('ADMIN');
  signupTestUser('STUDENT');
  signupTestUser('INSTRUCTOR');
  signupTestUser('ASSISTANT');
}

// The login function will be used across multiple test modules to authenticate and store the session cookie for subsequent requests.
// Does not signup; assumes setupAllTestUsers() was called once at test start.
export function login(role = 'ADMIN') {
  const normalizedRole = normalizeRole(role);
  const user = getUserForRole(normalizedRole);

  // Payload for login request
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  // Parameters for the login request, including headers
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '10s',
  };

  const response = http.post(`${API_BASE_URL}/auth/login`, loginPayload, params);
  // Checking the response status to ensure login was successful
  check(response, {
    [`login (${normalizedRole.toLowerCase()}) status is 200`]: (r) => r.status === 200,
  });

  // Extract cookie from Set-Cookie header
  const cookies = response && response.headers ? response.headers['Set-Cookie'] : null;
  if (cookies && cookies.length > 0) {
    authCookie = cookies[0];
  }

  return response;
}

// The same as login just this time we want to make a student user
export function loginStudent() {
  return login('STUDENT');
}

function normalizeStaffRole(role = '') {
  const normalized = `${role}`.toUpperCase();
  if (normalized === 'INSTRUCTOR' || normalized === 'ASSISTANT') {
    return normalized;
  }

  return Math.random() < 0.5 ? 'INSTRUCTOR' : 'ASSISTANT';
}

// Get or create one valid staff user for role-restricted staff requests routes.
export function createInstructorOrAssistant() {
  const staffRole = normalizeStaffRole(__ENV.TEST_STAFF_ROLE || '');

  return {
    role: staffRole,
    user: getUserForRole(staffRole),
  };
}

// The same as login just this time we want to make either an instructor or assistant user based on environment variable or random choice.
export function loginInstructorOrAssistant() {
  const { role } = createInstructorOrAssistant();
  return login(role);
}

export function logout() {
  const response = makeRequest('GET', '/auth/logout');
  clearAuthCookie();
  return response;
}


// Function to get the current auth cookie (if needed in other modules)
export function getAuthCookie() {
  return authCookie;
}

// Function to clear the auth cookie (for logout or cleanup)
export function clearAuthCookie() {
  authCookie = null;
}

// Helper function to make authenticated requests using the stored auth cookie
export function makeRequest(method, path, payload = null, params = {}) {
  const url = `${API_BASE_URL}${path}`;
  // Merge default headers with any additional params provided
  const defaultParams = {
    ...params,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie || '',
      ...(params.headers || {}),
    },
  };

  let response;
  // Switch case to handle different HTTP methods
  switch (method.toUpperCase()) {
    case 'GET':
      response = http.get(url, defaultParams);
      break;
    case 'POST':
      response = http.post(url, payload, defaultParams);
      break;
    case 'PUT':
      response = http.put(url, payload, defaultParams);
      break;
    case 'PATCH':
      response = http.patch(url, payload, defaultParams);
      break;
    case 'DELETE':
      response = http.del(url, defaultParams);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }

  return response;
}


// Helper function to generate a unique ID for test data
export function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to generate a random email address for testing purposes
export function randomEmail() {
  return `test${uniqueId()}@test.com`;
}

// Helper function to check response status and body for a given description, used across multiple test modules for consistency in assertions
export function checkResponse(response, expectedStatus, description) {
  const hasBody = !!(response && typeof response.body === 'string' && response.body.length > 0);

  check(response, {
    [`${description} - Status ${expectedStatus}`]: (r) => !!r && r.status === expectedStatus,
    [`${description} - Has body`]: () => hasBody,
  });
}

// Helper function to simulate user think time between actions, with configurable minimum and maximum delay in milliseconds
export function thinkTime(minMs = 100, maxMs = 500) {
  // k6 sleep() expects seconds, while callers pass milliseconds.
  const delayMs = Math.random() * (maxMs - minMs) + minMs;
  return delayMs / 1000;
}
