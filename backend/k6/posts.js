import http from "k6/http";
import { check, group, sleep } from "k6";
import {
  API_BASE_URL,
  login,
  loginStudent,
  logout,
  makeRequest,
  uniqueId,
  checkResponse,
  thinkTime,
  setupAllTestUsers,
} from "./utils.js";

http.setResponseCallback(http.expectedStatuses(200, 201, 403, 404, 409));

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.1"],
  },
};

let courseId = null;
let postId = null;
let instructorId = null;
let trackId = null;

export default function postsLoadTest() {
  // Setup all test user roles once (signup each role one time)
  setupAllTestUsers();
  sleep(thinkTime());

  // Get the instructor id so the course can be created with an instructor member.
  login("INSTRUCTOR");
  sleep(thinkTime());

  // * We need to get an instructor ID to create a course with an instructor, and we need a track ID to create a course under that track, so we get both of those before we logout and login again as admin to create the course.
  group("Posts - Setup: Get Instructor", function () {
    const response = makeRequest("GET", "/auth");
    check(response, {
      "Get instructor auth status is 200": (r) => r.status === 200,
    });

    try {
      const body = JSON.parse(response.body);
      if (body.data && body.data.id) {
        // Getting the id of the authenticated instructor user to use it later when creating a course with an instructor member, and also to assign the instructor to a track later.
        instructorId = body.data.id;
      }
    } catch (e) {
      // Continue
    }
    sleep(thinkTime());
  });

  // * This one is not protected and we only use it to get a track id
  // will always get 200 if there are no tracks
  group("Posts - Setup: Get Tracks", function () {
    const response = http.get(`${API_BASE_URL}/tracks`, {
      headers: { "Content-Type": "application/json" },
    });
    checkResponse(response, 200, "List Tracks for Posts Setup");
    try {
      const body = JSON.parse(response.body);
      if (body.data && Array.isArray(body.data) && body.data.length > 0) {
        trackId = body.data[0].id;
      }
    } catch (e) {
      // Continue
    }
    sleep(thinkTime());
  });

  // Getting back to the instructor account to assign him to the track, because only instructors assigned to a track can be added as members to a course under that track, and we want to create a course with an instructor member, so we need to assign the instructor to the track first.
  if (trackId && instructorId) {
    group("Posts - Assign Instructor To Track", function () {
      const trackPayload = JSON.stringify({
        trackId: trackId,
      });

      const response = makeRequest("PATCH", "/user/select-track", trackPayload);
      check(response, {
        "Assign instructor to track status is 200": (r) => r.status === 200,
      });
      sleep(thinkTime());
    });

    // Getting out of the instructor and becoming an admin
    logout();
    login();
    sleep(thinkTime());

    // * here we create the course with the instructor as a member, because only instructors assigned to a track can be added as members to a course under that track, and we want to create a course with an instructor member, so we need to assign the instructor to the track first, and then create the course with the instructor as a member.
    group("Posts - Create Instructor Course", function () {
      const coursePayload = JSON.stringify({
        name: `LoadTestCourse${uniqueId()}`,
        description: "Load test course",
        trackId: trackId,
        instructorIds: [instructorId],
      });

      const response = makeRequest("POST", "/courses", coursePayload);
      check(response, {
        "Create course with instructor status is 201": (r) => r.status === 201,
      });

      try {
        const body = JSON.parse(response.body);
        if (body.data && body.data.id) {
          courseId = body.data.id;
        }
      } catch (e) {
        // Continue
      }
      sleep(thinkTime());
    });

    logout();
    login("INSTRUCTOR");
    sleep(thinkTime());

    // Now we can move freely with our logic
    // List posts in a course
    group("Posts - List Posts in Course", function () {
      const response = makeRequest("GET", `/courses/${courseId}/posts`);
      check(response, {
        "List posts status is 200": (r) => [200].includes(r.status),
      });

      try {
        const body = JSON.parse(response.body);
        if (body.data && Array.isArray(body.data) && body.data.length > 0) {
          postId = body.data[0].id;
        }
      } catch (e) {
        // Continue
      }
      sleep(thinkTime());
    });

    // Create a post as instructor
    group("Posts - Create Post", function () {
      const postPayload = JSON.stringify({
        title: `LoadTest Post ${uniqueId()}`,
        content: "This is a load test post content",
      });

      const response = makeRequest("POST", `/courses/${courseId}/posts`, postPayload);
      check(response, {
        "Create post status is 201": (r) => [201].includes(r.status),
      });

      try {
        const body = JSON.parse(response.body);
        if (body.data && body.data.id) {
          postId = body.data.id;
        }
      } catch (e) {
        // Continue
      }
      sleep(thinkTime());
    });

    logout();
    loginStudent();
    sleep(thinkTime());

    // This one will fail because students are not allowed to create posts, but we want to test that the endpoint is protected and returns the correct status code for unauthorized access.
    group("Posts - Create Post As Student", function () {
      const postPayload = JSON.stringify({
        title: `LoadTest Student Post ${uniqueId()}`,
        content: "This is a load test post content",
      });

      const response = makeRequest("POST", `/courses/${courseId}/posts`, postPayload);
      check(response, {
        "Create post as student status is 403": (r) => r.status === 403,
      });
      sleep(thinkTime());
    });

    logout();
    login("INSTRUCTOR");
    sleep(thinkTime());

    if (postId) {
      group("Posts - Get Post by ID", function () {
        const response = makeRequest("GET", `/courses/${courseId}/posts/${postId}`);
        check(response, {
          "Get post status is 200 or 404": (r) => [200, 404].includes(r.status),
        });
        sleep(thinkTime());
      });

      group("Posts - Update Post", function () {
        const updatePayload = JSON.stringify({
          title: `Updated Post ${uniqueId()}`,
          content: "Updated content",
        });

        const response = makeRequest("PATCH", `/courses/${courseId}/posts/${postId}`, updatePayload);
        check(response, {
          "Update post status is 200 or 404": (r) => [200, 404].includes(r.status),
        });
        sleep(thinkTime());
      });

      group("Posts - Delete Post", function () {
        const response = makeRequest("DELETE", `/courses/${courseId}/posts/${postId}`);
        check(response, {
          "Delete post status is 200 or 404": (r) => [200, 404].includes(r.status),
        });
        sleep(thinkTime());
      });
    }

    group("Posts - Search Posts", function () {
      const response = makeRequest("GET", `/courses/${courseId}/posts?search=test`);
      check(response, {
        "Search posts status is 200": (r) => [200].includes(r.status),
      });
      sleep(thinkTime());
    });
  }
}
