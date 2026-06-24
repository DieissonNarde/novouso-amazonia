document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "http://localhost:5134";
    const DEFAULT_IMAGE = "/src/assets/images/imagem_do_item.webp";
    const itemsContainer = document.querySelector(".items-container");

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function normalizeResponse(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.results)) return data.results;
        return [];
    }

    function resolveImageUrl(url) {
        if (!url) return DEFAULT_IMAGE;

        const value = String(url).trim();
        if (!value) return DEFAULT_IMAGE;
        if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
            return value;
        }

        if (value.startsWith("/")) {
            return `${API_BASE_URL}${value}`;
        }

        return `${API_BASE_URL}/${value}`;
    }

    function getImageUrl(item) {
        if (Array.isArray(item.photos) && item.photos.length > 0) {
            const firstPhoto = item.photos[0];
            if (typeof firstPhoto === "string") return resolveImageUrl(firstPhoto);
            return resolveImageUrl(firstPhoto?.imageUrl || firstPhoto?.url);
        }

        if (Array.isArray(item.images) && item.images.length > 0) {
            const firstImage = item.images[0];
            if (typeof firstImage === "string") return resolveImageUrl(firstImage);
            return resolveImageUrl(firstImage?.imageUrl || firstImage?.url);
        }

        return resolveImageUrl(item.imageUrl || item.image);
    }

    function getLocation(item) {
        const city = item.city || item.address?.city || "";
        const state = item.state || item.address?.state || "";
        if (city && state) return `${city} / ${state}`;
        return city || state || "Localização não informada";
    }

    function getCategory(item) {
        return item.categoryName || item.category?.name || "Categoria não informada";
    }

    function getDescription(item) {
        return item.description || "Sem descrição disponível.";
    }

    function buildCard(item) {
        const itemId = escapeHtml(item.id);
        const title = escapeHtml(item.title || item.name || "Item sem título");
        const description = escapeHtml(getDescription(item));
        const location = escapeHtml(getLocation(item));
        const category = escapeHtml(getCategory(item));
        const imageUrl = escapeHtml(getImageUrl(item));

        return `
            <div class="item-card">
                <img src="${imageUrl}" alt="Imagem do item" onerror="this.onerror=null;this.src='${DEFAULT_IMAGE}'">

                <div class="item-info">
                    <h3>${title}</h3>
                    <p class="paragraph">${description}</p>

                    <div>
                        <span>${location}</span>
                        <span>${category}</span>
                    </div>

                    <button class="btn-details" data-item-id="${itemId}">Ver detalhes</button>
                </div>
            </div>
        `;
    }

    function renderMessage(message) {
        itemsContainer.innerHTML = `<p class="paragraph">${escapeHtml(message)}</p>`;
    }

    function renderItems(items) {
        if (!items.length) {
            renderMessage("Nenhum item encontrado.");
            return;
        }

        itemsContainer.innerHTML = items.map(buildCard).join("");
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

            const data = await response.json();
            renderItems(normalizeResponse(data));
        } catch (error) {
            console.error(error);
            renderMessage(error.message || "Erro ao carregar os itens.");
        }
    }

    itemsContainer?.addEventListener("click", (event) => {
        const button = event.target.closest(".btn-details");
        if (!button) return;

        const itemId = button.dataset.itemId;
        if (!itemId) return;

        if (typeof window.goToItemDetails === "function") {
            window.goToItemDetails(itemId);
            return;
        }

        window.location.href = `/src/pages/item-details/item-details.html?itemId=${encodeURIComponent(itemId)}`;
    });

    loadItems();
});
