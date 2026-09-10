// ==========================================================================
// KoreaAuto_v1 - Favorites Management
// ==========================================================================

import { auth, db, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from "./firebase.js";
import { showToast } from "./utils.js";
import { fetchCarById, renderCarCard } from "./cars.js";

const LOCAL_FAV_KEY = "korea_auto_favorites";

export function getLocalFavorites() {
    try {
        const data = localStorage.getItem(LOCAL_FAV_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function saveLocalFavorites(favs) {
    localStorage.setItem(LOCAL_FAV_KEY, JSON.stringify(favs));
}

export function isCarInFavorites(carId) {
    const list = getLocalFavorites();
    return list.includes(carId);
}

export async function toggleFavorite(carId) {
    let list = getLocalFavorites();
    const index = list.indexOf(carId);
    const user = auth.currentUser;

    if (index > -1) {
        list.splice(index, 1);
        saveLocalFavorites(list);
        showToast("Удалено из избранного", "info");

        if (user) {
            try {
                await deleteDoc(doc(db, "favorites", `${user.uid}_${carId}`));
            } catch (e) {
                console.error("Error removing fav in firestore:", e);
            }
        }
        updateHeaderFavBadge();
        return false;
    } else {
        list.push(carId);
        saveLocalFavorites(list);
        showToast("Добавлено в избранное!", "success");

        if (user) {
            try {
                await setDoc(doc(db, "favorites", `${user.uid}_${carId}`), {
                    userId: user.uid,
                    carId: carId,
                    addedAt: new Date().toISOString()
                });
            } catch (e) {
                console.error("Error adding fav in firestore:", e);
            }
        }
        updateHeaderFavBadge();
        return true;
    }
}

export function updateHeaderFavBadge() {
    const list = getLocalFavorites();
    const badges = document.querySelectorAll(".fav-count-badge");
    badges.forEach(b => {
        b.textContent = list.length;
        b.style.display = list.length > 0 ? "inline-block" : "none";
    });
}

// Load and render all favorites on favorites.html
export async function initFavoritesPage() {
    const container = document.getElementById("favoritesGrid");
    const emptyNotice = document.getElementById("favoritesEmpty");
    const countEl = document.getElementById("favoritesCount");

    if (!container) return;

    const favIds = getLocalFavorites();
    if (countEl) countEl.textContent = favIds.length;

    if (favIds.length === 0) {
        if (emptyNotice) emptyNotice.style.display = "block";
        container.innerHTML = "";
        return;
    }

    if (emptyNotice) emptyNotice.style.display = "none";
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Загрузка избранного...</div>`;

    const carPromises = favIds.map(id => fetchCarById(id));
    const cars = (await Promise.all(carPromises)).filter(Boolean);

    if (cars.length === 0) {
        if (emptyNotice) emptyNotice.style.display = "block";
        container.innerHTML = "";
        return;
    }

    container.innerHTML = cars.map(car => renderCarCard(car, true)).join("");

    // Attach listeners for favorite buttons on the page
    container.querySelectorAll(".fav-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const carId = btn.getAttribute("data-car-id");
            await toggleFavorite(carId);
            initFavoritesPage(); // re-render
        });
    });
}
