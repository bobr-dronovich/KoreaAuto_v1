// личный кабинет пользователя: данные профиля, история заявок и управление отзывами

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

import { 
    getUserProfile, 
    getLocalProfile, 
    saveLocalProfile, 
    showToast, 
    formatDate, 
    getStatusBadge 
} from "./utils.js";

import { subscribeUserApplications, cancelApplication } from "./applications.js";
import { updateReview, deleteReview } from "./cars.js";

export function initProfilePage() {
    const nameInput = document.getElementById("profileName");
    const phoneInput = document.getElementById("profilePhone");
    const headingName = document.getElementById("profileHeadingName") || document.getElementById("profileEmail");
    const emailSubtitle = document.getElementById("profileEmailSubtitle");
    const emailInput = document.getElementById("profileEmailInput");
    const avatarLetter = document.getElementById("avatarLetter");
    const roleBadge = document.getElementById("profileRoleBadge");
    const profileForm = document.getElementById("profileForm");

    // функция быстрого обновления интерфейса профиля
    function applyUserData(user, data = {}) {
        const email = user?.email || data?.email || "";
        const displayName = data?.displayName || user?.displayName || (email ? email.split("@")[0] : "Клиент");
        const phone = data?.phone || "";
        const role = data?.role || "user";
        const isAdmin = role.trim() === "admin";

        if (headingName) headingName.textContent = displayName;
        if (emailSubtitle) emailSubtitle.textContent = email;
        if (emailInput) emailInput.value = email;
        if (nameInput) nameInput.value = displayName;
        if (phoneInput && phone) phoneInput.value = phone;
        if (avatarLetter) avatarLetter.textContent = (displayName[0] || "U").toUpperCase();
        
        if (roleBadge) {
            roleBadge.textContent = isAdmin ? "Администратор" : "Пользователь";
            if (isAdmin) {
                roleBadge.classList.add("admin-tag");
            } else {
                roleBadge.classList.remove("admin-tag");
            }
        }
    }

    // слушаем авторизацию firebase
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // не залогинен - отправляем на вход
            window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.pathname)}`;
            return;
        }

        // 1. мгновенно показываем почту и кэшированные данные без ожидания сети
        const cached = getLocalProfile(user.uid) || {};
        applyUserData(user, cached);

        // 2. подтягиваем свежие данные из базы firestore
        try {
            const profile = await getUserProfile(user.uid);
            if (profile) {
                applyUserData(user, profile);
            }
        } catch (e) {
            console.warn("ошибка загрузки профиля из сети:", e);
        }

        // 3. сохранение профиля по кнопке
        if (profileForm) {
            profileForm.onsubmit = async (e) => {
                e.preventDefault();
                const btn = profileForm.querySelector("button[type='submit']");
                btn.disabled = true;
                btn.textContent = "Сохранение...";

                const newName = nameInput.value.trim();
                const newPhone = phoneInput.value.trim();

                // сохраняем в локалсторадж сразу
                const currentProfile = getLocalProfile(user.uid) || {};
                const updatedData = {
                    ...currentProfile,
                    displayName: newName,
                    phone: newPhone,
                    email: user.email
                };
                saveLocalProfile(user.uid, updatedData);
                applyUserData(user, updatedData);

                try {
                    // обновляем имя в учетке auth
                    try {
                        await updateProfile(user, { displayName: newName });
                    } catch (eAuth) {
                        console.warn("auth updateProfile:", eAuth);
                    }

                    // пишем в firestore
                    await setDoc(doc(db, "users", user.uid), {
                        displayName: newName,
                        phone: newPhone,
                        email: user.email,
                        updatedAt: serverTimestamp()
                    }, { merge: true });

                    // обновляем шапку сайта
                    const headerName = document.querySelector("#userMenuBtn span");
                    if (headerName) headerName.textContent = newName;
                    const headerDropdownName = document.querySelector("#userDropdown .name");
                    if (headerDropdownName) headerDropdownName.textContent = newName;

                    showToast("Данные профиля успешно сохранены!", "success");
                } catch (err) {
                    console.error("ошибка сохранения профиля:", err);
                    showToast("Данные сохранены локально. Ошибка синхронизации с базой: " + err.message, "info");
                } finally {
                    btn.disabled = false;
                    btn.textContent = "Сохранить изменения";
                }
            };
        }

        // 4. подписка на историю заявок в реальном времени (onSnapshot)
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
                        <td>${Number(app.carPrice || 0).toLocaleString("ru-RU")} ₸</td>
                        <td>${formatDate(app.createdAt)}</td>
                        <td>${getStatusBadge(app.status)}</td>
                        <td>
                            ${canCancel ? `<button class="btn-sm-danger cancel-app-btn" data-id="${app.id}">Отменить</button>` : `<span style="color:#a0aec0;font-size:12px;">Недоступно</span>`}
                        </td>
                    </tr>
                `;
            }).join("");

            // обработчики отмены заявки
            appsTableBody.querySelectorAll(".cancel-app-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    cancelApplication(btn.getAttribute("data-id"));
                });
            });
        });

        // 5. загрузка отзывов текущего пользователя
        loadUserReviews(user.uid);
    });
}

// Загрузка отзывов юзера с возможностью редактирования и удаления
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

        // кнопки удаления
        reviewsContainer.querySelectorAll(".delete-review-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (confirm("Удалить этот отзыв?")) {
                    await deleteReview(btn.getAttribute("data-id"));
                    loadUserReviews(userId);
                }
            });
        });

        // кнопки редактирования
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
        console.error("ошибка загрузки отзывов:", e);
    }
}
