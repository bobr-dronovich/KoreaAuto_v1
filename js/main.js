// ==========================================================================
// KoreaAuto_v1 - Main Entry Script (Header, Menu, Auth State, Global Modals)
// ==========================================================================

import { auth, onAuthStateChanged } from "./firebase.js";
import { getUserProfile, openModal, closeModal, showToast } from "./utils.js";
import { logoutUser } from "./auth.js";
import { updateHeaderFavBadge } from "./favorites.js";
import { setupOrderModal, createApplication } from "./applications.js";

document.addEventListener("DOMContentLoaded", () => {
    initHeaderAuthState();
    initMobileMenu();
    initConsultationModal();
    initHeaderSearch();
    updateHeaderFavBadge();
    setupOrderModal();
});

// Update Header depending on User Auth State
function initHeaderAuthState() {
    const authContainer = document.getElementById("headerAuthArea");
    if (!authContainer) return;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const profile = await getUserProfile(user.uid);
            const isAdmin = profile?.role && profile.role.trim() === "admin";
            const displayName = profile?.displayName || user.displayName || user.email.split("@")[0];

            authContainer.innerHTML = `
                <div class="user-menu-wrapper">
                    <button class="user-pill-btn" id="userMenuBtn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                        <span>${displayName}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                    </button>
                    <div class="user-dropdown" id="userDropdown">
                        <div class="user-dropdown-header">
                            <div class="name">${displayName}</div>
                            <span class="role-tag ${isAdmin ? 'admin-tag' : ''}">${isAdmin ? 'Администратор' : 'Пользователь'}</span>
                        </div>
                        <a href="profile.html">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                            Личный кабинет
                        </a>
                        <a href="applications.html">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                            Мои заявки
                        </a>
                        <a href="favorites.html">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            Избранное
                        </a>
                        ${isAdmin ? `
                            <hr>
                            <a href="admin.html" style="color:#e52b38;font-weight:700;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                                Админ-панель
                            </a>
                        ` : ''}
                        <hr>
                        <button id="logoutDropdownBtn" style="color:#e52b38;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                            Выйти
                        </button>
                    </div>
                </div>
            `;

            // Toggle dropdown
            const menuBtn = document.getElementById("userMenuBtn");
            const dropdown = document.getElementById("userDropdown");
            if (menuBtn && dropdown) {
                menuBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle("active");
                });

                document.addEventListener("click", () => {
                    dropdown.classList.remove("active");
                });
            }

            // Logout button
            const logoutBtn = document.getElementById("logoutDropdownBtn");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", () => logoutUser());
            }

        } else {
            // Unauthenticated state
            authContainer.innerHTML = `
                <a href="login.html" class="login-button">Вход</a>
            `;
        }
    });
}

// Mobile Slide Navigation Drawer
function initMobileMenu() {
    const menuBtn = document.querySelector(".menu-button");
    const overlay = document.getElementById("mobileNavOverlay");
    const drawer = document.getElementById("mobileNavDrawer");
    const closeBtn = document.getElementById("closeDrawerBtn");

    if (!menuBtn || !overlay || !drawer) return;

    const openMenu = () => {
        overlay.classList.add("open");
        drawer.classList.add("open");
    };

    const closeMenu = () => {
        overlay.classList.remove("open");
        drawer.classList.remove("open");
    };

    menuBtn.addEventListener("click", openMenu);
    overlay.addEventListener("click", closeMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
}

// Global Consultation Modal
function initConsultationModal() {
    const consultBtns = document.querySelectorAll(".consultation-button");
    const modal = document.getElementById("consultModal");
    if (!modal) return;

    const closeBtn = modal.querySelector(".modal-close-btn");
    const form = document.getElementById("consultForm");

    consultBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            openModal("consultModal");
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", () => closeModal("consultModal"));
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector("button[type='submit']");
            submitBtn.disabled = true;

            const name = document.getElementById("consultName")?.value;
            const phone = document.getElementById("consultPhone")?.value;
            const comment = document.getElementById("consultNote")?.value;

            const res = await createApplication({
                carId: "",
                carTitle: "Заявка на бесплатную консультацию по авто из Кореи",
                carPrice: 0,
                name,
                phone,
                comment: comment || "Запрос обратного звонка специалиста"
            });

            submitBtn.disabled = false;
            if (res) {
                closeModal("consultModal");
                form.reset();
            }
        });
    }
}

// Global Header Search
function initHeaderSearch() {
    const searchInput = document.getElementById("headerSearchInput");
    const searchBtn = document.getElementById("headerSearchBtn");

    const doSearch = () => {
        if (!searchInput) return;
        const val = searchInput.value.trim();
        const isCatalogPage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/";

        if (isCatalogPage && window.catalogManager) {
            window.catalogManager.applyFilters();
        } else {
            window.location.href = `index.html?q=${encodeURIComponent(val)}`;
        }
    };

    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") doSearch();
        });
    }
    if (searchBtn) {
        searchBtn.addEventListener("click", doSearch);
    }
}
