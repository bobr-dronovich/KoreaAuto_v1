// ==========================================================================
// KoreaAuto_v1 - Authentication Logic (Login, Register, Logout, Reset)
// ==========================================================================

import { 
    auth, 
    db, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    updateProfile,
    doc, 
    setDoc, 
    serverTimestamp 
} from "./firebase.js";

import { showToast } from "./utils.js";

// Translate Firebase error codes into human-readable Russian
export function formatAuthError(error) {
    switch (error.code) {
        case "auth/invalid-email":
            return "Некорректный адрес электронной почты.";
        case "auth/user-disabled":
            return "Данная учетная запись заблокирована.";
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "Неверный логин (email) или пароль.";
        case "auth/email-already-in-use":
            return "Пользователь с таким email уже зарегистрирован.";
        case "auth/weak-password":
            return "Слишком слабый пароль. Минимальная длина — 6 символов.";
        case "auth/network-request-failed":
            return "Ошибка сети. Проверьте интернет-соединение.";
        case "auth/too-many-requests":
            return "Слишком много неудачных попыток. Пожалуйста, подождите.";
        default:
            return error.message || "Произошла ошибка при авторизации.";
    }
}

// User Logout
export async function logoutUser() {
    try {
        await signOut(auth);
        showToast("Вы успешно вышли из системы.", "info");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 600);
    } catch (e) {
        showToast(formatAuthError(e), "error");
    }
}

// Send Password Reset
export async function resetUserPassword(email) {
    if (!email) {
        showToast("Укажите адрес электронной почты для сброса пароля.", "error");
        return false;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showToast("Ссылка для сброса пароля отправлена на ваш Email.", "success");
        return true;
    } catch (e) {
        showToast(formatAuthError(e), "error");
        return false;
    }
}

// Init Login Page Form
export function initLoginForm() {
    const loginForm = document.getElementById("loginForm");
    const loginInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const rememberCheckbox = document.getElementById("rememberMe");
    const submitBtn = document.getElementById("loginButton");
    const resetLink = document.getElementById("forgotPasswordLink");

    if (!loginForm) return;

    // Toggle disabled state when inputs change
    const checkInputs = () => {
        const hasValues = loginInput.value.trim().length > 0 && passwordInput.value.length > 0;
        submitBtn.disabled = !hasValues;
    };

    loginInput.addEventListener("input", checkInputs);
    passwordInput.addEventListener("input", checkInputs);
    checkInputs();

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = loginInput.value.trim();
        const password = passwordInput.value;
        const remember = rememberCheckbox ? rememberCheckbox.checked : false;

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Вход...";

        try {
            // Set persistence based on "Remember me"
            const persistenceType = remember ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistenceType);

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            showToast(`Добро пожаловать, ${userCredential.user.displayName || email}!`, "success");

            // Redirect back or to index.html
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get("returnUrl") || "index.html";

            setTimeout(() => {
                window.location.href = returnUrl;
            }, 800);
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            showToast(formatAuthError(err), "error");
        }
    });

    if (resetLink) {
        resetLink.addEventListener("click", async (e) => {
            e.preventDefault();
            const email = loginInput.value.trim() || prompt("Введите ваш email для восстановления пароля:");
            if (email) {
                await resetUserPassword(email);
            }
        });
    }
}

// Init Register Page Form
export function initRegisterForm() {
    const registerForm = document.getElementById("registerForm");
    const nameInput = document.getElementById("regName");
    const emailInput = document.getElementById("regEmail");
    const phoneInput = document.getElementById("regPhone");
    const passInput = document.getElementById("regPassword");
    const confirmInput = document.getElementById("regConfirmPassword");
    const submitBtn = document.getElementById("registerButton");

    if (!registerForm) return;

    const checkInputs = () => {
        const isValid = nameInput.value.trim() &&
                        emailInput.value.trim() &&
                        passInput.value.length >= 6 &&
                        confirmInput.value.length >= 6;
        submitBtn.disabled = !isValid;
    };

    [nameInput, emailInput, phoneInput, passInput, confirmInput].forEach(inp => {
        inp.addEventListener("input", checkInputs);
    });
    checkInputs();

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passInput.value;
        const confirm = confirmInput.value;

        if (password !== confirm) {
            showToast("Пароли не совпадают!", "error");
            return;
        }

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Регистрация...";

        try {
            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Update display name in Auth
            await updateProfile(user, { displayName: name });

            // 3. Create user document in Firestore 'users' collection
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: email,
                displayName: name,
                phone: phone || "",
                role: "user", // Default role
                createdAt: serverTimestamp()
            });

            showToast("Регистрация успешна! Перенаправление...", "success");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            showToast(formatAuthError(err), "error");
        }
    });
}
