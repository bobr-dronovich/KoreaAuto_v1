// ==========================================================================
// KoreaAuto_v1 - Utility Functions & Helpers
// ==========================================================================

import { auth, db, doc, getDoc, onAuthStateChanged } from "./firebase.js";

// Format currency
export function formatPrice(num) {
    if (num === null || num === undefined || isNaN(num)) return "Цена по запросу";
    return new Intl.NumberFormat("ru-RU").format(num) + " ₽";
}

// Format mileage
export function formatMileage(num) {
    if (num === null || num === undefined) return "0 км";
    return new Intl.NumberFormat("ru-RU").format(num) + " км";
}

// Format Firestore Timestamp or Date
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

// Status Badges & Labels
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

// Toast notification
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

// Get user profile from Firestore
export async function getUserProfile(uid) {
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            return userDoc.data();
        }
        return null;
    } catch (e) {
        console.error("Error fetching user profile:", e);
        return null;
    }
}

// Get currently authenticated user with profile
export async function getCurrentUserWithProfile() {
    try {
        if (typeof auth.authStateReady === "function") {
            await auth.authStateReady();
        }
    } catch (e) {
        console.warn("authStateReady failed or not supported:", e);
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

// Guard page for authenticated users
export async function requireAuth(redirectUrl = "login.html") {
    const { user, profile } = await getCurrentUserWithProfile();
    if (!user) {
        window.location.href = `${redirectUrl}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return null;
    }
    return { user, profile };
}

// Guard page for admin users
export async function requireAdmin(redirectUrl = "index.html") {
    const { user, profile } = await getCurrentUserWithProfile();
    if (!user) {
        window.location.href = "login.html";
        return null;
    }
    if (!profile || (profile.role && profile.role.trim() !== "admin")) {
        showToast("Доступ запрещен. Требуются права администратора.", "error");
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1200);
        return null;
    }
    return { user, profile };
}

// Modal dialog helpers
export function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
}

export function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
}
