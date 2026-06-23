document.addEventListener("DOMContentLoaded", () => {
    const apiBaseUrl = "http://localhost:5134";

    const itemsContainer = document.querySelector(".items-container");
    const searchInput = document.getElementById("search-items");
    const filterToggleButton = document.querySelector(".filter-items");
    const filterContainer = document.querySelector(".filter-container");

    const categorySelect = document.getElementById("category");
    const typeOfferSelect = document.getElementById("type-offer");
    const ufSelect = document.getElementById("uf");
    const citySelect = document.getElementById("city");

    let allItems = [];
    let searchTimeout = null;

    function getToken() {
        if (typeof window.getToken === "function") {
            return window.getToken();
        }

        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function normalizeResponse(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.results)) return data.results;
        return [];
    }

    function truncateText(text, maxLength = 140) {
        if (!text) return "";
        return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
    }

    function toText(value) {
        return String(value ?? "").toLowerCase().trim();
    }

    function formatLocation(item) {
        const city = item.city || item.location?.city || "";
        const state = item.state || item.uf || item.location?.state || item.location?.uf || "";

        if (city && state) return `${city} / ${state}`;
        if (city) return city;
        if (state) return state;

        return "Localização não informada";
    }

    function getImages(item) {
        if (Array.isArray(item.images) && item.images.length > 0) {
            return item.images
                .map((image) => {
                    if (typeof image === "string") return image;
                    return image?.url || image?.path || "";
                })
                .filter(Boolean);
        }

        if (Array.isArray(item.photos) && item.photos.length > 0) {
            return item.photos
                .map((photo) => {
                    if (typeof photo === "string") return photo;
                    return photo?.url || photo?.path || "";
                })
                .filter(Boolean);
        }

        if (item.image) return [item.image];
        if (item.imageUrl) return [item.imageUrl];
        if (item.thumbnail) return [item.thumbnail];

        return [];
    }

    function getImageUrl(item) {
        const images = getImages(item);
        return images[0] || "/src/assets/images/imagem_do_item.webp";
    }

    function getOfferCount(item) {
        if (typeof item.offersCount === "number") return item.offersCount;
        if (typeof item.bidsCount === "number") return item.bidsCount;
        if (Array.isArray(item.offers)) return item.offers.length;
        if (Array.isArray(item.bids)) return item.bids.length;
        return 0;
    }

    function getCategoryName(item) {
        return item.category?.name || item.categoryName || item.category || "Categoria não informada";
    }

    function getOwnerName(item) {
        return item.user?.name || item.owner?.name || "Usuário não informado";
    }

    function getCreatedAtLabel(item) {
        if (!item.createdAtUtc && !item.createdAt) {
            return "";
        }

        const date = new Date(item.createdAtUtc || item.createdAt);
        if (Number.isNaN(date.getTime())) return "";

        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function mapCategoryValue(value) {
        const map = {
            moveis: "móveis",
            eletro: "eletrodomésticos",
            outros: "outros"
        };

        return map[toText(value)] || toText(value);
    }

    function mapTypeOfferValue(value) {
        const map = {
            doacao: ["1", "donation", "doação"],
            "lance-livre": ["2", "freethrow", "lance livre"],
            venda: ["3", "sale", "venda"]
        };

        return map[toText(value)] || [toText(value)];
    }

    function getCategoryText(item) {
        return (
            item.category?.name ||
            item.categoryName ||
            item.category ||
            item.categoryId ||
            ""
        );
    }

    function getTypeOfferText(item) {
        return item.typeOffer ?? item.offerType ?? item.offer?.type ?? "";
    }

    function matchesSearch(item, query) {
        if (!query) return true;

        const haystack = [
            item.title,
            item.name,
            item.description,
            getCategoryText(item),
            getTypeOfferText(item),
            item.city,
            item.state,
            item.neighborhood,
            item.street
        ]
            .map(toText)
            .join(" ");

        return haystack.includes(query);
    }

    function matchesCategory(item, selectedValue) {
        if (!selectedValue) return true;

        const normalized = mapCategoryValue(selectedValue);
        const categoryText = toText(getCategoryText(item));

        return categoryText.includes(normalized) || categoryText === normalized;
    }

    function matchesTypeOffer(item, selectedValue) {
        if (!selectedValue) return true;

        const acceptedValues = mapTypeOfferValue(selectedValue);
        const itemValue = toText(getTypeOfferText(item));

        return acceptedValues.some((value) => itemValue.includes(value));
    }

    function matchesState(item, selectedValue) {
        if (!selectedValue) return true;
        const itemState = toText(item.state || item.uf || item.location?.state || item.location?.uf);
        return itemState === toText(selectedValue);
    }

    function matchesCity(item, selectedValue) {
        if (!selectedValue) return true;
        const itemCity = toText(item.city || item.location?.city);
        return itemCity === toText(selectedValue);
    }

    function applyFilters(items) {
        const query = toText(searchInput?.value);
        const category = categorySelect?.value || "";
        const typeOffer = typeOfferSelect?.value || "";
        const state = ufSelect?.value || "";
        const city = citySelect?.value || "";

        return items.filter((item) => {
            return (
                matchesSearch(item, query) &&
                matchesCategory(item, category) &&
                matchesTypeOffer(item, typeOffer) &&
                matchesState(item, state) &&
                matchesCity(item, city)
            );
        });
    }

    function setLoading() {
        itemsContainer.innerHTML = `<p class="paragraph">Carregando itens...</p>`;
    }

    function setError(message = "Erro ao carregar os itens.") {
        itemsContainer.innerHTML = `<p class="paragraph">${message}</p>`;
    }

    function renderItems(items) {
        itemsContainer.innerHTML = "";

        if (!items.length) {
            itemsContainer.innerHTML = `
                <p class="paragraph empty-state">
                    Nenhum item encontrado para os filtros informados.
                </p>
            `;
            return;
        }

        items.forEach((item) => {
            const card = document.createElement("div");
            card.className = "item-card";

            const itemId = item.id || item._id;
            const title = item.title || item.name || "Item sem título";
            const description = item.description || "Sem descrição disponível.";
            const imageUrl = getImageUrl(item);
            const location = formatLocation(item);
            const offersCount = getOfferCount(item);
            const categoryName = getCategoryName(item);
            const createdAtLabel = getCreatedAtLabel(item);
            const ownerName = getOwnerName(item);
            const metaText = createdAtLabel ? `${categoryName} • ${createdAtLabel}` : categoryName;

            card.dataset.itemId = itemId || "";
            card.innerHTML = `
                <img src="${imageUrl}" alt="${title}">

                <div class="item-info">
                    <h3>${title}</h3>
                    <p class="paragraph">${truncateText(description)}</p>

                    <div>
                        <span>${location}</span>
                        <span>${offersCount > 0 ? `${offersCount} oferta${offersCount === 1 ? "" : "s"}` : metaText}</span>
                    </div>

                    <p class="paragraph" style="margin-top: 0.8rem; font-size: 1.3rem;">
                        ${ownerName}
                    </p>

                    <button class="btn-details" data-item-id="${itemId}">
                        Ver detalhes
                    </button>
                </div>
            `;

            itemsContainer.appendChild(card);
        });
    }

    function renderFilteredItems() {
        const filteredItems = applyFilters(allItems);
        renderItems(filteredItems);
    }

    function handleSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(renderFilteredItems, 300);
    }

    function clearSelectIfPlaceholder(select) {
        if (select.selectedIndex === 0 && select.options[0]?.disabled) {
            return "";
        }
        return select.value;
    }

    function normalizeEmptyFilters() {
        if (!clearSelectIfPlaceholder(categorySelect)) categorySelect.value = "";
        if (!clearSelectIfPlaceholder(typeOfferSelect)) typeOfferSelect.value = "";
        if (!clearSelectIfPlaceholder(ufSelect)) ufSelect.value = "";
        if (!clearSelectIfPlaceholder(citySelect)) citySelect.value = "";
    }

    async function loadItems() {
        setLoading();

        try {
            const params = new URLSearchParams();
            params.set("pageNumber", "1");
            params.set("pageSize", "100");

            const headers = {
                Accept: "application/json"
            };

            const token = getToken();
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(`${apiBaseUrl}/api/item?${params.toString()}`, {
                method: "GET",
                headers
            });

            if (!response.ok) {
                throw new Error("Não foi possível buscar os itens.");
            }

            const data = await response.json();
            allItems = normalizeResponse(data);
            renderFilteredItems();
        } catch (error) {
            console.error(error);
            setError(error.message || "Erro ao carregar os itens.");
        }
    }

    filterToggleButton?.addEventListener("click", () => {
        filterContainer?.classList.toggle("is-open");
    });

    searchInput?.addEventListener("input", handleSearch);

    [categorySelect, typeOfferSelect, ufSelect, citySelect].forEach((select) => {
        select?.addEventListener("change", () => {
            normalizeEmptyFilters();
            renderFilteredItems();
        });
    });

    itemsContainer?.addEventListener("click", (event) => {
        const button = event.target.closest(".btn-details");
        const card = event.target.closest(".item-card");
        const itemId = button?.dataset.itemId || card?.dataset.itemId;

        if (!itemId) return;

        window.location.href = `/src/pages/item-details/item-details.html?itemId=${itemId}`;
    });

    loadItems();
});
