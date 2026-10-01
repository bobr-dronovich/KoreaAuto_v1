// авторизация, регистрация и управление сессией пользователя

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

import { showToast, saveLocalProfile, getUserProfile } from "./utils.js";

// перевод кодов ошибок firebase на человеческий русский
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
            return "Слишком много попыток. Пожалуйста, подождите.";
        default:
            return error.message || "Произошла ошибка при авторизации.";
    }
}

// выход из аккаунта
export async function logoutUser() {
    try {
        await signOut(auth);
        showToast("Вы вышли из системы.", "info");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 500);
    } catch (e) {
        showToast(formatAuthError(e), "error");
    }
}

// сброс пароля на почту
export async function resetUserPassword(email) {
    if (!email) {
        showToast("Укажите email для сброса пароля.", "error");
        return false;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showToast("Ссылка для сброса пароля отправлена на почту.", "success");
        return true;
    } catch (e) {
        showToast(formatAuthError(e), "error");
        return false;
    }
}

// форма входа
export function initLoginForm() {
    const loginForm = document.getElementById("loginForm");
    const loginInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const rememberCheckbox = document.getElementById("rememberMe");
    const submitBtn = document.getElementById("loginButton");
    const resetLink = document.getElementById("forgotPasswordLink");

    if (!loginForm) return;

    // проверка заполненности полей
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
            // режим сохранения сессии (запомнить меня или до закрытия вкладки)
            const persistenceType = remember ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistenceType);

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // кэшируем профиль для мгновенного отображения
            try {
                const profile = await getUserProfile(user.uid);
                if (profile) {
                    saveLocalProfile(user.uid, profile);
                } else {
                    saveLocalProfile(user.uid, {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email.split("@")[0],
                        role: "user"
                    });
                }
            } catch (errProfile) {
                console.warn("кэш при логине:", errProfile);
            }

            showToast(`Добро пожаловать, ${user.displayName || email}!`, "success");

            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get("returnUrl") || "index.html";

            setTimeout(() => {
                window.location.href = returnUrl;
            }, 700);
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

// форма регистрации нового пользователя
export function initRegisterForm() {
    const registerForm = document.getElementById("registerForm");
    const nameInput = document.getElementById("regName");
    const emailInput = document.getElementById("regEmail");
    const phoneInput = document.getElementById("regPhone");
    const passInput = document.getElementById("regPassword");
    const confirmInput = document.getElementById("regConfirmPassword");
    const submitBtn = document.getElementById("registerButton");

    if (!registerForm) return;

    // проверка валидности данных перед отправкой
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
            // 1. создаем аккаунт в firebase auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. сохраняем отображаемое имя
            try {
                await updateProfile(user, { displayName: name });
            } catch (eAuth) {
                console.warn("updateProfile error:", eAuth);
            }

            // 3. сохраняем профиль локально сразу чтоб не терялся
            const profileData = {
                uid: user.uid,
                email: email,
                displayName: name,
                phone: phone || "",
                role: "user"
            };
            saveLocalProfile(user.uid, profileData);

            // 4. пишем в коллекцию users в firestore
            try {
                await setDoc(doc(db, "users", user.uid), {
                    ...profileData,
                    createdAt: serverTimestamp()
                });
            } catch (errDb) {
                console.warn("firestore user save warning:", errDb);
            }

            showToast("Регистрация успешна! Перенаправление...", "success");
            setTimeout(() => {
                window.location.href = "profile.html";
            }, 800);
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            showToast(formatAuthError(err), "error");
        }
    });
}
