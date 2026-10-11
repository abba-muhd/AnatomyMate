const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatMessages = document.getElementById("chat-messages");

if (chatForm) {
chatForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const message = userInput.value.trim();

    if (message === "") {
        return;
    }

    // Show user's message
    const userMessage = document.createElement("div");
    userMessage.className = "message user";
    userMessage.textContent = message;

    chatMessages.appendChild(userMessage);

    // Clear input
    userInput.value = "";

    // Show thinking message
    const thinkingMessage = document.createElement("div");
    thinkingMessage.className = "message bot";
    thinkingMessage.textContent = "Thinking...";

    chatMessages.appendChild(thinkingMessage);

    try {

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionStorage.getItem("anatomymate_token")}`
            },
            body: JSON.stringify({
                message: message
            })
        });

        if (!response.ok) {
            throw new Error("Server error");
        }

        const data = await response.json();

        thinkingMessage.innerHTML = marked.parse(data.reply);

    } catch (error) {

        console.error(error);

        thinkingMessage.textContent =
            "❌ I couldn't connect to the AnatomyMate server.";
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
});
}

// Make anatomy topic cards clickable
const topicCards = document.querySelectorAll(".topic-card");

topicCards.forEach((card) => {
    card.addEventListener("click", () => {
        const topic = card.querySelector("h3").textContent;

        userInput.value = `Teach me ${topic}. Start with the basic concepts and important exam topics.`;

        userInput.focus();
    });
});

// Suggested question buttons
const suggestionButtons = document.querySelectorAll(".suggestion");

suggestionButtons.forEach((button) => {
    button.addEventListener("click", () => {
        userInput.value = button.textContent;
        chatForm.dispatchEvent(new Event("submit"));
    });
});

// ===============================
// INTERACTIVE ANATOMY QUIZ
// ===============================

let quizQuestions = [];

let currentQuestion = 0;
let quizScore = 0;

const quizContainer = document.getElementById("quiz-container");
const quizQuestion = document.getElementById("quiz-question");
const quizOptions = document.getElementById("quiz-options");
const quizProgress = document.getElementById("quiz-progress");
const quizScoreDisplay = document.getElementById("quiz-score");
const quizFeedback = document.getElementById("quiz-feedback");
const nextQuestionButton = document.getElementById("next-question");
const startQuizButton = document.getElementById("start-quiz");

async function startInteractiveQuiz() {
    quizScore = 0;
    currentQuestion = 0;

    startQuizButton.disabled = true;
    startQuizButton.textContent = "Generating Quiz...";

    try {
        const response = await fetch("/api/quiz", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionStorage.getItem("anatomymate_token")}`
            },
            body: JSON.stringify({
                topic: "Human Anatomy",
                difficulty: "undergraduate",
                number: 10
            })
        });

        if (!response.ok) {
            throw new Error("Failed to generate quiz");
        }

        const data = await response.json();

        if (!data.questions || data.questions.length === 0) {
            throw new Error("No quiz questions received");
        }

        quizQuestions = data.questions;

        quizContainer.style.display = "block";
        showQuestion();

    } catch (error) {
        console.error(error);
        alert("❌ Could not generate the AI quiz. Please try again.");
    }

    startQuizButton.disabled = false;
    startQuizButton.textContent = "🎯 Start Anatomy Quiz";
}

function showQuestion() {

    const question = quizQuestions[currentQuestion];

    quizProgress.textContent =
        `Question ${currentQuestion + 1} of ${quizQuestions.length}`;

    quizScoreDisplay.textContent =
        `Score: ${quizScore}`;

    quizQuestion.textContent = question.question;

    quizOptions.innerHTML = "";

    quizFeedback.textContent = "";

    nextQuestionButton.style.display = "none";

    question.options.forEach((option, index) => {

        const button = document.createElement("button");

        button.textContent =
            `${String.fromCharCode(65 + index)}. ${option}`;

        button.className = "quiz-option";

        button.addEventListener("click", () => {
            checkAnswer(index);
        });

        quizOptions.appendChild(button);
    });
}

function checkAnswer(selectedAnswer) {

    const question = quizQuestions[currentQuestion];

    const optionButtons =
        document.querySelectorAll(".quiz-option");

    optionButtons.forEach(button => {
        button.disabled = true;
    });

    if (selectedAnswer === question.answer) {

        quizScore++;

        quizFeedback.textContent = "✅ Correct!";

    } else {

        quizFeedback.textContent =
            `❌ Incorrect. The correct answer is ` +
            `${String.fromCharCode(65 + question.answer)}. ` +
            `${question.options[question.answer]}`;
    }

    quizScoreDisplay.textContent =
        `Score: ${quizScore}`;

    nextQuestionButton.style.display = "block";
}

if (nextQuestionButton) {
    nextQuestionButton.addEventListener("click", () => {

    currentQuestion++;

    if (currentQuestion < quizQuestions.length) {

        showQuestion();

    } else {

        quizQuestion.textContent = "🎉 Quiz Complete!";

        quizOptions.innerHTML = "";

        quizFeedback.textContent =
            `You scored ${quizScore} out of ${quizQuestions.length}.`;

        quizProgress.textContent = "Completed";

        nextQuestionButton.style.display = "none";

        startQuizButton.textContent = "🔄 Try Again";
        startQuizButton.style.display = "block";
    }
    });
}

if (startQuizButton) {
    startQuizButton.addEventListener("click", startInteractiveQuiz);
}

/* AnatomyMate Student Authentication */

const authSection = document.getElementById("auth-section");
const appContent = document.getElementById("app-content");

/* AnatomyMate: Restore and verify student session */

async function checkStudentSession() {
    const token = sessionStorage.getItem("anatomymate_token");

    if (!token) {
        authSection.style.display = "flex";
        appContent.style.display = "none";
        return;
    }

    try {
        const response = await fetch("/api/me", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Session expired or invalid.");
        }

        const data = await response.json();
        const student = data.student;

        // Keep the student information up to date.
        sessionStorage.setItem(
            "anatomymate_student",
            JSON.stringify(student)
        );

        // Keep the app hidden until the user's role is checked.
        authSection.style.display = "none";
        appContent.style.display = "block";

        if (adminDashboard) {
        adminDashboard.hidden = true;
        }

        // Create or update the welcome message.
        let welcome = document.getElementById("student-welcome");

        if (!welcome) {
            welcome = document.createElement("p");
            welcome.id = "student-welcome";
            appContent.prepend(welcome);
        }

        welcome.textContent = `Welcome, ${student.name}!`;
        loadAdminDashboard();

    } catch (error) {
        sessionStorage.removeItem("anatomymate_token");
        sessionStorage.removeItem("anatomymate_student");

        authSection.style.display = "flex";
        appContent.style.display = "none";

        showAuthMessage(
            "Your session has expired. Please log in again.",
            "error"
        );
    }
}

checkStudentSession();

/* AnatomyMate Admin Dashboard */

const adminDashboard = document.getElementById("admin-dashboard");
const adminStudentCount = document.getElementById("admin-student-count");
const adminStudentsBody = document.getElementById("admin-students-body");
const adminStatus = document.getElementById("admin-status");
const adminSearch = document.getElementById("admin-student-search");
const adminRefreshButton = document.getElementById("admin-refresh-button");

let adminStudents = [];

async function loadAdminDashboard() {
    const token = sessionStorage.getItem("anatomymate_token");

    if (!token || !adminDashboard) return;

    adminDashboard.hidden = true;

    try {
        const adminResponse = await fetch("/api/admin/me", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!adminResponse.ok) {
            // Ordinary students should not see the admin dashboard.
            adminDashboard.hidden = true;
            return;
        }

        adminDashboard.hidden = false;
        adminStatus.textContent = "Loading students...";

        const response = await fetch("/api/admin/students", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error("Unable to load students.");
        }

        const data = await response.json();
        adminStudents = Array.isArray(data.students) ? data.students : [];

        adminStudentCount.textContent = data.total ?? adminStudents.length;
        renderAdminStudents();
        adminStatus.textContent = `Loaded ${adminStudents.length} student records.`;

    } catch (error) {
        adminStatus.textContent = error.message || "Could not load the dashboard.";
    }
}

function renderAdminStudents() {
    if (!adminStudentsBody) return;

    const searchTerm = (adminSearch?.value || "").trim().toLowerCase();

    const filteredStudents = adminStudents.filter(student =>
        (student.name || "").toLowerCase().includes(searchTerm) ||
        (student.email || "").toLowerCase().includes(searchTerm)
    );

    adminStudentsBody.replaceChildren();

    if (filteredStudents.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.textContent = "No matching students found.";
        row.appendChild(cell);
        adminStudentsBody.appendChild(row);
        return;
    }

    filteredStudents.forEach(student => {
        const row = document.createElement("tr");

        const registered = student.created_at
            ? new Date(student.created_at).toLocaleDateString()
            : "—";

        [
            student.id ?? "—",
            student.name ?? "—",
            student.email ?? "—",
            student.role ?? "student",
            registered
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.appendChild(cell);
        });

        adminStudentsBody.appendChild(row);
    });
}

if (adminSearch) {
    adminSearch.addEventListener("input", renderAdminStudents);
}

if (adminRefreshButton) {
    adminRefreshButton.addEventListener("click", loadAdminDashboard);
}

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

const showLoginButton = document.getElementById("show-login");
const showRegisterButton = document.getElementById("show-register");

const authMessage = document.getElementById("auth-message");

function showAuthMessage(message, type = "") {
    authMessage.textContent = message;
    authMessage.className = type;
}

showLoginButton.addEventListener("click", () => {
    loginForm.style.display = "block";
    registerForm.style.display = "none";

    showLoginButton.classList.add("active");
    showRegisterButton.classList.remove("active");

    showAuthMessage("");
});

showRegisterButton.addEventListener("click", () => {
    registerForm.style.display = "block";
    loginForm.style.display = "none";

    showRegisterButton.classList.add("active");
    showLoginButton.classList.remove("active");

    showAuthMessage("");
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = registerForm.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = "Creating account...";

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: document.getElementById("register-name").value.trim(),
                email: document.getElementById("register-email").value.trim(),
                password: document.getElementById("register-password").value
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || "Registration failed.");
        }

        showAuthMessage(
            "Account created successfully! You can now log in.",
            "success"
        );

        registerForm.reset();
        showLoginButton.click();

        showAuthMessage(
            "Account created successfully! Please log in.",
            "success"
        );
    } catch (error) {
        showAuthMessage(error.message, "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Create Account";
    }
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = loginForm.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = "Logging in...";

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: document.getElementById("login-email").value.trim(),
                password: document.getElementById("login-password").value
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || "Login failed.");
        }

        // Temporary session storage for this browser tab.
        sessionStorage.setItem("anatomymate_token", data.access_token);
        sessionStorage.setItem(
            "anatomymate_student",
            JSON.stringify(data.student)
        );

        showAuthMessage("Login successful!", "success");

        // Display the app after successful login.
        authSection.style.display = "none";
        appContent.style.display = "block";

        // Keep the admin dashboard hidden until authorization is verified.
        if (adminDashboard) {
            adminDashboard.hidden = true;
        }

        // Create or update the welcome message.
        let welcome = document.getElementById("student-welcome");

        if (!welcome) {
            welcome = document.createElement("p");
            welcome.id = "student-welcome";
            appContent.prepend(welcome);
        }

        welcome.textContent = `Welcome, ${data.student.name}!`;

        // Verify admin access using the backend.
        await loadAdminDashboard();
        
        } catch (error) {
            showAuthMessage(error.message || "Login failed.", "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Login";
        }
    });

/* AnatomyMate Logout */
const logoutButton = document.getElementById("logout-button");

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("anatomymate_token");
    sessionStorage.removeItem("anatomymate_student");

    const welcome = document.getElementById("student-welcome");
    if (welcome) {
        welcome.remove();
    }

    appContent.style.display = "none";
    authSection.style.display = "flex";

    loginForm.reset();
    registerForm.reset();

    showLoginButton.click();
    showAuthMessage("You have logged out successfully.", "success");
});