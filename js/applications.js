// ==========================================================================
// KoreaAuto_v1 - Applications Service (Orders, Bookings, Active Actions)
// ==========================================================================

import {
  db,
  auth,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "./firebase.js";

import {
  showToast,
  formatDate,
  getStatusBadge,
  openModal,
  closeModal,
  getCurrentUserWithProfile,
} from "./utils.js";

// Submit a new order / application
export async function createApplication({
  carId = null,
  carTitle = "Индивидуальный подбор авто из Кореи",
  carPrice = 0,
  carImage = "logos/KoreaAuto_logo_darkblue.png",
  name = "",
  phone = "",
  comment = "",
}) {
  const user = auth.currentUser;
  if (!user) {
    showToast("Пожалуйста, войдите в аккаунт для оформления заявки!", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
    return false;
  }

  if (!name || !phone) {
    showToast("Пожалуйста, укажите имя и номер телефона.", "error");
    return false;
  }

  try {
    const appsRef = collection(db, "applications");
    const docRef = await addDoc(appsRef, {
      userId: user.uid,
      userEmail: user.email,
      userName: name.trim(),
      userPhone: phone.trim(),
      carId: carId || "",
      carTitle: carTitle,
      carPrice: Number(carPrice) || 0,
      carImage: carImage,
      comment: comment.trim(),
      status: "new", // 'new' | 'in_progress' | 'approved' | 'shipping' | 'completed' | 'cancelled'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    showToast(
      "Заявка успешно создана! Номер заявки: #" +
        docRef.id.slice(0, 6).toUpperCase(),
      "success",
    );
    return docRef.id;
  } catch (e) {
    console.error("Error creating application:", e);
    showToast("Ошибка создания заявки: " + e.message, "error");
    return null;
  }
}

// Cancel user application (User action)
export async function cancelApplication(appId) {
  if (!confirm("Вы уверены, что хотите отменить эту заявку?")) return false;
  try {
    await updateDoc(doc(db, "applications", appId), {
      status: "cancelled",
      updatedAt: serverTimestamp(),
    });
    showToast("Заявка отменена.", "info");
    return true;
  } catch (e) {
    showToast("Ошибка отмены заявки: " + e.message, "error");
    return false;
  }
}

// Real-Time subscription for current user's applications
export function subscribeUserApplications(userId, callback) {
  const appsRef = collection(db, "applications");
  const q = query(appsRef, where("userId", "==", userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const apps = [];
      snapshot.forEach((docSnap) => {
        apps.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort descending by creation date
      apps.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(apps);
    },
    (err) => {
      console.error("Applications snapshot error:", err);
    },
  );
}

// Setup Quick Order Modal handlers globally
export function setupOrderModal() {
  const modal = document.getElementById("orderModal");
  if (!modal) return;

  const closeBtn = modal.querySelector(".modal-close-btn");
  const cancelBtn = modal.querySelector(".modal-cancel-btn");
  const form = document.getElementById("orderModalForm");
  const carTitleEl = document.getElementById("modalCarTitle");
  const carPriceEl = document.getElementById("modalCarPrice");
  const carIdInput = document.getElementById("modalCarId");
  const carImageInput = document.getElementById("modalCarImage");
  const nameInput = document.getElementById("modalUserName");
  const phoneInput = document.getElementById("modalUserPhone");
  const commentInput = document.getElementById("modalUserComment");

  // Close button
  if (closeBtn)
    closeBtn.addEventListener("click", () => closeModal("orderModal"));
  if (cancelBtn)
    cancelBtn.addEventListener("click", () => closeModal("orderModal"));

  // Global listener for "Заказать" buttons
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".quick-order-btn");
    if (btn) {
      e.preventDefault();
      const { user, profile } = await getCurrentUserWithProfile();
      if (!user) {
        showToast("Для оформления заявки необходимо войти в аккаунт", "info");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 800);
        return;
      }

      const carId = btn.getAttribute("data-id") || "";
      const carTitle = btn.getAttribute("data-title") || "Автомобиль из Кореи";
      const carPrice = btn.getAttribute("data-price") || "0";
      const carImage = btn.getAttribute("data-image") || "";

      if (carTitleEl) carTitleEl.textContent = carTitle;
      if (carPriceEl)
        carPriceEl.textContent =
          Number(carPrice).toLocaleString("ru-RU") + " ₽";
      if (carIdInput) carIdInput.value = carId;
      if (carImageInput) carImageInput.value = carImage;
      if (nameInput)
        nameInput.value = profile?.displayName || user.displayName || "";
      if (phoneInput) phoneInput.value = profile?.phone || "";

      openModal("orderModal");
    }
  });

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector("button[type='submit']");
      submitBtn.disabled = true;

      const carId = carIdInput ? carIdInput.value : "";
      const carTitle = carTitleEl ? carTitleEl.textContent : "Авто под заказ";
      const carPrice = carPriceEl
        ? carPriceEl.textContent.replace(/\D/g, "")
        : 0;
      const carImage = carImageInput ? carImageInput.value : "";
      const name = nameInput.value;
      const phone = phoneInput.value;
      const comment = commentInput ? commentInput.value : "";

      const success = await createApplication({
        carId,
        carTitle,
        carPrice,
        carImage,
        name,
        phone,
        comment,
      });

      submitBtn.disabled = false;
      if (success) {
        closeModal("orderModal");
        form.reset();
      }
    });
  }
}
