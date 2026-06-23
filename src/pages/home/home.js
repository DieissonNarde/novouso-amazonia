document.addEventListener("DOMContentLoaded", () => {
    const itemsContainer = document.querySelector(".items-container");
    const searchInput = document.getElementById("search-items");
    const filterToggleButton = document.querySelector(".filter-items");
    const filterContainer = document.querySelector(".filter-container");

    const categorySelect = document.getElementById("category");
    const typeOfferSelect = document.getElementById("type-offer");
    const ufSelect = document.getElementById("uf");
    const citySelect = document.getElementById("city");

    let searchTimeout = null;

    function getToken() {
        if (typeof window.getToken === "function") {
            return window.getToken();
        }

        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function normalizeItemsResponse(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.results)) return data.results;
        return [];
    }

    function truncateText(text, maxLength = 140) {
        if (!text) return "";
        return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
    }

    function formatLocation(item) {
        const city = item.city || item.location?.city || "";
        const state = item.state || item.uf || item.location?.state || item.location?.uf || "";

        if (city && state) return `${city} / ${state}`;
        if (city) return city;
        if (state) return state;

        return "Localização não informada";
    }

    function getImageUrl(item) {
        if (Array.isArray(item.images) && item.images.length > 0) {
            const firstImage = item.images[0];
            if (typeof firstImage === "string") return firstImage;
            if (firstImage?.url) return firstImage.url;
            if (firstImage?.path) return firstImage.path;
        }

        if (item.image) return item.image;
        if (item.imageUrl) return item.imageUrl;
        if (item.thumbnail) return item.thumbnail;

        return "/src/assets/images/imagem_do_item.webp";
    }

    function getOfferCount(item) {
        if (typeof item.offersCount === "number") return item.offersCount;
        if (typeof item.bidsCount === "number") return item.bidsCount;
        if (Array.isArray(item.offers)) return item.offers.length;
        if (Array.isArray(item.bids)) return item.bids.length;
        return 0;
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

            card.innerHTML = `
        <img src="${imageUrl}" alt="${title}">
        <div class="item-info">
          <h3>${title}</h3>
          <p class="paragraph">${truncateText(description)}</p>

          <div>
            <span>${location}</span>
            <span>${offersCount} oferta${offersCount === 1 ? "" : "s"}</span>
          </div>

          <button class="btn-details" data-item-id="${itemId}">
            Ver detalhes
          </button>
        </div>
      `;

            itemsContainer.appendChild(card);
        });
    }

    function setLoading() {
        itemsContainer.innerHTML = `<p class="paragraph">Carregando itens...</p>`;
    }

    function setError(message = "Erro ao carregar os itens.") {
        itemsContainer.innerHTML = `<p class="paragraph">${message}</p>`;
    }

    function buildQueryParams() {
        const params = new URLSearchParams();
        const search = searchInput.value.trim();
        const category = categorySelect.value;
        const typeOffer = typeOfferSelect.value;
        const uf = ufSelect.value;
        const city = citySelect.value;

        if (search) params.set("search", search);
        if (category) params.set("category", category);
        if (typeOffer) params.set("typeOffer", typeOffer);
        if (uf) params.set("uf", uf);
        if (city) params.set("city", city);

        return params;
    }

    async function loadItems() {
        setLoading();

        try {
            const params = buildQueryParams();
            const token = getToken();

            const headers = {
                Accept: "application/json"
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const url = `https://api.seudominio.com/items?${params.toString()}`;

            const response = await fetch(url, {
                method: "GET",
                headers
            });

            if (!response.ok) {
                throw new Error("Não foi possível buscar os itens.");
            }

            const data = await response.json();
            const items = normalizeItemsResponse(data);

            renderItems(items);
        } catch (error) {
            console.error(error);
            setError(error.message || "Erro ao carregar os itens.");
        }
    }

    function handleSearch() {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            loadItems();
        }, 400);
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

    filterToggleButton?.addEventListener("click", () => {
        filterContainer.classList.toggle("is-open");
    });

    searchInput?.addEventListener("input", handleSearch);

    [categorySelect, typeOfferSelect, ufSelect, citySelect].forEach((select) => {
        select?.addEventListener("change", () => {
            normalizeEmptyFilters();
            loadItems();
        });
    });

    itemsContainer.addEventListener("click", (event) => {
        const button = event.target.closest(".btn-details");
        if (!button) return;

        const itemId = button.dataset.itemId;
        if (!itemId) return;

        window.location.href = `/src/pages/item-details/item-details.html?itemId=${itemId}`;
    });

    loadItems();
});