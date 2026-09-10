// ==========================================================================
// KoreaAuto_v1 - Catalog Filters & Search Management
// ==========================================================================

import { fetchCars, renderCarCard } from "./cars.js";
import { isCarInFavorites, toggleFavorite } from "./favorites.js";

export class CatalogManager {
    constructor() {
        this.container = document.getElementById("carsGrid");
        this.loadMoreBtn = document.getElementById("loadMoreBtn");
        this.countDisplay = document.getElementById("catalogCount");
        this.emptyState = document.getElementById("emptyCatalogState");

        // Filter elements
        this.brandSelect = document.getElementById("filterBrand");
        this.fuelSelect = document.getElementById("filterFuel");
        this.minPriceInput = document.getElementById("filterMinPrice");
        this.maxPriceInput = document.getElementById("filterMaxPrice");
        this.minYearInput = document.getElementById("filterMinYear");
        this.sortSelect = document.getElementById("sortSelect");
        this.resetBtn = document.getElementById("resetFiltersBtn");
        this.searchInput = document.getElementById("headerSearchInput");

        this.lastDoc = null;
        this.hasMore = false;
        this.isLoading = false;
        this.allLoadedCars = [];

        this.init();
    }

    init() {
        if (!this.container) return;

        // Event listeners for filters
        if (this.brandSelect) this.brandSelect.addEventListener("change", () => this.applyFilters());
        if (this.fuelSelect) this.fuelSelect.addEventListener("change", () => this.applyFilters());
        if (this.sortSelect) this.sortSelect.addEventListener("change", () => this.applyFilters());

        if (this.minPriceInput) this.minPriceInput.addEventListener("change", () => this.applyFilters());
        if (this.maxPriceInput) this.maxPriceInput.addEventListener("change", () => this.applyFilters());
        if (this.minYearInput) this.minYearInput.addEventListener("change", () => this.applyFilters());

        if (this.resetBtn) {
            this.resetBtn.addEventListener("click", () => {
                if (this.brandSelect) this.brandSelect.value = "all";
                if (this.fuelSelect) this.fuelSelect.value = "all";
                if (this.minPriceInput) this.minPriceInput.value = "";
                if (this.maxPriceInput) this.maxPriceInput.value = "";
                if (this.minYearInput) this.minYearInput.value = "";
                if (this.sortSelect) this.sortSelect.value = "createdAt_desc";
                if (this.searchInput) this.searchInput.value = "";
                this.applyFilters();
            });
        }

        if (this.loadMoreBtn) {
            this.loadMoreBtn.addEventListener("click", () => this.loadMore());
        }

        // Check search query in URL param (e.g. ?q=Santa)
        const urlParams = new URLSearchParams(window.location.search);
        const qParam = urlParams.get("q");
        if (qParam && this.searchInput) {
            this.searchInput.value = qParam;
        }

        // Initial fetch
        this.applyFilters();
    }

    getFilterState() {
        return {
            brand: this.brandSelect ? this.brandSelect.value : "all",
            fuel: this.fuelSelect ? this.fuelSelect.value : "all",
            minPrice: this.minPriceInput?.value ? Number(this.minPriceInput.value) : null,
            maxPrice: this.maxPriceInput?.value ? Number(this.maxPriceInput.value) : null,
            minYear: this.minYearInput?.value ? Number(this.minYearInput.value) : null,
            sortBy: this.sortSelect ? this.sortSelect.value : "createdAt_desc",
            search: this.searchInput ? this.searchInput.value.trim().toLowerCase() : ""
        };
    }

    async applyFilters() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.lastDoc = null;
        this.allLoadedCars = [];

        this.container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: #718096;">
                <div style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Загрузка автомобилей...</div>
                <p>Получение актуальных предложений из Кореи</p>
            </div>
        `;

        const filters = this.getFilterState();
        const result = await fetchCars({
            brand: filters.brand,
            fuel: filters.fuel,
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
            minYear: filters.minYear,
            sortBy: filters.sortBy,
            lastDoc: null,
            pageSize: 6
        });

        let cars = result.cars;

        // Real text search by Brand, Model or Description
        if (filters.search) {
            cars = cars.filter(c => 
                (c.brand && c.brand.toLowerCase().includes(filters.search)) ||
                (c.model && c.model.toLowerCase().includes(filters.search)) ||
                (c.description && c.description.toLowerCase().includes(filters.search))
            );
        }

        this.allLoadedCars = cars;
        this.lastDoc = result.lastDoc;
        this.hasMore = result.hasMore;
        this.isLoading = false;

        this.renderCatalog();
    }

    async loadMore() {
        if (this.isLoading || !this.hasMore) return;
        this.isLoading = true;

        if (this.loadMoreBtn) {
            this.loadMoreBtn.textContent = "Загрузка...";
            this.loadMoreBtn.disabled = true;
        }

        const filters = this.getFilterState();
        const result = await fetchCars({
            brand: filters.brand,
            fuel: filters.fuel,
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
            minYear: filters.minYear,
            sortBy: filters.sortBy,
            lastDoc: this.lastDoc,
            pageSize: 6
        });

        let newCars = result.cars;
        if (filters.search) {
            newCars = newCars.filter(c => 
                (c.brand && c.brand.toLowerCase().includes(filters.search)) ||
                (c.model && c.model.toLowerCase().includes(filters.search))
            );
        }

        this.allLoadedCars.push(...newCars);
        this.lastDoc = result.lastDoc;
        this.hasMore = result.hasMore;
        this.isLoading = false;

        if (this.loadMoreBtn) {
            this.loadMoreBtn.textContent = "Показать еще";
            this.loadMoreBtn.disabled = false;
        }

        this.renderCatalog();
    }

    renderCatalog() {
        if (this.allLoadedCars.length === 0) {
            this.container.innerHTML = "";
            if (this.emptyState) this.emptyState.style.display = "block";
            if (this.loadMoreBtn) this.loadMoreBtn.style.display = "none";
            if (this.countDisplay) this.countDisplay.textContent = "0";
            return;
        }

        if (this.emptyState) this.emptyState.style.display = "none";
        if (this.countDisplay) this.countDisplay.textContent = this.allLoadedCars.length;

        const html = this.allLoadedCars.map(car => {
            const isFav = isCarInFavorites(car.id);
            return renderCarCard(car, isFav);
        }).join("");

        this.container.innerHTML = html;

        // Bind favorite buttons
        this.container.querySelectorAll(".fav-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const carId = btn.getAttribute("data-car-id");
                const active = await toggleFavorite(carId);
                btn.classList.toggle("active", active);
            });
        });

        if (this.loadMoreBtn) {
            this.loadMoreBtn.style.display = this.hasMore ? "flex" : "none";
        }
    }
}
