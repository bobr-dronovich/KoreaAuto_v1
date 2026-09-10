// ==========================================================================
// KoreaAuto_v1 - Cars & Reviews Service (Firestore queries, pagination, onSnapshot)
// ==========================================================================

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

import { formatPrice, formatMileage, showToast } from "./utils.js";
import { isCarInFavorites, toggleFavorite } from "./favorites.js";

// Helper for formatting currencies
export function formatUSD(num) {
    if (!num) return "$38 325";
    return "$" + new Intl.NumberFormat("en-US").format(Math.round(num));
}

export function formatKRW(num) {
    if (!num) return "₩50 900 000";
    return "₩" + new Intl.NumberFormat("en-US").format(Math.round(num));
}

export function formatKZT(num) {
    if (!num) return "17 437 807 ₸";
    return new Intl.NumberFormat("ru-RU").format(Math.round(num)) + " ₸";
}

// Fetch cars with filtering, sorting, and pagination
export async function fetchCars({
    brand = "",
    minPrice = null,
    maxPrice = null,
    minYear = null,
    fuel = "",
    sortBy = "createdAt_desc",
    lastDoc = null,
    pageSize = 6
} = {}) {
    try {
        const carsRef = collection(db, "cars");
        let constraints = [];

        // Filter by Brand
        if (brand && brand !== "all") {
            constraints.push(where("brand", "==", brand));
        }

        // Filter by Fuel
        if (fuel && fuel !== "all") {
            constraints.push(where("fuel", "==", fuel));
        }

        // Sorting
        switch (sortBy) {
            case "price_asc":
                constraints.push(orderBy("price", "asc"));
                break;
            case "price_desc":
                constraints.push(orderBy("price", "desc"));
                break;
            case "year_desc":
                constraints.push(orderBy("year", "desc"));
                break;
            case "year_asc":
                constraints.push(orderBy("year", "asc"));
                break;
            case "createdAt_desc":
            default:
                constraints.push(orderBy("createdAt", "desc"));
                break;
        }

        if (lastDoc) {
            constraints.push(startAfter(lastDoc));
        }

        constraints.push(limit(pageSize + 1));

        const q = query(carsRef, ...constraints);
        const snapshot = await getDocs(q);

        let cars = [];
        snapshot.forEach((docSnap) => {
            cars.push({ id: docSnap.id, ...docSnap.data(), _doc: docSnap });
        });

        // Client-side range filters
        if (minPrice !== null && minPrice > 0) {
            cars = cars.filter(c => Number(c.price || c.priceUSD || 0) >= minPrice);
        }
        if (maxPrice !== null && maxPrice > 0) {
            cars = cars.filter(c => Number(c.price || c.priceUSD || 0) <= maxPrice);
        }
        if (minYear !== null && minYear > 0) {
            cars = cars.filter(c => Number(c.year) >= minYear);
        }

        const hasMore = cars.length > pageSize;
        const resultCars = hasMore ? cars.slice(0, pageSize) : cars;
        const newLastDoc = resultCars.length > 0 ? resultCars[resultCars.length - 1]._doc : null;

        return {
            cars: resultCars,
            lastDoc: newLastDoc,
            hasMore: hasMore
        };
    } catch (err) {
        console.error("Error fetching cars:", err);
        showToast("Ошибка загрузки каталога: " + err.message, "error");
        return { cars: [], lastDoc: null, hasMore: false };
    }
}

// Fetch single car by ID
export async function fetchCarById(carId) {
    try {
        const carDoc = await getDoc(doc(db, "cars", carId));
        if (carDoc.exists()) {
            return { id: carDoc.id, ...carDoc.data() };
        }
        return null;
    } catch (e) {
        console.error("Error fetching car by id:", e);
        return null;
    }
}

// Real-time subscription to a single car
export function subscribeToCar(carId, callback) {
    return onSnapshot(doc(db, "cars", carId), (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() });
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Car snapshot error:", error);
    });
}

// Fetch related cars
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
        console.error("Error fetching related cars:", e);
        return [];
    }
}

// Subscribe to reviews in Real-Time
export function subscribeToReviews(carId, callback) {
    const reviewsRef = collection(db, "reviews");
    const q = query(reviewsRef, where("carId", "==", carId));
    return onSnapshot(q, (snapshot) => {
        const reviews = [];
        snapshot.forEach(docSnap => {
            reviews.push({ id: docSnap.id, ...docSnap.data() });
        });
        reviews.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
        callback(reviews);
    }, (error) => {
        console.error("Reviews snapshot error:", error);
    });
}

// Add review
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

// Delete review
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

// ==========================================================================
// RENDER CAR CARD: WestMotors Horizontal Layout (Exact match to screenshot)
// ==========================================================================
export function renderCarCard(car, isFav = false) {
    const img = car.imageUrl || "logos/KoreaAuto_logo.png";
    const title = `${car.year} ${car.brand} ${car.model}`;
    
    // Financial calculations
    const priceUSD = car.priceUSD || (car.price > 100000 ? Math.round(car.price / 90) : (car.price || 38325));
    const priceKRW = car.priceKRW || Math.round(priceUSD * 1330);
    const priceKZT = car.priceKZT || Math.round(priceUSD * 455);
    const marketUSD = car.marketPriceUSD || Math.round(priceUSD * 1.05 + 1958);

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
            <!-- Левая колонка с фото и синей плашкой цены -->
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

            <!-- Центральная колонка с характеристиками -->
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
                        <a href="car.html?id=${car.id}#history" class="wm-report-btn">
                            📷 Отчёт по авто
                        </a>
                    </div>
                </div>

                <div class="wm-actions-row">
                    <button class="wm-btn-call consultation-button">Позвонить мне</button>
                    <button class="wm-btn-order quick-order-btn" data-id="${car.id}" data-title="${title}" data-price="${priceUSD}" data-image="${img}">Хочу заказать</button>
                </div>
            </div>

            <!-- Правая колонка: ЦЕНА В КОРЕЕ и Рыночная цена -->
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
