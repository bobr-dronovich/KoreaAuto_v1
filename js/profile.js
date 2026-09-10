// ==========================================================================
// KoreaAuto_v1 - User Profile & History Service
// ==========================================================================

import { 
    auth, 
    db, 
    doc, 
    setDoc,
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    deleteDoc, 
    serverTimestamp,
    onAuthStateChanged,
    updateProfile
} from "./firebase.js";

import { getUserProfile, showToast, formatDate, getStatusBadge } from "./utils.js";
import { subscribeUserApplications, cancelApplication } from "./applications.js";
import { updateReview, deleteReview } from "./cars.js";

export function initProfilePage() {
    const nameInput = document.getElementById("profileName");
    const phoneInput = document.getElementById("profilePhone");
    const emailDisplay = document.getElementById("profileEmail");
    const avatarLetter = document.getElementById("avatarLetter");
    const roleBadge = document.getElementById("profileRoleBadge");
    const profileForm = document.getElementById("profileForm");

    // Listen to Firebase Auth state directly
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Not logged in - redirect to login
            window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.pathname)}`;
            return;
        }

        // 1. Immediately set email from user.email
        if (emailDisplay) emailDisplay.textContent = user.email;

        // 2. Fetch profile from Firestore
        let profile = await getUserProfile(user.uid);

        const displayName = profile?.displayName || user.displayName || user.email.split("@")[0];
        if (nameInput) nameInput.value = displayName;
        if (phoneInput) phoneInput.value = profile?.phone || "";
        if (avatarLetter) avatarLetter.textContent = (displayName[0] || "U").toUpperCase();
        
        if (roleBadge) {
            const isAdmin = profile?.role && profile.role.trim() === "admin";
            roleBadge.textContent = isAdmin ? "Администратор" : "Пользователь";
            if (isAdmin) roleBadge.classList.add("admin-tag");
        }

        // 3. Setup form submission
        if (profileForm) {
            // Remove any existing submit listeners
            profileForm.onsubmit = async (e) => {
                e.preventDefault();
                const btn = profileForm.querySelector("button[type='submit']");
                btn.disabled = true;
                btn.textContent = "Сохранение...";

                const newName = nameInput.value.trim();
                const newPhone = phoneInput.value.trim();

                try {
                    // Update in Firestore
                    await setDoc(doc(db, "users", user.uid), {
                        displayName: newName,
                        phone: newPhone,
                        email: user.email,
                        updatedAt: serverTimestamp()
                    }, { merge: true });

                    // Also update Firebase Auth profile
                    try {
                        await updateProfile(user, { displayName: newName });
                    } catch (eAuth) {
                        console.warn("Auth updateProfile warning:", eAuth);
                    }

                    if (avatarLetter) avatarLetter.textContent = (newName[0] || "U").toUpperCase();
                    showToast("Данные профиля успешно сохранены!", "success");
                } catch (err) {
                    console.error("Profile save error:", err);
                    showToast("Ошибка обновления данных: " + err.message, "error");
                } finally {
                    btn.disabled = false;
                    btn.textContent = "Сохранить изменения";
                }
            };
        }

        // 4. Real-Time Applications Subscription
        const appsTableBody = document.getElementById("profileAppsTableBody");
        const emptyAppsNotice = document.getElementById("profileEmptyApps");

        subscribeUserApplications(user.uid, (applications) => {
            if (!appsTableBody) return;

            if (applications.length === 0) {
                appsTableBody.innerHTML = "";
                if (emptyAppsNotice) emptyAppsNotice.style.display = "block";
                return;
            }

            if (emptyAppsNotice) emptyAppsNotice.style.display = "none";

            appsTableBody.innerHTML = applications.map(app => {
                const canCancel = app.status === "new" || app.status === "in_progress";
                return `
                    <tr>
                        <td><strong>#${app.id.slice(0, 6).toUpperCase()}</strong></td>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <img src="${app.carImage || 'logos/KoreaAuto_logo.png'}" style="width:50px; height:35px; object-fit:cover; border-radius:4px;" onerror="this.src='logos/KoreaAuto_logo.png'">
                                <span>${app.carTitle}</span>
                            </div>
                        </td>
                        <td>${Number(app.carPrice || 0).toLocaleString("ru-RU")} ₽</td>
                        <td>${formatDate(app.createdAt)}</td>
                        <td>${getStatusBadge(app.status)}</td>
                        <td>
                            ${canCancel ? `<button class="btn-sm-danger cancel-app-btn" data-id="${app.id}">Отменить</button>` : `<span style="color:#a0aec0;font-size:12px;">Недоступно</span>`}
                        </td>
                    </tr>
                `;
            }).join("");

            // Cancel handlers
            appsTableBody.querySelectorAll(".cancel-app-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    cancelApplication(btn.getAttribute("data-id"));
                });
            });
        });

        // 5. Load user reviews
        loadUserReviews(user.uid);
    });
}

// Load and manage user reviews
async function loadUserReviews(userId) {
    const reviewsContainer = document.getElementById("userReviewsList");
    const emptyNotice = document.getElementById("emptyUserReviews");
    if (!reviewsContainer) return;

    try {
        const reviewsRef = collection(db, "reviews");
        const q = query(reviewsRef, where("userId", "==", userId));
        const snapshot = await getDocs(q);

        const reviews = [];
        snapshot.forEach(docSnap => {
            reviews.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (reviews.length === 0) {
            reviewsContainer.innerHTML = "";
            if (emptyNotice) emptyNotice.style.display = "block";
            return;
        }

        if (emptyNotice) emptyNotice.style.display = "none";

        reviewsContainer.innerHTML = reviews.map(r => `
            <div class="review-card" id="review-${r.id}">
                <div class="review-card-header">
                    <div>
                        <span class="reviewer-name">Авто: ${r.carId ? `<a href="car.html?id=${r.carId}" style="color:#2859a8;text-decoration:underline;">Посмотреть авто</a>` : 'Каталог'}</span>
                        <div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
                    </div>
                    <span class="review-date">${formatDate(r.createdAt)}</span>
                </div>
                <p class="review-text" id="review-text-${r.id}">${r.comment}</p>
                <div style="margin-top:12px; display:flex; gap:10px;">
                    <button class="btn-sm-primary edit-review-btn" data-id="${r.id}" data-comment="${encodeURIComponent(r.comment)}" data-rating="${r.rating}">Редактировать</button>
                    <button class="btn-sm-danger delete-review-btn" data-id="${r.id}">Удалить</button>
                </div>
            </div>
        `).join("");

        reviewsContainer.querySelectorAll(".delete-review-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (confirm("Удалить этот отзыв?")) {
                    await deleteReview(btn.getAttribute("data-id"));
                    loadUserReviews(userId);
                }
            });
        });

        reviewsContainer.querySelectorAll(".edit-review-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                const currentComment = decodeURIComponent(btn.getAttribute("data-comment"));
                const currentRating = btn.getAttribute("data-rating");

                const newComment = prompt("Измените текст отзыва:", currentComment);
                if (newComment !== null && newComment.trim() !== "") {
                    const newRating = prompt("Оценка (от 1 до 5):", currentRating);
                    const ratingNum = Math.min(5, Math.max(1, parseInt(newRating) || 5));

                    await updateReview(id, { rating: ratingNum, comment: newComment });
                    loadUserReviews(userId);
                }
            });
        });

    } catch (e) {
        console.error("Error loading user reviews:", e);
    }
}
