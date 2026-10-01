// вспомогательные функции для проекта KoreaAuto

import { auth, db, doc, getDoc, onAuthStateChanged } from "./firebase.js";

// форматируем цену в тенге
export function formatPrice(num) {
    if (num === null || num === undefined || isNaN(num)) return "Цена по запросу";
    return new Intl.NumberFormat("ru-RU").format(Math.round(num)) + " ₸";
}

// Форматирование в долларах
export function formatUSD(num) {
    if (!num) return "$38 325";
    return "$" + new Intl.NumberFormat("en-US").format(Math.round(num));
}

// форматирование в корейских вонах
export function formatKRW(num) {
    if (!num) return "₩51 700 000";
    return "₩" + new Intl.NumberFormat("en-US").format(Math.round(num));
}

// Форматирование в казахстанских тенге
export function formatKZT(num) {
    if (!num) return "19 162 500 ₸";
    return new Intl.NumberFormat("ru-RU").format(Math.round(num)) + " ₸";
}

// пробег авто
export function formatMileage(num) {
    if (num === null || num === undefined) return "0 км";
    return new Intl.NumberFormat("ru-RU").format(num) + " км";
}

// Красивый вывод даты из таймстемпа firestore
export function formatDate(timestamp) {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// статусы заявок для бейджей
export const STATUS_MAP = {
    new: { label: "Новая", class: "status-new" },
    in_progress: { label: "В обработке", class: "status-in_progress" },
    approved: { label: "Подтверждена", class: "status-approved" },
    shipping: { label: "В пути из Кореи", class: "status-shipping" },
    completed: { label: "Выдана", class: "status-completed" },
    cancelled: { label: "Отменена", class: "status-cancelled" }
};

export function getStatusBadge(status) {
    const info = STATUS_MAP[status] || { label: status, class: "status-new" };
    return `<span class="status-badge ${info.class}">${info.label}</span>`;
}

// всплывающие уведомления (тосты)
export function showToast(message, type = "info") {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button style="background:none;border:none;cursor:pointer;font-size:16px;color:#888;margin-left:12px;">&times;</button>
    `;

    toast.querySelector("button").addEventListener("click", () => {
        toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(100%)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// Сохраняем данные профиля в локальный кэш чтоб сразу показывать
export function saveLocalProfile(uid, data) {
    if (!uid || !data) return;
    try {
        const existing = getLocalProfile(uid) || {};
        const merged = { ...existing, ...data };
        localStorage.setItem(`koreaauto_user_profile_${uid}`, JSON.stringify(merged));
    } catch (e) {
        console.warn("ошибка кэша профиля:", e);
    }
}

// читаем профиль из кэша
export function getLocalProfile(uid) {
    if (!uid) return null;
    try {
        const raw = localStorage.getItem(`koreaauto_user_profile_${uid}`);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

// Получаем профиль из firestore с быстрым фолбэком на локальный кэш
export async function getUserProfile(uid, { strict = false } = {}) {
    if (!uid) return null;
    const cached = getLocalProfile(uid);

    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            const fullProfile = { ...(cached || {}), ...data };
            saveLocalProfile(uid, fullProfile);
            return fullProfile;
        }
        if (strict) return null;
    } catch (e) {
        if (strict) throw e;
        console.warn("не удалось загрузить профиль из firestore, берем локальный:", e);
    }

    return cached;
}

// текущий юзер вместе с профилем
export async function getCurrentUserWithProfile() {
    try {
        if (typeof auth.authStateReady === "function") {
            await auth.authStateReady();
        }
    } catch (e) {
        console.warn("authStateReady:", e);
    }

    if (auth.currentUser) {
        const profile = await getUserProfile(auth.currentUser.uid);
        return { user: auth.currentUser, profile };
    }

    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();
            if (user) {
                const profile = await getUserProfile(user.uid);
                resolve({ user, profile });
            } else {
                resolve({ user: null, profile: null });
            }
        });
    });
}

// проверка авторизации для закрытых страниц
export async function requireAuth(redirectUrl = "login.html") {
    const { user, profile } = await getCurrentUserWithProfile();
    if (!user) {
        window.location.href = `${redirectUrl}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return null;
    }
    return { user, profile };
}

// Проверка роли админа
export async function requireAdmin(redirectUrl = "index.html") {
    const { user } = await getCurrentUserWithProfile();
    if (!user) {
        const returnUrl = window.location.pathname + window.location.search;
        window.location.href = `login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
        return null;
    }

    let profile;
    try {
        profile = await getUserProfile(user.uid, { strict: true });
    } catch (error) {
        console.error("Не удалось проверить роль администратора в Firestore:", error);
        showToast("Не удалось проверить права администратора. Проверьте подключение и правила Firestore.", "error");
        return null;
    }

    const role = typeof profile?.role === "string" ? profile.role.trim().toLowerCase() : "";
    if (role !== "admin") {
        showToast("Доступ запрещен. Нужны права администратора.", "error");
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1200);
        return null;
    }
    return { user, profile };
}

// открытие модалки
export function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
}

// закрытие модалки
export function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
}
