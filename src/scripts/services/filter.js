document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "http://localhost:5134";
    const DEFAULT_IMAGE = "/src/assets/images/imagem_do_item.webp";

    const elements = {
        search: document.getElementById("search-items"),
        filterButton: document.querySelector(".filter-items"),
        filterContainer: document.querySelector(".filter-container"),
        category: document.getElementById("category"),
        typeOffer: document.getElementById("type-offer"),
        uf: document.getElementById("uf"),
        city: document.getElementById("city"),
        itemsContainer: document.querySelector(".items-container"),
    };

    let allItems = [];

    const text = (value) => String(value ?? "").toLowerCase().trim();

    function normalizeResponse(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.results)) return data.results;
        return [];
    }

    function getImageUrl(item) {
        const firstPhoto = item.photos?.[0] || item.images?.[0];

        if (typeof firstPhoto === "string") return firstPhoto;
        if (firstPhoto?.imageUrl) return firstPhoto.imageUrl;
        if (firstPhoto?.url) return firstPhoto.url;

        return item.imageUrl || item.image || DEFAULT_IMAGE;
    }

    function getLocation(item) {
        const city = item.city || item.address?.city || "";
        const state = item.state || item.address?.state || "";

        if (city && state) return `${city} / ${state}`;
        return city || state || "Localização não informada";
    }

    function getCategoryText(item) {
        return item.categoryName || item.category?.name || "Categoria não informada";
    }

    function getTypeOfferText(item) {
        return String(item.typeOffer ?? item.offerType ?? "");
    }

    function getSearchText(item) {
        return text([
            item.title,
            item.description,
            getCategoryText(item),
            getLocation(item),
            item.city,
            item.state,
            item.neighborhood,
            item.street
        ].join(" "));
    }

    function matchesSearch(item, query) {
        if (!query) return true;
        return getSearchText(item).includes(query);
    }

    function matchesCategory(item, selected) {
        if (!selected) return true;

        const categoryId = String(item.categoryId ?? item.category?.id ?? "");
        const categoryName = text(getCategoryText(item));

        return categoryId === selected || categoryName.includes(text(selected));
    }

    function matchesTypeOffer(item, selected) {
        if (!selected) return true;

        const normalized = getTypeOfferText(item).toLowerCase();
        const map = {
            "1": ["1", "doacao", "donation"],
            "2": ["2", "lance livre", "freepickup", "freethrow"],
            "3": ["3", "venda", "sale"]
        };

        return (map[selected] || [selected]).some((value) => normalized.includes(value));
    }

    function matchesState(item, selected) {
        if (!selected) return true;
        return text(item.state || item.address?.state) === text(selected);
    }

    function matchesCity(item, selected) {
        if (!selected) return true;
        return text(item.city || item.address?.city) === text(selected);
    }

    function filterItems() {
        const query = text(elements.search?.value);
        const category = elements.category?.value || "";
        const typeOffer = elements.typeOffer?.value || "";
        const uf = elements.uf?.value || "";
        const city = elements.city?.value || "";

        return allItems.filter((item) => (
            matchesSearch(item, query) &&
            matchesCategory(item, category) &&
            matchesTypeOffer(item, typeOffer) &&
            matchesState(item, uf) &&
            matchesCity(item, city)
        ));
    }

    function renderMessage(message) {
        elements.itemsContainer.innerHTML = `<p class="paragraph">${message}</p>`;
    }

    function renderItems(items) {
        if (!items.length) {
            renderMessage("Nenhum item encontrado.");
            return;
        }

        elements.itemsContainer.innerHTML = items.map((item) => `
            <div class="item-card">
                <img src="${getImageUrl(item)}" alt="Imagem do item">

                <div class="item-info">
                    <h3>${item.title || "Item sem título"}</h3>
                    <p class="paragraph">${item.description || "Sem descrição disponível."}</p>

                    <div>
                        <span>${getLocation(item)}</span>
                        <span>${getCategoryText(item)}</span>
                    </div>

                    <button class="btn-details" data-item-id="${item.id}">Ver detalhes</button>
                </div>
            </div>
        `).join("");
    }

    async function loadItems() {
        renderMessage("Carregando itens...");

        try {
            const response = await fetch(`${API_BASE_URL}/api/item?pageNumber=1&pageSize=50`, {
                headers: { Accept: "application/json" }
            });

            if (!response.ok) {
                throw new Error("Não foi possível buscar os itens.");
            }

            allItems = normalizeResponse(await response.json());
            renderItems(filterItems());
        } catch (error) {
            console.error(error);
            renderMessage(error.message || "Erro ao carregar os itens.");
        }
    }

    elements.search?.addEventListener("input", () => renderItems(filterItems()));
    [elements.category, elements.typeOffer, elements.uf, elements.city].forEach((field) => {
        field?.addEventListener("change", () => renderItems(filterItems()));
    });

    elements.filterButton?.addEventListener("click", () => {
        elements.filterContainer?.classList.toggle("is-open");
    });

    elements.itemsContainer?.addEventListener("click", (event) => {
        const button = event.target.closest(".btn-details");
        if (!button?.dataset.itemId) return;
        if (typeof window.goToItemDetails === "function") {
            window.goToItemDetails(button.dataset.itemId);
            return;
        }

        window.location.href = `/src/pages/item-details/item-details.html?itemId=${encodeURIComponent(button.dataset.itemId)}`;
    });

    loadItems();
});
