// ==========================================================================
// KoreaAuto_v1 - Admin Panel Service (WestMotors layout, Batch Importer, CRUD)
// ==========================================================================

import { 
    db, 
    auth, 
    collection, 
    doc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp,
    writeBatch 
} from "./firebase.js";

import { requireAdmin, showToast, formatDate, formatPrice, getStatusBadge, openModal, closeModal } from "./utils.js";
import { formatUSD, formatKRW, formatKZT } from "./cars.js";

// High-resolution, multi-angle real automotive photography presets for Korean cars (6 angles: front 3/4, rear 3/4, side, cockpit, console, seats)
export const CAR_PHOTO_PRESETS = {
    "genesis_gv70": [
        "https://s1.cdn.autoevolution.com/images/gallery/genesis-gv70-2024-7863_1.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/genesis-gv70-2024-7863_2.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/genesis-gv70-2024-7863_3.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/genesis-gv70-2024-7863_4.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/genesis-gv70-2024-7863_5.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/genesis-gv70-2024-7863_2.jpg"
    ],
    "genesis_gv80": [
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-GV80-6725_1.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-GV80-6725_2.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-GV80-6725_3.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-GV80-6725_6.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-GV80-6725_21.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-GV80-6725_25.jpg"
    ],
    "genesis_g80": [
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-G80-6816_1.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-G80-6816_2.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-G80-6816_3.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-G80-6816_4.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-G80-6816_15.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/GENESIS-G80-6816_20.jpg"
    ],
    "hyundai_santa_fe": [
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-santa-fe-2023-7563_1.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-santa-fe-2023-7563_2.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-santa-fe-2023-7563_3.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-santa-fe-2023-7563_5.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-santa-fe-2023-7563_6.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-santa-fe-2023-7563_7.jpg"
    ],
    "hyundai_palisade": [
        "https://s1.cdn.autoevolution.com/images/gallery/HYUNDAI-Palisade-6355_1.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/HYUNDAI-Palisade-6355_2.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/HYUNDAI-Palisade-6355_3.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/HYUNDAI-Palisade-6355_4.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/HYUNDAI-Palisade-6355_10.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/HYUNDAI-Palisade-6355_12.jpg"
    ],
    "hyundai_tucson": [
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-tucson-2024-7744_1.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-tucson-2024-7744_2.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-tucson-2024-7744_3.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-tucson-2024-7744_4.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-tucson-2024-7744_5.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/hyundai-tucson-2024-7744_6.jpg"
    ],
    "kia_carnival": [
        "https://s1.cdn.autoevolution.com/images/gallery/KIA-Carnival-6745_1.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/KIA-Carnival-6745_2.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/KIA-Carnival-6745_3.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/KIA-Carnival-6745_4.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/KIA-Carnival-6745_15.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/KIA-Carnival-6745_18.jpg"
    ],
    "kia_sorento": [
        "https://s1.cdn.autoevolution.com/images/gallery/kia-sorento-2023-7570_1.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/kia-sorento-2023-7570_2.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/kia-sorento-2023-7570_3.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/kia-sorento-2023-7570_4.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/kia-sorento-2023-7570_5.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/kia-sorento-2023-7570_6.jpg"
    ],
    "kia_k5": [
        "https://s1.cdn.autoevolution.com/images/gallery/kia-k5-2024-7788_1.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/kia-k5-2024-7788_2.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/kia-k5-2024-7788_3.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/kia-k5-2024-7788_4.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/kia-k5-2024-7788_5.jpg",
        "https://s1.cdn.autoevolution.com/images/gallery/kia-k5-2024-7788_6.jpg"
    ]
};

// Helper to find authentic 6 photos by brand/model query
export function getPhotosForCar(brand = "", model = "") {
    const key = `${brand}_${model}`.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    for (const [k, photos] of Object.entries(CAR_PHOTO_PRESETS)) {
        if (key.includes(k) || k.includes(key)) return photos;
    }
    if (key.includes("gv70")) return CAR_PHOTO_PRESETS["genesis_gv70"];
    if (key.includes("gv80")) return CAR_PHOTO_PRESETS["genesis_gv80"];
    if (key.includes("g80")) return CAR_PHOTO_PRESETS["genesis_g80"];
    if (key.includes("santa")) return CAR_PHOTO_PRESETS["hyundai_santa_fe"];
    if (key.includes("palisade")) return CAR_PHOTO_PRESETS["hyundai_palisade"];
    if (key.includes("carnival")) return CAR_PHOTO_PRESETS["kia_carnival"];
    if (key.includes("sorento")) return CAR_PHOTO_PRESETS["kia_sorento"];
    if (key.includes("k5")) return CAR_PHOTO_PRESETS["kia_k5"];
    if (key.includes("tucson")) return CAR_PHOTO_PRESETS["hyundai_tucson"];
    if (key.includes("genesis")) return CAR_PHOTO_PRESETS["genesis_gv70"];
    if (key.includes("hyundai")) return CAR_PHOTO_PRESETS["hyundai_santa_fe"];
    if (key.includes("kia")) return CAR_PHOTO_PRESETS["kia_carnival"];
    return CAR_PHOTO_PRESETS["genesis_gv70"];
}

// Dataset of ready-to-go Korean cars formatted in WestMotors style (all equipped with 6 real photos)
export const WESTMOTORS_DEMO_PRESETS = {
    crossovers: [
        {
            brand: "Genesis",
            model: "GV70",
            year: 2026,
            trim: "2.5T Gasoline AWD",
            priceUSD: 38325,
            priceKRW: 50900000,
            priceKZT: 17437807,
            marketPriceUSD: 40283,
            mileage: 4417,
            engine: "2.5 T-GDI (304 л.с.)",
            displacement: "2.5 L",
            fuel: "Бензин",
            transmission: "Автомат (AT)",
            drive: "4WD (Полный)",
            seats: 5,
            condition: "Как новая",
            location: "Местная сборка • Кёнгидо",
            daysOnSale: "2 дня в продаже",
            imageUrl: CAR_PHOTO_PRESETS.genesis_gv70[0],
            images: CAR_PHOTO_PRESETS.genesis_gv70,
            description: "Премиальный кроссовер Genesis GV70 2026 года. Состояние как новая, полный привод 4WD, панорамная крыша, проекция на лобовое стекло, аудиосистема Lexicon 3D, система полуавтономного вождения HDA 2. Без ДТП и подкрасов.",
            isAvailable: true
        },
        {
            brand: "Genesis",
            model: "GV80 Executive",
            year: 2022,
            trim: "3.0 Diesel AWD VIP",
            priceUSD: 5200000 / 90,
            priceKRW: 68500000,
            priceKZT: 26200000,
            marketPriceUSD: 61000,
            mileage: 38000,
            engine: "3.0 V6 Diesel (278 л.с.)",
            displacement: "3.0 L",
            fuel: "Дизель",
            transmission: "Автомат (AT)",
            drive: "4WD (Полный)",
            seats: 5,
            condition: "Отличное",
            location: "Сеул • Каннам",
            daysOnSale: "3 дня в продаже",
            imageUrl: CAR_PHOTO_PRESETS.genesis_gv80[0],
            images: CAR_PHOTO_PRESETS.genesis_gv80,
            description: "Флагман Genesis GV80 с надежным дизельным 6-цилиндровым двигателем. Пневмоподвеска с чтением дорожного покрытия камерой, сиденья с массажем Ergo Motion, 22-дюймовые диски.",
            isAvailable: true
        },
        {
            brand: "Hyundai",
            model: "Santa Fe Calligraphy",
            year: 2023,
            trim: "2.5 T-GDI HTRAC",
            priceUSD: 37500,
            priceKRW: 49800000,
            priceKZT: 17100000,
            marketPriceUSD: 41200,
            mileage: 18000,
            engine: "2.5 T-GDI (281 л.с.)",
            displacement: "2.5 L",
            fuel: "Бензин",
            transmission: "Автомат (AT)",
            drive: "4WD (HTRAC)",
            seats: 7,
            condition: "Идеальное",
            location: "Инчхон • Порт",
            daysOnSale: "1 день в продаже",
            imageUrl: CAR_PHOTO_PRESETS.hyundai_santa_fe[0],
            images: CAR_PHOTO_PRESETS.hyundai_santa_fe,
            description: "Максимальная комплектация Calligraphy. Панорамная крыша, раздельные капитанские кресла 2-го ряда, двойные шумоизоляционные стекла, акустика Bose.",
            isAvailable: true
        }
    ],
    family: [
        {
            brand: "Kia",
            model: "Carnival Signature",
            year: 2023,
            trim: "2.2 CRDi 9-мест Limousine",
            priceUSD: 43500,
            priceKRW: 57900000,
            priceKZT: 19800000,
            marketPriceUSD: 47200,
            mileage: 15000,
            engine: "2.2 CRDi (199 л.с.)",
            displacement: "2.2 L",
            fuel: "Дизель",
            transmission: "Автомат (AT)",
            drive: "Передний",
            seats: 9,
            condition: "Как новая",
            location: "Кёнгидо • Сувон",
            daysOnSale: "4 дня в продаже",
            imageUrl: CAR_PHOTO_PRESETS.kia_carnival[0],
            images: CAR_PHOTO_PRESETS.kia_carnival,
            description: "Идеальный 9-местный минивэн из Кореи. Комплектация Signature, капитанские сиденья с электроприводом и подставками для ног (оттоманками), двойной люк, электро-двери.",
            isAvailable: true
        },
        {
            brand: "Hyundai",
            model: "Palisade Prestige",
            year: 2022,
            trim: "3.8 V6 AWD 7-мест",
            priceUSD: 41900,
            priceKRW: 55800000,
            priceKZT: 19100000,
            marketPriceUSD: 45000,
            mileage: 28000,
            engine: "3.8 V6 (295 л.с.)",
            displacement: "3.8 L",
            fuel: "Бензин",
            transmission: "Автомат (AT)",
            drive: "4WD (HTRAC)",
            seats: 7,
            condition: "Отличное",
            location: "Пусан • Аукцион",
            daysOnSale: "2 дня в продаже",
            imageUrl: CAR_PHOTO_PRESETS.hyundai_palisade[0],
            images: CAR_PHOTO_PRESETS.hyundai_palisade,
            description: "Большой семейный внедорожник. Капитанские кресла с вентиляцией, акустика Harman Kardon, круговой обзор 360, диски R20.",
            isAvailable: true
        },
        {
            brand: "Kia",
            model: "Sorento Master",
            year: 2022,
            trim: "2.2 Smartstream D 4WD",
            priceUSD: 33800,
            priceKRW: 44900000,
            priceKZT: 15400000,
            marketPriceUSD: 36500,
            mileage: 36000,
            engine: "2.2 Smartstream (202 л.с.)",
            displacement: "2.2 L",
            fuel: "Дизель",
            transmission: "Робот 8DCT",
            drive: "4WD",
            seats: 5,
            condition: "Отличное",
            location: "Сеул • Яндже",
            daysOnSale: "5 дней в продаже",
            imageUrl: CAR_PHOTO_PRESETS.kia_sorento[0],
            images: CAR_PHOTO_PRESETS.kia_sorento,
            description: "Популярнейший дизельный кроссовер. Очень экономичный расход (6.5 л/100 км), коричневая кожа Nappa, цифровая приборная панель, камеры кругового обзора.",
            isAvailable: true
        }
    ],
    sedans: [
        {
            brand: "Genesis",
            model: "G80 Sport",
            year: 2022,
            trim: "3.5T AWD Sport Package",
            priceUSD: 49500,
            priceKRW: 65900000,
            priceKZT: 22500000,
            marketPriceUSD: 54000,
            mileage: 24000,
            engine: "3.5 V6 Twin-Turbo (380 л.с.)",
            displacement: "3.5 L",
            fuel: "Бензин",
            transmission: "Автомат (AT)",
            drive: "4WD (AWD)",
            seats: 5,
            condition: "Идеальное",
            location: "Сеул • Каннам",
            daysOnSale: "1 день в продаже",
            imageUrl: CAR_PHOTO_PRESETS.genesis_g80[0],
            images: CAR_PHOTO_PRESETS.genesis_g80,
            description: "Спортивный бизнес-седан с разгоном 0-100 за 4.9 сек. Полноуправляемое шасси (задние колеса подруливают), красные тормозные суппорты, отделка карбоном.",
            isAvailable: true
        },
        {
            brand: "Kia",
            model: "K5 GT-Line",
            year: 2022,
            trim: "1.6 Turbo GT-Line",
            priceUSD: 24900,
            priceKRW: 33100000,
            priceKZT: 11300000,
            marketPriceUSD: 27500,
            mileage: 32000,
            engine: "1.6 Turbo (180 л.с.)",
            displacement: "1.6 L",
            fuel: "Бензин",
            transmission: "Автомат (AT)",
            drive: "Передний",
            seats: 5,
            condition: "Отличное",
            location: "Кёнгидо • Пучхон",
            daysOnSale: "3 дня в продаже",
            imageUrl: CAR_PHOTO_PRESETS.kia_k5[0],
            images: CAR_PHOTO_PRESETS.kia_k5,
            description: "Стильный и надежный седан в пакете GT-Line. Черная отделка потолка, спортивный скошенный руль, беспроводная зарядка, светодиодная оптика.",
            isAvailable: true
        },
        {
            brand: "Hyundai",
            model: "Tucson N Line",
            year: 2023,
            trim: "2.0 CRDi 4WD N-Line",
            priceUSD: 28900,
            priceKRW: 38500000,
            priceKZT: 13150000,
            marketPriceUSD: 31800,
            mileage: 9500,
            engine: "2.0 CRDi (186 л.с.)",
            displacement: "2.0 L",
            fuel: "Дизель",
            transmission: "Автомат (AT)",
            drive: "4WD",
            seats: 5,
            condition: "Как новая",
            location: "Сеул • Тегу",
            daysOnSale: "2 дня в продаже",
            imageUrl: CAR_PHOTO_PRESETS.hyundai_tucson[0],
            images: CAR_PHOTO_PRESETS.hyundai_tucson,
            description: "Спортивный кроссовер Tucson в заводском обвесе N-Line. Сиденья с замшей и красной строчкой, черные диски R19, электронная подвеска ECS.",
            isAvailable: true
        }
    ]
};

export async function initAdminPage() {
    const adminData = await requireAdmin();
    if (!adminData) return;

    setupAdminTabs();
    loadDashboardStats();
    setupCarsManagement();
    setupCarPhotosModal();
    setupApplicationsRealtime();
    setupUsersManagement();
    setupModeration();
    setupBatchMultiCarAdder();
}

// Admin Tab Switching
function setupAdminTabs() {
    const tabBtns = document.querySelectorAll(".admin-tab-btn");
    const sections = document.querySelectorAll(".admin-tab-content");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));

            btn.classList.add("active");
            const target = document.getElementById(btn.getAttribute("data-tab"));
            if (target) target.classList.add("active");
        });
    });
}

// 1. Dashboard Statistics
async function loadDashboardStats() {
    try {
        const [carsSnap, appsSnap, usersSnap] = await Promise.all([
            getDocs(collection(db, "cars")),
            getDocs(collection(db, "applications")),
            getDocs(collection(db, "users"))
        ]);

        const totalCarsEl = document.getElementById("statTotalCars");
        const totalAppsEl = document.getElementById("statTotalApps");
        const totalUsersEl = document.getElementById("statTotalUsers");
        const activeAppsEl = document.getElementById("statActiveApps");

        if (totalCarsEl) totalCarsEl.textContent = carsSnap.size;
        if (totalAppsEl) totalAppsEl.textContent = appsSnap.size;
        if (totalUsersEl) totalUsersEl.textContent = usersSnap.size;

        let activeCount = 0;
        appsSnap.forEach(d => {
            const data = d.data();
            if (data.status !== "completed" && data.status !== "cancelled") {
                activeCount++;
            }
        });
        if (activeAppsEl) activeAppsEl.textContent = activeCount;

    } catch (e) {
        console.error("Error loading stats:", e);
    }
}

// 2. Cars Management (Single CRUD & 6-Photo Manager)
function setupCarsManagement() {
    const addCarBtn = document.getElementById("adminAddCarBtn");
    const carForm = document.getElementById("carEditForm");
    const carsTableBody = document.getElementById("adminCarsTableBody");

    const modalTitle = document.getElementById("carModalTitle");
    const carIdInput = document.getElementById("adminCarId");
    const brandInput = document.getElementById("adminCarBrand");
    const modelInput = document.getElementById("adminCarModel");
    const yearInput = document.getElementById("adminCarYear");
    const trimInput = document.getElementById("adminCarTrim");
    const priceUSDInput = document.getElementById("adminCarPriceUSD");
    const priceKRWInput = document.getElementById("adminCarPriceKRW");
    const priceKZTInput = document.getElementById("adminCarPriceKZT");
    const mileageInput = document.getElementById("adminCarMileage");
    const fuelSelect = document.getElementById("adminCarFuel");
    const transSelect = document.getElementById("adminCarTrans");
    const seatsInput = document.getElementById("adminCarSeats");
    const locationInput = document.getElementById("adminCarLocation");
    const conditionInput = document.getElementById("adminCarCondition");
    const imgInput = document.getElementById("adminCarImage");
    const imgPreview = document.getElementById("adminCarImagePreview");
    const galleryInput = document.getElementById("adminCarGallery");
    const galleryThumbs = document.getElementById("adminGalleryThumbnails");
    const btnAutoFillPhotos = document.getElementById("btnAutoFillEditPhotos");
    const descInput = document.getElementById("adminCarDesc");

    // Live preview for main photo
    if (imgInput && imgPreview) {
        imgInput.addEventListener("input", () => {
            imgPreview.src = imgInput.value.trim() || "logos/KoreaAuto_logo.png";
        });
    }

    // Live preview for gallery thumbnails
    const renderGalleryThumbs = () => {
        if (!galleryThumbs || !galleryInput) return;
        const urls = galleryInput.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        galleryThumbs.innerHTML = urls.map(u => `
            <img src="${u}" style="width:48px;height:34px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;" onerror="this.style.display='none'">
        `).join("");
    };
    if (galleryInput) {
        galleryInput.addEventListener("input", renderGalleryThumbs);
    }

    // Auto-fill photos by model in single edit modal
    if (btnAutoFillPhotos) {
        btnAutoFillPhotos.addEventListener("click", () => {
            const b = brandInput ? brandInput.value.trim() : "";
            const m = modelInput ? modelInput.value.trim() : "";
            const photos = getPhotosForCar(b, m);
            if (photos && photos.length > 0) {
                if (imgInput) imgInput.value = photos[0];
                if (imgPreview) imgPreview.src = photos[0];
                if (galleryInput) galleryInput.value = photos.slice(1).join("\n");
                renderGalleryThumbs();
                showToast("6 реальных ракурсов подставлены для модели!", "info");
            }
        });
    }

    // Open Single Add Modal
    if (addCarBtn) {
        addCarBtn.addEventListener("click", () => {
            if (carForm) carForm.reset();
            if (carIdInput) carIdInput.value = "";
            if (imgPreview) imgPreview.src = "logos/KoreaAuto_logo.png";
            if (galleryThumbs) galleryThumbs.innerHTML = "";
            if (modalTitle) modalTitle.textContent = "Добавление одного авто (WestMotors)";
            openModal("carEditModal");
        });
    }

    // Handle Form Submit
    if (carForm) {
        carForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = carForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;

            const isEdit = Boolean(carIdInput.value);
            const usd = Number(priceUSDInput.value) || 38325;
            const krw = priceKRWInput.value ? Number(priceKRWInput.value) : Math.round(usd * 1330);
            const kzt = priceKZTInput.value ? Number(priceKZTInput.value) : Math.round(usd * 455);

            const mainPhoto = imgInput.value.trim() || "logos/KoreaAuto_logo.png";
            const extraPhotos = galleryInput ? galleryInput.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
            const allImages = [mainPhoto, ...extraPhotos.filter(u => u !== mainPhoto)];

            const carData = {
                brand: brandInput.value.trim(),
                model: modelInput.value.trim(),
                year: Number(yearInput.value),
                trim: trimInput.value.trim() || `${brandInput.value} ${modelInput.value}`,
                priceUSD: usd,
                priceKRW: krw,
                priceKZT: kzt,
                price: usd * 90,
                marketPriceUSD: Math.round(usd * 1.05 + 1958),
                mileage: Number(mileageInput.value),
                displacement: "2.5 L",
                engine: trimInput.value.trim() || "2.5 T-GDI",
                fuel: fuelSelect.value,
                transmission: transSelect.value,
                drive: "4WD (Полный)",
                seats: Number(seatsInput.value) || 5,
                location: locationInput.value.trim() || "Местная сборка • Кёнгидо",
                condition: conditionInput.value.trim() || "Как новая",
                daysOnSale: "2 дня в продаже",
                imageUrl: mainPhoto,
                images: allImages,
                description: descInput.value.trim(),
                isAvailable: true,
                updatedAt: serverTimestamp()
            };

            try {
                if (isEdit) {
                    await updateDoc(doc(db, "cars", carIdInput.value), carData);
                    showToast("Автомобиль успешно обновлен!", "success");
                } else {
                    carData.createdAt = serverTimestamp();
                    await addDoc(collection(db, "cars"), carData);
                    showToast("Автомобиль добавлен в каталог!", "success");
                }
                closeModal("carEditModal");
                loadAdminCars();
                loadDashboardStats();
            } catch (err) {
                showToast("Ошибка сохранения: " + err.message, "error");
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // Load Admin Cars Table
    window.loadAdminCars = async function() {
        if (!carsTableBody) return;
        carsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;">Загрузка списка авто...</td></tr>`;

        try {
            const q = query(collection(db, "cars"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);

            if (snap.empty) {
                carsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#718096;">Автомобили не найдены. Нажмите "+ Массовое добавление авто" для быстрой загрузки.</td></tr>`;
                return;
            }

            carsTableBody.innerHTML = snap.docs.map(d => {
                const c = { id: d.id, ...d.data() };
                const usd = c.priceUSD || Math.round((c.price || 0) / 90);
                const krw = c.priceKRW || Math.round(usd * 1330);
                const kzt = c.priceKZT || Math.round(usd * 455);
                const photoCount = Array.isArray(c.images) && c.images.length > 0 ? c.images.length : (c.imageUrl ? 1 : 0);

                return `
                    <tr>
                        <td>
                            <img src="${c.imageUrl || 'logos/KoreaAuto_logo.png'}" style="width:58px;height:40px;object-fit:cover;border-radius:4px;" onerror="this.src='logos/KoreaAuto_logo.png'">
                        </td>
                        <td>
                            <strong>${c.brand} ${c.model}</strong>
                            <div style="font-size:11px;color:#718096;">${c.trim || c.engine || ''}</div>
                        </td>
                        <td>${c.year} г.</td>
                        <td>
                            <strong style="color:#2563eb;">${formatUSD(usd)}</strong>
                            <div style="font-size:11px;color:#6b7280;">₩${Math.round(krw).toLocaleString()} / ${formatKZT(kzt)}</div>
                        </td>
                        <td>${c.fuel || '-'} / ${c.transmission || '-'}</td>
                        <td><span class="status-badge ${c.isAvailable ? 'status-completed' : 'status-cancelled'}">${c.isAvailable ? 'В наличии' : 'Недоступен'}</span></td>
                        <td>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                <button class="btn-sm-primary manage-photos-row" data-id="${c.id}" style="background:#2563eb;color:#fff;font-weight:600;">📷 Фото (${photoCount})</button>
                                <button class="btn-sm-primary edit-car-row" data-id="${c.id}">Изменить</button>
                                <button class="btn-sm-danger delete-car-row" data-id="${c.id}">Удалить</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join("");

            // Manage Photos click
            carsTableBody.querySelectorAll(".manage-photos-row").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = btn.getAttribute("data-id");
                    const docSnap = snap.docs.find(d => d.id === id);
                    if (docSnap) {
                        const data = docSnap.data();
                        window.openCarPhotosModal(id, data.brand, data.model, data.year, data.imageUrl, data.images);
                    }
                });
            });

            // Edit row click
            carsTableBody.querySelectorAll(".edit-car-row").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = btn.getAttribute("data-id");
                    const docSnap = snap.docs.find(d => d.id === id);
                    if (docSnap) {
                        const data = docSnap.data();
                        carIdInput.value = id;
                        brandInput.value = data.brand || "";
                        modelInput.value = data.model || "";
                        yearInput.value = data.year || 2026;
                        if (trimInput) trimInput.value = data.trim || "";
                        priceUSDInput.value = data.priceUSD || Math.round((data.price || 0) / 90);
                        priceKRWInput.value = data.priceKRW || "";
                        priceKZTInput.value = data.priceKZT || "";
                        mileageInput.value = data.mileage || 0;
                        fuelSelect.value = data.fuel || "Бензин";
                        transSelect.value = data.transmission || "Автомат (AT)";
                        if (seatsInput) seatsInput.value = data.seats || 5;
                        if (locationInput) locationInput.value = data.location || "Местная сборка • Кёнгидо";
                        if (conditionInput) conditionInput.value = data.condition || "Как новая";
                        imgInput.value = data.imageUrl || "";
                        if (imgPreview) imgPreview.src = data.imageUrl || "logos/KoreaAuto_logo.png";
                        if (galleryInput) {
                            const extra = Array.isArray(data.images) ? data.images.filter(u => u !== data.imageUrl) : [];
                            galleryInput.value = extra.join("\n");
                            renderGalleryThumbs();
                        }
                        descInput.value = data.description || "";
                        modalTitle.textContent = "Редактирование автомобиля";
                        openModal("carEditModal");
                    }
                });
            });

            // Delete row click
            carsTableBody.querySelectorAll(".delete-car-row").forEach(btn => {
                btn.addEventListener("click", async () => {
                    if (confirm("Удалить этот автомобиль из каталога?")) {
                        await deleteDoc(doc(db, "cars", btn.getAttribute("data-id")));
                        showToast("Автомобиль удален.", "info");
                        loadAdminCars();
                        loadDashboardStats();
                    }
                });
            });

        } catch (e) {
            console.error("Error loading admin cars:", e);
        }
    };

    loadAdminCars();
}

// 2.1 Dedicated 6-Photo Management Modal
function setupCarPhotosModal() {
    const modal = document.getElementById("carPhotosModal");
    const form = document.getElementById("carPhotosForm");
    const carIdInput = document.getElementById("photoCarId");
    const modalTitle = document.getElementById("carPhotosModalTitle");
    const container = document.getElementById("photoSlotsContainer");
    const btnRealistic = document.getElementById("btnApplyRealisticPhotos");
    const btnPasteBulk = document.getElementById("btnPasteBulkUrls");

    if (!modal || !form || !container) return;

    const SLOT_CONFIG = [
        { label: "1. Главное фото (вид 3/4 спереди)", placeholder: "Основной ракурс кузова" },
        { label: "2. Вид сзади (3/4)", placeholder: "Задняя оптика и профиль" },
        { label: "3. Вид сбоку (профиль)", placeholder: "Боковой ракурс автомобиля" },
        { label: "4. Салон / Торпедо", placeholder: "Центральная консоль и салон" },
        { label: "5. Приборная панель и руль", placeholder: "Водительское место и приборы" },
        { label: "6. Сиденья и пассажирский ряд", placeholder: "Комфорт сидений / капитанский ряд" }
    ];

    let activeBrand = "";
    let activeModel = "";

    window.openCarPhotosModal = (carId, brand = "", model = "", year = "", mainImageUrl = "", images = []) => {
        carIdInput.value = carId;
        activeBrand = brand;
        activeModel = model;

        if (modalTitle) {
            modalTitle.textContent = `📷 6 ракурсов фото: ${brand} ${model} ${year}`;
        }

        // Collect existing photos
        let photoList = [];
        if (Array.isArray(images) && images.length > 0) {
            photoList = [...images];
        } else if (mainImageUrl) {
            photoList = [mainImageUrl];
        }

        // Render 6 slots
        container.innerHTML = SLOT_CONFIG.map((cfg, i) => {
            const url = photoList[i] || "";
            return `
                <div class="photo-slot-card" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                    <div style="font-size:12px; font-weight:700; color:#1e293b; display:flex; justify-content:space-between; align-items:center;">
                        <span>${cfg.label}</span>
                    </div>
                    <div style="width:100%; height:130px; background:#f1f5f9; border-radius:6px; overflow:hidden; display:flex; align-items:center; justify-content:center; border:1px solid #cbd5e1;">
                        <img id="slotImg_${i}" src="${url || 'logos/KoreaAuto_logo.png'}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='logos/KoreaAuto_logo.png'">
                    </div>
                    <input type="url" id="slotUrl_${i}" class="slot-url-input" placeholder="${cfg.placeholder} (URL)" value="${url}" style="height:36px; font-size:12px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px;">
                    <div style="display:flex; justify-content:flex-end;">
                        <button type="button" class="clear-slot-btn" data-slot="${i}" style="background:none; border:none; color:#ef4444; font-size:11px; font-weight:600; cursor:pointer;">✕ Очистить</button>
                    </div>
                </div>
            `;
        }).join("");

        // Bind slot inputs live previews
        SLOT_CONFIG.forEach((_, i) => {
            const input = document.getElementById(`slotUrl_${i}`);
            const img = document.getElementById(`slotImg_${i}`);
            if (input && img) {
                input.addEventListener("input", () => {
                    img.src = input.value.trim() || "logos/KoreaAuto_logo.png";
                });
            }
        });

        // Bind clear buttons
        container.querySelectorAll(".clear-slot-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = btn.getAttribute("data-slot");
                const input = document.getElementById(`slotUrl_${idx}`);
                const img = document.getElementById(`slotImg_${idx}`);
                if (input) input.value = "";
                if (img) img.src = "logos/KoreaAuto_logo.png";
            });
        });

        openModal("carPhotosModal");
    };

    // Realistic Preset auto-fill for 6 slots
    if (btnRealistic) {
        btnRealistic.addEventListener("click", () => {
            const photos = getPhotosForCar(activeBrand, activeModel);
            if (photos && photos.length > 0) {
                photos.slice(0, 6).forEach((u, i) => {
                    const input = document.getElementById(`slotUrl_${i}`);
                    const img = document.getElementById(`slotImg_${i}`);
                    if (input) input.value = u;
                    if (img) img.src = u;
                });
                showToast(`Подставлен пакет из 6 фото для ${activeBrand || 'модели'}!`, "info");
            }
        });
    }

    // Bulk URL Paste
    if (btnPasteBulk) {
        btnPasteBulk.addEventListener("click", () => {
            const pasted = prompt("Вставьте до 6 ссылок на фотографии (каждая с новой строки или через запятую):");
            if (pasted) {
                const urls = pasted.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                urls.slice(0, 6).forEach((u, i) => {
                    const input = document.getElementById(`slotUrl_${i}`);
                    const img = document.getElementById(`slotImg_${i}`);
                    if (input) input.value = u;
                    if (img) img.src = u;
                });
                showToast(`Заполнено слотов: ${Math.min(urls.length, 6)}`, "success");
            }
        });
    }

    // Form submit: save to Firestore
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const carId = carIdInput.value;
        if (!carId) return;

        const submitBtn = form.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.textContent = "Сохранение...";

        const allUrls = [];
        for (let i = 0; i < SLOT_CONFIG.length; i++) {
            const val = document.getElementById(`slotUrl_${i}`)?.value.trim();
            if (val) allUrls.push(val);
        }

        const mainPhoto = allUrls[0] || "logos/KoreaAuto_logo.png";

        try {
            await updateDoc(doc(db, "cars", carId), {
                imageUrl: mainPhoto,
                images: allUrls,
                updatedAt: serverTimestamp()
            });

            showToast("6 фотографий автомобиля успешно сохранены в Firestore!", "success");
            closeModal("carPhotosModal");
            if (window.loadAdminCars) window.loadAdminCars();
        } catch (err) {
            console.error("Photos save error:", err);
            showToast("Ошибка сохранения фото: " + err.message, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "💾 Сохранить фотографии";
        }
    });
}

// ==========================================================================
// 3. BATCH MULTI-CAR ADDER (ТРЕБОВАНИЕ: ДОБАВИТЬ СРАЗУ НЕСКОЛЬКО КАРТОЧЕК)
// ==========================================================================
function setupBatchMultiCarAdder() {
    const batchModalBtn = document.getElementById("adminBatchAddBtn");
    const seedBtn = document.getElementById("seedDemoDataBtn");
    const tabPresetsBtn = document.getElementById("btnBatchTabPresets");
    const tabTableBtn = document.getElementById("btnBatchTabTable");
    const presetsContent = document.getElementById("batchTabPresetsContent");
    const tableContent = document.getElementById("batchTabTableContent");

    const addRowBtn = document.getElementById("addBatchRowBtn");
    const tbody = document.getElementById("batchRowsTbody");
    const submitBatchTableBtn = document.getElementById("submitBatchTableBtn");

    if (batchModalBtn) {
        batchModalBtn.addEventListener("click", () => {
            openModal("batchAddModal");
            // If table empty, add 3 blank rows by default
            if (tbody && tbody.children.length === 0) {
                for (let i = 0; i < 3; i++) addBatchRow();
            }
        });
    }

    // Toggle batch modal tabs
    if (tabPresetsBtn && tabTableBtn) {
        tabPresetsBtn.addEventListener("click", () => {
            tabPresetsBtn.classList.add("active");
            tabTableBtn.classList.remove("active");
            presetsContent.style.display = "block";
            tableContent.style.display = "none";
        });

        tabTableBtn.addEventListener("click", () => {
            tabTableBtn.classList.add("active");
            tabPresetsBtn.classList.remove("active");
            tableContent.style.display = "block";
            presetsContent.style.display = "none";
        });
    }

    // Batch Presets Click Handler
    document.querySelectorAll(".batch-preset-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const presetKey = btn.getAttribute("data-preset");
            let carsToImport = [];

            if (presetKey === "all10") {
                carsToImport = [
                    ...WESTMOTORS_DEMO_PRESETS.crossovers,
                    ...WESTMOTORS_DEMO_PRESETS.family,
                    ...WESTMOTORS_DEMO_PRESETS.sedans,
                    {
                        brand: "Kia",
                        model: "Sportage Gravity",
                        year: 2023,
                        trim: "1.6 T-GDI Hybrid 4WD",
                        priceUSD: 31200,
                        priceKRW: 41500000,
                        priceKZT: 14200000,
                        marketPriceUSD: 34500,
                        mileage: 12000,
                        engine: "1.6 T-GDI Hybrid (230 л.с.)",
                        displacement: "1.6 L",
                        fuel: "Гибрид",
                        transmission: "Автомат (AT)",
                        drive: "4WD",
                        seats: 5,
                        condition: "Как новая",
                        location: "Кёнгидо • Сувон",
                        daysOnSale: "2 дня в продаже",
                        imageUrl: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80",
                        description: "Экономичный гибридный кроссовер в комплектации Gravity. Расход всего 5.5 л/100 км.",
                        isAvailable: true
                    }
                ];
            } else if (WESTMOTORS_DEMO_PRESETS[presetKey]) {
                carsToImport = WESTMOTORS_DEMO_PRESETS[presetKey];
            }

            if (carsToImport.length > 0) {
                await importCarsBatch(carsToImport);
                closeModal("batchAddModal");
            }
        });
    });

    if (seedBtn) {
        seedBtn.addEventListener("click", async () => {
            const all10 = [
                ...WESTMOTORS_DEMO_PRESETS.crossovers,
                ...WESTMOTORS_DEMO_PRESETS.family,
                ...WESTMOTORS_DEMO_PRESETS.sedans
            ];
            await importCarsBatch(all10);
        });
    }

    // Dynamic Multi-Row Table management
    function addBatchRow(data = {}) {
        if (!tbody) return;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><input type="text" class="row-brand" value="${data.brand || 'Genesis'}" placeholder="Genesis"></td>
            <td><input type="text" class="row-model" value="${data.model || 'GV70'}" placeholder="GV70"></td>
            <td><input type="number" class="row-year" value="${data.year || 2026}" placeholder="2026"></td>
            <td><input type="number" class="row-price" value="${data.priceUSD || 38325}" placeholder="38325"></td>
            <td><input type="number" class="row-mileage" value="${data.mileage || 4417}" placeholder="4417"></td>
            <td>
                <select class="row-fuel">
                    <option value="Бензин" ${data.fuel === 'Бензин' ? 'selected' : ''}>Бензин</option>
                    <option value="Дизель" ${data.fuel === 'Дизель' ? 'selected' : ''}>Дизель</option>
                    <option value="Гибрид" ${data.fuel === 'Гибрид' ? 'selected' : ''}>Гибрид</option>
                    <option value="Электро" ${data.fuel === 'Электро' ? 'selected' : ''}>Электро</option>
                </select>
            </td>
            <td><input type="url" class="row-img" value="${data.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80'}" placeholder="https://..."></td>
            <td style="text-align:center;">
                <button type="button" class="del-row-btn" style="background:none;border:none;color:#e52b38;cursor:pointer;font-size:18px;">&times;</button>
            </td>
        `;

        row.querySelector(".del-row-btn").addEventListener("click", () => row.remove());
        tbody.appendChild(row);
    }

    if (addRowBtn) {
        addRowBtn.addEventListener("click", () => addBatchRow());
    }

    // Submit Multi-Row Table
    if (submitBatchTableBtn) {
        submitBatchTableBtn.addEventListener("click", async () => {
            const rows = tbody.querySelectorAll("tr");
            if (rows.length === 0) {
                showToast("Добавьте хотя бы одну строку.", "error");
                return;
            }

            const cars = [];
            rows.forEach(r => {
                const brand = r.querySelector(".row-brand").value.trim();
                const model = r.querySelector(".row-model").value.trim();
                const year = Number(r.querySelector(".row-year").value) || 2026;
                const usd = Number(r.querySelector(".row-price").value) || 38325;
                const mileage = Number(r.querySelector(".row-mileage").value) || 4000;
                const fuel = r.querySelector(".row-fuel").value;
                const img = r.querySelector(".row-img").value.trim() || "logos/KoreaAuto_logo.png";

                if (brand && model) {
                    cars.push({
                        brand,
                        model,
                        year,
                        trim: `${brand} ${model} 4WD`,
                        priceUSD: usd,
                        priceKRW: Math.round(usd * 1330),
                        priceKZT: Math.round(usd * 455),
                        price: usd * 90,
                        marketPriceUSD: Math.round(usd * 1.05 + 1958),
                        mileage,
                        displacement: "2.5 L",
                        engine: "2.5 Turbo",
                        fuel,
                        transmission: "Автомат (AT)",
                        drive: "4WD (Полный)",
                        seats: 5,
                        location: "Местная сборка • Кёнгидо",
                        condition: "Как новая",
                        daysOnSale: "1 день в продаже",
                        imageUrl: img,
                        description: `Автомобиль ${brand} ${model} ${year} года из Южной Кореи в отличном состоянии. Прошел полную диагностику Encar.`,
                        isAvailable: true
                    });
                }
            });

            if (cars.length === 0) {
                showToast("Заполните марку и модель авто.", "error");
                return;
            }

            submitBatchTableBtn.disabled = true;
            submitBatchTableBtn.textContent = "Сохранение...";
            await importCarsBatch(cars);
            submitBatchTableBtn.disabled = false;
            submitBatchTableBtn.textContent = "💾 Сохранить все строки в Firestore";
            closeModal("batchAddModal");
        });
    }
}

// Atomic Batch Writer function for Firestore
async function importCarsBatch(carsArray) {
    try {
        const batch = writeBatch(db);
        const carsRef = collection(db, "cars");

        carsArray.forEach(car => {
            const newDocRef = doc(carsRef);
            batch.set(newDocRef, {
                ...car,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        });

        await batch.commit();
        showToast(`Успешно добавлено ${carsArray.length} автомобилей в базу Firestore!`, "success");
        if (window.loadAdminCars) window.loadAdminCars();
        loadDashboardStats();
    } catch (e) {
        console.error("Batch error:", e);
        showToast("Ошибка массового добавления: " + e.message, "error");
    }
}

// 4. Applications Management (Real-Time onSnapshot)
function setupApplicationsRealtime() {
    const appsTableBody = document.getElementById("adminAppsTableBody");
    if (!appsTableBody) return;

    const q = query(collection(db, "applications"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        if (snap.empty) {
            appsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#718096;">Заявок пока нет</td></tr>`;
            return;
        }

        appsTableBody.innerHTML = snap.docs.map(d => {
            const a = { id: d.id, ...d.data() };
            return `
                <tr>
                    <td><strong>#${a.id.slice(0, 6).toUpperCase()}</strong></td>
                    <td>
                        <div style="font-weight:600;">${a.userName || 'Не указано'}</div>
                        <div style="font-size:12px;color:#718096;">${a.userPhone || ''} | ${a.userEmail || ''}</div>
                    </td>
                    <td>
                        <div style="font-weight:600;">${a.carTitle || 'Подбор авто'}</div>
                        <div style="font-size:12px;color:#e52b38;">${formatUSD(a.carPrice)}</div>
                    </td>
                    <td>${formatDate(a.createdAt)}</td>
                    <td>${getStatusBadge(a.status)}</td>
                    <td>
                        <select class="filter-select change-app-status" data-id="${a.id}" style="height:32px;font-size:13px;width:150px;">
                            <option value="new" ${a.status === 'new' ? 'selected' : ''}>Новая</option>
                            <option value="in_progress" ${a.status === 'in_progress' ? 'selected' : ''}>В обработке</option>
                            <option value="approved" ${a.status === 'approved' ? 'selected' : ''}>Подтверждена</option>
                            <option value="shipping" ${a.status === 'shipping' ? 'selected' : ''}>В пути из Кореи</option>
                            <option value="completed" ${a.status === 'completed' ? 'selected' : ''}>Выдана</option>
                            <option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>Отменена</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn-sm-danger delete-app-btn" data-id="${a.id}">Удалить</button>
                    </td>
                </tr>
            `;
        }).join("");

        // Status change listener
        appsTableBody.querySelectorAll(".change-app-status").forEach(sel => {
            sel.addEventListener("change", async (e) => {
                const id = sel.getAttribute("data-id");
                const newStatus = e.target.value;
                try {
                    await updateDoc(doc(db, "applications", id), {
                        status: newStatus,
                        updatedAt: serverTimestamp()
                    });
                    showToast(`Статус заявки #${id.slice(0, 6)} изменен!`, "success");
                    loadDashboardStats();
                } catch (err) {
                    showToast("Ошибка смены статуса: " + err.message, "error");
                }
            });
        });

        // Delete button listener
        appsTableBody.querySelectorAll(".delete-app-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (confirm("Удалить эту заявку навсегда?")) {
                    await deleteDoc(doc(db, "applications", btn.getAttribute("data-id")));
                    showToast("Заявка удалена.", "info");
                    loadDashboardStats();
                }
            });
        });
    });
}

// 5. Users Management
async function setupUsersManagement() {
    const usersTableBody = document.getElementById("adminUsersTableBody");
    if (!usersTableBody) return;

    try {
        const snap = await getDocs(collection(db, "users"));
        if (snap.empty) {
            usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;">Пользователей пока нет</td></tr>`;
            return;
        }

        usersTableBody.innerHTML = snap.docs.map(d => {
            const u = { id: d.id, ...d.data() };
            return `
                <tr>
                    <td><strong>${u.displayName || 'Без имени'}</strong></td>
                    <td>${u.email}</td>
                    <td>${u.phone || '-'}</td>
                    <td>
                        <select class="filter-select change-user-role" data-id="${u.id}" style="height:32px;font-size:13px;width:140px;">
                            <option value="user" ${u.role !== 'admin' ? 'selected' : ''}>Пользователь</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Администратор</option>
                        </select>
                    </td>
                    <td>${formatDate(u.createdAt)}</td>
                </tr>
            `;
        }).join("");

        usersTableBody.querySelectorAll(".change-user-role").forEach(sel => {
            sel.addEventListener("change", async (e) => {
                const uid = sel.getAttribute("data-id");
                const newRole = e.target.value;
                try {
                    await updateDoc(doc(db, "users", uid), {
                        role: newRole,
                        updatedAt: serverTimestamp()
                    });
                    showToast(`Роль обновлена на ${newRole}!`, "success");
                } catch (err) {
                    showToast("Ошибка: " + err.message, "error");
                }
            });
        });

    } catch (e) {
        console.error("Error loading users:", e);
    }
}

// 6. Moderation
async function setupModeration() {
    const modContainer = document.getElementById("adminReviewsList");
    if (!modContainer) return;

    try {
        const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);

        if (snap.empty) {
            modContainer.innerHTML = `<p style="color:#718096;text-align:center;padding:20px;">Отзывов пока нет</p>`;
            return;
        }

        modContainer.innerHTML = snap.docs.map(d => {
            const r = { id: d.id, ...d.data() };
            return `
                <div class="review-card" style="margin-bottom:12px;">
                    <div class="review-card-header">
                        <div>
                            <strong>${r.userName || 'Аноним'}</strong>
                            <span style="color:#f6ad55;margin-left:8px;">${"★".repeat(r.rating)}</span>
                        </div>
                        <span class="review-date">${formatDate(r.createdAt)}</span>
                    </div>
                    <p class="review-text">${r.comment}</p>
                    <div style="margin-top:10px;text-align:right;">
                        <button class="btn-sm-danger delete-mod-review" data-id="${r.id}">Удалить отзыв</button>
                    </div>
                </div>
            `;
        }).join("");

        modContainer.querySelectorAll(".delete-mod-review").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (confirm("Удалить отзыв модератором?")) {
                    await deleteDoc(doc(db, "reviews", btn.getAttribute("data-id")));
                    showToast("Отзыв удален.", "info");
                    setupModeration();
                }
            });
        });

    } catch (e) {
        console.error("Error setting up moderation:", e);
    }
}
