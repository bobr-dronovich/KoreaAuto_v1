// Работа с заявками пользователей.

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

  if (!phone.trim()) {
    showToast("Введите номер телефона.", "error");
    return false;
  }

  try {
    const appsRef = collection(db, "applications");
    const docRef = await addDoc(appsRef, {
      userId: user ? user.uid : "guest",
      userEmail: user ? user.email : "guest@koreaauto.kz",
      userName: name.trim() || user?.displayName || "Клиент",
      userPhone: phone.trim(),
      carId: carId || "",
      carTitle: carTitle,
      carPrice: Number(carPrice) || 0,
      carImage: carImage,
      comment: comment.trim(),
      status: "new",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    showToast(
      "Заявка успешно оформлена! Номер: #" +
        docRef.id.slice(0, 6).toUpperCase(),
      "success",
    );
    return docRef.id;
  } catch (e) {
    console.error("ошибка создания заявки:", e);
    showToast("Ошибка оформления заявки: " + e.message, "error");
    return null;
  }
}

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
      apps.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(apps);
    },
    (err) => {
      console.error("ошибка в snapshot заявок:", err);
    },
  );
}

export function setupOrderModal() {
  const modal = document.getElementById("orderModal");
  if (!modal) return;

  const closeBtn = modal.querySelector(".modal-close-btn");
  const form = document.getElementById("orderModalForm");
  const carTitleEl = document.getElementById("modalCarTitle");
  const carPriceEl = document.getElementById("modalCarPrice");
  const koreaPriceEl = document.getElementById("modalCalcKoreaPrice");
  const shippingEl = document.getElementById("modalCalcShipping");
  const customsEl = document.getElementById("modalCalcCustoms");
  const carIdInput = document.getElementById("modalCarId");
  const carImageInput = document.getElementById("modalCarImage");
  const nameInput = document.getElementById("modalUserName");
  const phoneInput = document.getElementById("modalUserPhone");
  const consentInput = document.getElementById("modalDataConsent");

  if (closeBtn) closeBtn.addEventListener("click", () => closeModal("orderModal"));

  document.addEventListener("click", async (e) => {
    const btn = e.target instanceof Element ? e.target.closest(".quick-order-btn") : null;
    if (btn) {
      e.preventDefault();

      const carId = btn.getAttribute("data-id") || "";
      const carTitle = btn.getAttribute("data-title") || "Автомобиль из Кореи";
      const carPriceUSD = Number(btn.getAttribute("data-price") || "38325");
      let carPriceKZT = Number(btn.getAttribute("data-price-kzt") || (carPriceUSD * 500));
      if (!carPriceKZT || carPriceKZT < 100000) {
        carPriceKZT = Math.round(carPriceUSD * 500);
      }
      const carImage = btn.getAttribute("data-image") || "";

      const shippingKZT = 1100000;
      const customsKZT = Math.round(carPriceKZT * 0.12 + 750000);
      const totalTurnkeyKZT = carPriceKZT + shippingKZT + customsKZT;
      const totalTurnkeyUSD = Math.round(totalTurnkeyKZT / 500);

      if (carTitleEl) carTitleEl.textContent = carTitle;
      if (koreaPriceEl) {
        koreaPriceEl.textContent = `${carPriceKZT.toLocaleString("ru-RU")} ₸ ($${carPriceUSD.toLocaleString("en-US")})`;
      }

      if (shippingEl) {
        shippingEl.textContent = `~ ${shippingKZT.toLocaleString("ru-RU")} ₸ ($${Math.round(shippingKZT / 500).toLocaleString("en-US")})`;
      }

      if (customsEl) {
        customsEl.textContent = `~ ${customsKZT.toLocaleString("ru-RU")} ₸ ($${Math.round(customsKZT / 500).toLocaleString("en-US")})`;
      }
      if (carPriceEl) {
        carPriceEl.textContent = `${totalTurnkeyKZT.toLocaleString("ru-RU")} ₸ (~$${totalTurnkeyUSD.toLocaleString("en-US")})`;
        carPriceEl.setAttribute("data-raw-price", totalTurnkeyKZT);
      }

      if (carIdInput) carIdInput.value = carId;
      if (carImageInput) carImageInput.value = carImage;
      if (nameInput) nameInput.value = "";
      if (phoneInput) phoneInput.value = "";
      if (consentInput) consentInput.checked = false;

      try {
        const { user, profile } = await getCurrentUserWithProfile();
        if (user) {
          if (nameInput) nameInput.value = profile?.displayName || user.displayName || "";
          if (phoneInput) phoneInput.value = profile?.phone || "";
        }
      } catch (error) {
        console.error("Не удалось загрузить данные профиля для заявки:", error);
        showToast("Не удалось загрузить профиль. Заполните телефон вручную.", "error");
      }

      openModal("orderModal");
    }
  });

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector("button[type='submit']");
      if (!submitBtn || (consentInput && !consentInput.checked)) {
        showToast("Подтвердите согласие на обработку персональных данных.", "error");
        return;
      }
      submitBtn.disabled = true;

      const carId = carIdInput ? carIdInput.value : "";
      const carTitle = carTitleEl ? carTitleEl.textContent : "Авто под заказ";
      const carPrice = carPriceEl
        ? Number(carPriceEl.getAttribute("data-raw-price") || carPriceEl.textContent.replace(/\D/g, ""))
        : 0;
      const carImage = carImageInput ? carImageInput.value : "";
      const name = nameInput ? nameInput.value : "";
      const phone = phoneInput ? phoneInput.value : "";

      try {
        const success = await createApplication({
          carId,
          carTitle,
          carPrice,
          carImage,
          name,
          phone,
        });

        if (success) {
          closeModal("orderModal");
          form.reset();
        }
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal("orderModal");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal("orderModal");
  });
}
