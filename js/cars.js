// работа с автомобилями и отзывами в firestore

import { 
    db, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    startAfter, 
    onSnapshot, 
    serverTimestamp 
} from "./firebase.js";

import { formatPrice, formatMileage, showToast, formatUSD, formatKRW, formatKZT } from "./utils.js";
import { isCarInFavorites, toggleFavorite } from "./favorites.js";

// реэкспорт функций валют чтоб все импорты работали
export { formatUSD, formatKRW, formatKZT };

// расчет цен в трех валютах (1 usd = 500 kzt, 1 usd = 1350 krw)
export function getCarPrices(car) {
    let usd = 38325;
    if (car.priceUSD) {
        usd = Number(car.priceUSD);
    } else if (car.priceKZT) {
        usd = Math.round(Number(car.priceKZT) / 500);
    } else if (car.price && car.price > 1000000) {
        usd = Math.round(Number(car.price) / 500);
    } else if (car.price) {
        usd = Number(car.price);
    }

    const krw = car.priceKRW ? Number(car.priceKRW) : Math.round(usd * 1350);
    const kzt = car.priceKZT ? Number(car.priceKZT) : Math.round(usd * 500);
    const marketUSD = car.marketPriceUSD ? Number(car.marketPriceUSD) : Math.round(usd * 1.08);

    return { usd, krw, kzt, marketUSD };
}

function getFuelCategory(value) {
    const text = String(value || "").trim().toLowerCase();
    if (/электр|электро|electric|\bev\b/.test(text)) return "электро";
    if (/гибрид|hybrid|\bhev\b|\bphev\b/.test(text)) return "гибрид";
    if (/дизел|diesel/.test(text)) return "дизель";
    if (/бензин|бенз|gasoline|petrol/.test(text)) return "бензин";
    return text;
}

// Загружаем страницу машин из Firestore.
export async function fetchCars({
    brand = "",
    minPrice = null,
    maxPrice = null,
    minYear = null,
    fuel = "",
    sortBy = "createdAt_desc",
    lastDoc = null,
    pageSize = 10,
    searchMatcher = () => true
} = {}) {
    try {
        const carsRef = collection(db, "cars");
        const pageCars = [];
        let cursor = lastDoc;
        let reachedEnd = false;
        let useClientSideFilters = false;
        const batchSize = Math.max(pageSize * 3, 30);

        while (pageCars.length <= pageSize && !reachedEnd) {
            const filterConstraints = [];
            if (!useClientSideFilters && brand && brand !== "all") {
                filterConstraints.push(where("brand", "==", brand));
            }

            const sortConstraints = [];

            switch (sortBy) {
                case "price_asc":
                    sortConstraints.push(orderBy("price", "asc"));
                    break;
                case "price_desc":
                    sortConstraints.push(orderBy("price", "desc"));
                    break;
                case "year_desc":
                    sortConstraints.push(orderBy("year", "desc"));
                    break;
                case "year_asc":
                    sortConstraints.push(orderBy("year", "asc"));
                    break;
                default:
                    sortConstraints.push(orderBy("createdAt", "desc"));
            }

            const pageConstraints = [...sortConstraints];
            if (cursor) pageConstraints.push(startAfter(cursor));
            pageConstraints.push(limit(batchSize));

            let snapshot;
            try {
                snapshot = await getDocs(query(carsRef, ...filterConstraints, ...pageConstraints));
            } catch (error) {
                const needsCompositeIndex = error.code === "failed-precondition"
                    && /index/i.test(error.message || "");
                if (!needsCompositeIndex || useClientSideFilters) throw error;

                console.warn("Составной индекс каталога отсутствует; фильтруем страницу на клиенте.", error);
                useClientSideFilters = true;
                snapshot = await getDocs(query(carsRef, ...pageConstraints));
            }
            if (snapshot.empty) break;

            snapshot.forEach((docSnap) => {
                const car = { id: docSnap.id, ...docSnap.data(), _doc: docSnap };
                const { kzt } = getCarPrices(car);
                const matchesBrand = !brand || brand === "all"
                    || String(car.brand || "").trim().toLowerCase() === brand.trim().toLowerCase();
                const carFuel = getFuelCategory(car.fuel || car.engine || car.trim);
                const matchesFuel = !fuel || fuel === "all"
                    || carFuel === getFuelCategory(fuel);
                const matchesPrice = (minPrice === null || minPrice <= 0 || kzt >= minPrice)
                    && (maxPrice === null || maxPrice <= 0 || kzt <= maxPrice);
                const matchesYear = minYear === null || minYear <= 0 || Number(car.year) >= minYear;

                if (matchesBrand && matchesFuel && matchesPrice && matchesYear && searchMatcher(car)) {
                    pageCars.push(car);
                }
            });

            cursor = snapshot.docs[snapshot.docs.length - 1];
            reachedEnd = snapshot.size < batchSize;
        }

        const hasMore = pageCars.length > pageSize;
        const resultCars = hasMore ? pageCars.slice(0, pageSize) : pageCars;
        const newLastDoc = resultCars.length > 0
            ? resultCars[resultCars.length - 1]._doc
            : cursor;

        return {
            cars: resultCars,
            lastDoc: newLastDoc,
            hasMore: hasMore
        };
    } catch (err) {
        console.error("ошибка загрузки авто:", err);
        showToast("Ошибка загрузки каталога: " + err.message, "error");
        return { cars: [], lastDoc: null, hasMore: false };
    }
}

// Следим за последними изменениями каталога.
export function subscribeToLatestCars(callback) {
    const q = query(collection(db, "cars"), orderBy("createdAt", "desc"), limit(10));
    let firstSnapshot = true;

    return onSnapshot(q, (snapshot) => {
        if (firstSnapshot) {
            firstSnapshot = false;
            return;
        }
        if (snapshot.docChanges().some(change => change.type === "added" || change.type === "modified" || change.type === "removed")) {
            callback();
        }
    }, (error) => {
        console.error("Ошибка обновления каталога в реальном времени:", error);
        showToast("Не удалось включить обновление каталога: " + error.message, "error");
    });
}

// Получаем одну машину.
export async function fetchCarById(carId) {
    try {
        const carDoc = await getDoc(doc(db, "cars", carId));
        if (carDoc.exists()) {
            return { id: carDoc.id, ...carDoc.data() };
        }
        return null;
    } catch (e) {
        console.error("ошибка получения авто по id:", e);
        return null;
    }
}

// слушатель авто в реальном времени
export function subscribeToCar(carId, callback) {
    return onSnapshot(doc(db, "cars", carId), (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() });
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("ошибка snapshot авто:", error);
    });
}

// похожие автомобили той же марки
export async function fetchRelatedCars(brand, currentCarId, maxCount = 3) {
    try {
        const carsRef = collection(db, "cars");
        const q = query(carsRef, where("brand", "==", brand), limit(maxCount + 1));
        const snapshot = await getDocs(q);
        const related = [];
        snapshot.forEach(docSnap => {
            if (docSnap.id !== currentCarId && related.length < maxCount) {
                related.push({ id: docSnap.id, ...docSnap.data() });
            }
        });
        return related;
    } catch (e) {
        console.error("ошибка похожих авто:", e);
        return [];
    }
}

// подписка на отзывы в реальном времени (onSnapshot)
export function subscribeToReviews(carId, callback) {
    const reviewsRef = collection(db, "reviews");
    const q = query(reviewsRef, where("carId", "==", carId));
    return onSnapshot(q, (snapshot) => {
        const reviews = [];
        snapshot.forEach(docSnap => {
            reviews.push({ id: docSnap.id, ...docSnap.data() });
        });
        // сортируем сначала свежие
        reviews.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
        callback(reviews);
    }, (error) => {
        console.error("ошибка подписки на отзывы:", error);
    });
}

// добавить новый отзыв
export async function addReview(carId, { rating, comment, user, profile }) {
    try {
        const reviewsRef = collection(db, "reviews");
        await addDoc(reviewsRef, {
            carId,
            userId: user.uid,
            userName: profile?.displayName || user.displayName || user.email.split("@")[0],
            rating: Number(rating),
            comment: comment.trim(),
            createdAt: serverTimestamp()
        });
        showToast("Ваш отзыв успешно опубликован!", "success");
        return true;
    } catch (e) {
        showToast("Ошибка при публикации отзыва: " + e.message, "error");
        return false;
    }
}

// обновление отзыва
export async function updateReview(reviewId, { rating, comment }) {
    try {
        await updateDoc(doc(db, "reviews", reviewId), {
            rating: Number(rating),
            comment: comment.trim(),
            updatedAt: serverTimestamp()
        });
        showToast("Отзыв успешно обновлен!", "success");
        return true;
    } catch (e) {
        showToast("Ошибка обновления отзыва: " + e.message, "error");
        return false;
    }
}

// удаление отзыва
export async function deleteReview(reviewId) {
    try {
        await deleteDoc(doc(db, "reviews", reviewId));
        showToast("Отзыв удален.", "info");
        return true;
    } catch (e) {
        showToast("Ошибка при удалении: " + e.message, "error");
        return false;
    }
}

// рендер карточки автомобиля в каталоге
export function renderCarCard(car, isFav = false) {
    const img = car.imageUrl || "logos/KoreaAuto_logo.png";
    const title = `${car.year} ${car.brand} ${car.model}`;
    
    // расчет цен в валютах
    const { usd: priceUSD, krw: priceKRW, kzt: priceKZT, marketUSD } = getCarPrices(car);

    const displacement = car.displacement || (car.engine ? car.engine.split(" ")[0] : "2.5 L");
    const trans = car.transmission || "Автомат (AT)";
    const fuel = car.fuel || "Бензин";
    const mileageFormatted = car.mileage ? (car.mileage > 1000 ? (Math.round(car.mileage / 1000) + "к км") : (car.mileage + " км")) : "4к км";
    const condition = car.condition || "Как новая";
    const location = car.location || "Местная сборка • Кёнгидо";
    const daysOnSale = car.daysOnSale || "2 дня в продаже";
    const trim = car.trim || (car.engine || "2.5T Gasoline AWD");

    return `
        <div class="car-card-wm" data-id="${car.id}">
            <!-- колонка с фото и синей плашкой цены -->
            <div class="wm-img-col">
                <a href="car.html?id=${car.id}">
                    <img src="${img}" alt="${title}" loading="lazy" onerror="this.src='logos/KoreaAuto_logo.png'">
                </a>
                <div class="wm-img-badge">
                    ≈ ${formatUSD(priceUSD)}
                    <span>Стоимость авто в Корее</span>
                </div>
                <button class="fav-btn ${isFav ? "active" : ""}" data-car-id="${car.id}" title="${isFav ? "В избранном" : "Добавить в избранное"}" style="position:absolute; top:8px; right:8px; width:32px; height:32px;">
                    <svg viewBox="0 0 24 24" style="width:18px; height:18px;">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </button>
            </div>

            <!-- характеристики авто -->
            <div class="wm-content-col">
                <div class="wm-header-row">
                    <div>
                        <h3 class="wm-car-title">
                            <a href="car.html?id=${car.id}">${title}</a>
                        </h3>
                        <div class="wm-subtitle">${trim}</div>
                    </div>
                    <div class="wm-meta-info">
                        <div>📅 ${daysOnSale}</div>
                        <div>📍 ${location}</div>
                    </div>
                </div>

                <div class="wm-specs-grid">
                    <div class="wm-spec-item">
                        <span>⚙️</span>
                        <span>${displacement} • ${trans} • ${fuel}</span>
                    </div>
                    <div class="wm-spec-item">
                        <span style="color:#16a34a; font-weight:700;">✔️</span>
                        <span>Состояние: ${condition}</span>
                    </div>
                    <div class="wm-spec-item">
                        <span>⛽</span>
                        <span>Пробег: ${mileageFormatted}</span>
                    </div>
                    <div class="wm-spec-item">
                        <span>📍</span>
                        <span>${location}</span>
                    </div>
                    <div class="wm-spec-item">
                        <span>⚙️</span>
                        <span>Тип двигателя: ${fuel}</span>
                    </div>
                    <div class="wm-spec-item">
                        <span style="color:#16a34a; font-weight:700;">🛡️</span>
                        <span style="color:#16a34a; font-weight:600;">Отличная история</span>
                    </div>
                </div>

                <div class="wm-actions-row">
                    <button class="wm-btn-call consultation-button">Позвонить мне</button>
                    <button class="wm-btn-order quick-order-btn" data-id="${car.id}" data-title="${title}" data-price="${priceUSD}" data-price-kzt="${priceKZT}" data-image="${img}">Рассчитать стоимость</button>
                </div>
            </div>

            <!-- правая колонка с ценами -->
            <div class="wm-price-col">
                <div class="wm-kr-box">
                    <div class="label">ЦЕНА В КОРЕЕ</div>
                    <div class="won-price">${formatKRW(priceKRW)}</div>
                    <div class="converted-prices">≈ ${formatUSD(priceUSD)} / ${formatKZT(priceKZT)}</div>
                </div>
                <div class="wm-market-box">
                    <div class="icon">📊</div>
                    <div class="text-wrap">
                        <span class="sub">Рыночная цена</span>
                        <span class="val">${formatUSD(marketUSD)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
