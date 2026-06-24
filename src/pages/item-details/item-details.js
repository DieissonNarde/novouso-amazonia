document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "http://localhost:5134";
    const DEFAULT_IMAGE = "/src/assets/images/imagem_principal_do_item.webp";
    const itemId = new URLSearchParams(window.location.search).get("itemId");

    const refs = {
        itemDataSection: document.querySelector(".item-data"),
        itemOffersSection: document.querySelector(".item-offers"),
        title: document.querySelector("[data-item-title]"),
        description: document.querySelector("[data-item-description]"),
        owner: document.querySelector("[data-item-owner]"),
        category: document.querySelector("[data-item-category]"),
        quantity: document.querySelector("[data-item-quantity]"),
        offerType: document.querySelector("[data-item-offer-type]"),
        offerValue: document.querySelector("[data-item-offer-value]"),
        expiration: document.querySelector("[data-item-offer-expiration]"),
        cityState: document.querySelector("[data-item-city-state]"),
        neighborhood: document.querySelector("[data-item-neighborhood]"),
        address: document.querySelector("[data-item-address]"),
        mainImage: document.querySelector(".main-image"),
        thumbnails: Array.from(document.querySelectorAll(".item-images-wrap .item-image")),
        bidsWrap: document.querySelector(".bid-card-wrap"),
        offerFormWrap: document.querySelector(".register-offer"),
        bidToggleButton: document.querySelector("[data-bid-toggle]"),
        headerUser: document.querySelector("[data-user-display-name]")
    };

    const state = { isOwner: false };

    function getToken() {
        if (typeof window.getToken === "function") return window.getToken();
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentUser() {
        if (typeof window.getUser === "function") return window.getUser();
        try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function getCurrentUserId() {
        const token = getToken();
        const user = getCurrentUser();
        const tokenUserId = typeof window.getUserIdFromToken === "function"
            ? window.getUserIdFromToken(token)
            : null;

        return tokenUserId
            ?? user?.id
            ?? user?.Id
            ?? user?.userId
            ?? user?.UserId
            ?? user?.user?.id
            ?? user?.user?.Id
            ?? user?.user?.userId
            ?? user?.user?.UserId
            ?? null;
    }

    function showPageError(message) {
        if (!refs.itemDataSection) return;
        const error = document.createElement("p");
        error.className = "paragraph";
        error.style.color = "red";
        error.style.marginTop = "16px";
        error.textContent = message;
        refs.itemDataSection.prepend(error);
    }

    function setText(el, value, fallback = "-") {
        if (el) el.textContent = value || fallback;
    }

    function setInfoValue(selector, value, fallback = "-") {
        const el = document.querySelector(selector);
        if (el) el.textContent = value || fallback;
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

    function formatCurrency(value) {
        const normalized = typeof value === "string"
            ? Number(value.replace(",", ".").replace(/[^\d.-]/g, ""))
            : Number(value || 0);
        return normalized.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function formatOfferType(type) {
        const normalized = String(type ?? "").toLowerCase().trim();
        const map = {
            "1": "Doação",
            "2": "Lance livre",
            "3": "Venda",
            donation: "Doação",
            freethrow: "Lance livre",
            sale: "Venda",
            doacao: "Doação",
            "lance-livre": "Lance livre",
            venda: "Venda"
        };
        return map[normalized] || type || "-";
    }

    function formatListingDuration(duration) {
        const normalized = String(duration ?? "").trim();
        if (!normalized) return "-";
        if (normalized === "1") return "1 dia";
        return `${normalized} dias`;
    }

    function formatDate(dateString) {
        if (!dateString) return "-";
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return "-";
        return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    function formatBidStatus(status) {
        const normalized = String(status ?? "").toLowerCase();
        const map = { "1": "Pendente", "2": "Aceito", "3": "Recusado", "4": "Expirado", sent: "Pendente", accepted: "Aceito", rejected: "Recusado", expired: "Expirado" };
        return map[normalized] || "Pendente";
    }

    function formatProposalType(type) {
        const normalized = String(type ?? "").toLowerCase();
        const map = { "1": "Tenho interesse e pago", "2": "Retiro de graça", "3": "Cobro para retirar", payforitem: "Tenho interesse e pago", freepickup: "Retiro de graça", chargeforremoval: "Cobro para retirar" };
        return map[normalized] || "-";
    }

    function resolveItemOwnerId(item) {
        const candidates = [
            item?.userId, item?.UserId, item?.user?.id, item?.user?.Id, item?.User?.id, item?.User?.Id,
            item?.user?.userId, item?.user?.UserId, item?.ownerUserId, item?.OwnerUserId,
            item?.owner?.id, item?.Owner?.Id, item?.createdBy?.id, item?.createdBy?.Id,
            item?.CreatedBy?.id, item?.CreatedBy?.Id
        ];
        return candidates.find((candidate) => candidate !== null && candidate !== undefined) ?? null;
    }

    function getItemImages(item, photos) {
        const fromPhotos = Array.isArray(photos)
            ? photos.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((photo) => photo?.url || photo?.path || "").filter(Boolean)
            : [];
        const fromItem = Array.isArray(item?.photos)
            ? item.photos.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((photo) => photo?.url || photo?.path || "").filter(Boolean)
            : [];
        const fallback = [];
        if (item?.image) fallback.push(item.image);
        if (item?.imageUrl) fallback.push(item.imageUrl);
        if (item?.thumbnail) fallback.push(item.thumbnail);
        return [...fromPhotos, ...fromItem, ...fallback]
            .filter(Boolean)
            .map(resolveImageUrl);
    }

    function getBids(itemIdValue) {
        return fetch(`${API_BASE_URL}/api/Bid`, {
            headers: { Accept: "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) }
        })
            .then((response) => response.ok ? response.json() : [])
            .then((data) => {
                const list = Array.isArray(data) ? data : data?.items || data?.data || [];
                return list.filter((bid) => String(bid.itemId) === String(itemIdValue) && String(bid.status ?? "") !== "3");
            })
            .catch(() => []);
    }

    async function updateBidStatus(card, status) {
        const token = getToken();
        if (!token) throw new Error("Você precisa estar autenticado para atualizar lances.");

        const bidId = card?.dataset.bidId;
        const value = card?.dataset.bidValue || "0";
        const description = card?.dataset.bidDescription || "";
        const proposalType = Number(card?.dataset.bidProposalType || 1);

        if (!bidId) throw new Error("Não foi possível identificar o lance.");

        const response = await fetch(`${API_BASE_URL}/api/Bid`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                id: Number(bidId),
                itemId: Number(itemId),
                value,
                description,
                status: Number(status),
                proposalType
            })
        });

        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json") ? await response.json() : null;

        if (!response.ok) {
            throw new Error(data?.message || "Não foi possível atualizar o lance.");
        }

        return data;
    }

    async function getPhotos(itemIdValue) {
        const headers = { Accept: "application/json" };
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        try {
            const response = await fetch(`${API_BASE_URL}/api/ItemPhoto`, { headers });
            if (!response.ok) return [];
            const data = await response.json();
            const list = Array.isArray(data) ? data : data?.items || data?.data || [];
            return list.filter((photo) => String(photo.itemId) === String(itemIdValue));
        } catch {
            return [];
        }
    }

    function setOwnerHeader(user) {
        if (!refs.headerUser) return;
        refs.headerUser.textContent = user?.name || user?.fullName || "Minha conta";
    }

    function setVisibility() {
        const showForm = !state.isOwner;
        if (refs.offerFormWrap) refs.offerFormWrap.hidden = !showForm;
        if (refs.bidToggleButton) refs.bidToggleButton.hidden = !showForm;
        refs.itemOffersSection?.setAttribute("data-is-owner", String(state.isOwner));
    }

    function redirectToMatchingPage() {
        const isOwnerPage = window.location.pathname.endsWith("/owner-item-details.html");
        const isVisitorPage = window.location.pathname.endsWith("/item-details.html");

        if (state.isOwner && isVisitorPage) {
            window.location.replace(`/src/pages/item-details/owner-item-details.html?itemId=${encodeURIComponent(itemId)}`);
            return true;
        }

        if (!state.isOwner && isOwnerPage) {
            window.location.replace(`/src/pages/item-details/item-details.html?itemId=${encodeURIComponent(itemId)}`);
            return true;
        }

        return false;
    }

    function renderImages(images, title) {
        const finalImages = images.length ? images : [DEFAULT_IMAGE];
        if (refs.mainImage) {
            refs.mainImage.src = finalImages[0];
            refs.mainImage.alt = `Imagem principal de ${title}`;
            refs.mainImage.onerror = () => {
                refs.mainImage.onerror = null;
                refs.mainImage.src = DEFAULT_IMAGE;
            };
        }

        refs.thumbnails.forEach((img, index) => {
            const imageUrl = finalImages[index + 1];
            if (imageUrl) {
                img.src = imageUrl;
                img.alt = `Imagem ${index + 2} de ${title}`;
                img.style.display = "block";
                img.onerror = () => {
                    img.onerror = null;
                    img.src = DEFAULT_IMAGE;
                };
                img.onclick = () => {
                    if (refs.mainImage) {
                        refs.mainImage.src = imageUrl;
                        refs.mainImage.alt = `Imagem principal de ${title}`;
                    }
                };
            } else {
                img.removeAttribute("src");
                img.alt = "";
                img.style.display = "none";
                img.onclick = null;
            }
        });
    }

    function renderBidCard(bid) {
        const card = document.createElement("div");
        card.className = "bid-card";
        card.dataset.bidId = String(bid.id);
        card.dataset.bidStatus = String(bid.status ?? "1");
        card.dataset.bidValue = String(bid.value ?? bid.amount ?? "0");
        card.dataset.bidDescription = bid.description || "";
        card.dataset.bidProposalType = String(bid.proposalType ?? "1");
        card.dataset.bidUserId = String(bid.userId ?? "");
        const isOwnerPending = state.isOwner && String(bid.status ?? "1") === "1";

        card.innerHTML = `
            <div class="bid-text-wrap">
                <h4>${bid.userName || bid.user?.name || "Usuário"}</h4>
                <span class="offer-date">${formatDate(bid.date || bid.createdAt)}</span>
            </div>

            <div class="bid-offer-wrap">
                <span class="type-offer">${formatProposalType(bid.proposalType ?? bid.type)}</span>
                <span class="offer-price">${formatCurrency(bid.value ?? bid.amount ?? 0)}</span>
            </div>

            <p class="paragraph">${bid.description || "-"}</p>

            ${state.isOwner ? `
                <div class="bid-buttons-wrap">
                    ${isOwnerPending ? `
                        <button class="bid-button accept" type="button">Aceitar</button>
                        <button class="bid-button reject" type="button">Recusar</button>
                    ` : `<span class="bid-status">Status: ${formatBidStatus(bid.status)}</span>`}
                </div>
            ` : ""}
        `;
        return card;
    }

    function renderBids(bids) {
        if (!refs.bidsWrap) return;
        refs.bidsWrap.innerHTML = "";
        if (!bids.length) {
            const empty = document.createElement("p");
            empty.className = "paragraph";
            empty.textContent = "Este item ainda não possui lances.";
            refs.bidsWrap.appendChild(empty);
            return;
        }
        bids.forEach((bid) => refs.bidsWrap.appendChild(renderBidCard(bid)));
    }

    async function handleBidAction(event) {
        if (refs.itemOffersSection?.dataset.isOwner !== "true") return;

        const button = event.target.closest(".bid-button.accept, .bid-button.reject");
        if (!button) return;

        const card = button.closest(".bid-card");
        const bidId = card?.dataset.bidId;
        if (!bidId || !card) return;

        try {
            button.disabled = true;
            if (button.classList.contains("accept")) {
                await updateBidStatus(card, 2);
                window.location.href = `/src/pages/winning-bid/owner-winning-bid.html?itemId=${encodeURIComponent(itemId)}&bidId=${encodeURIComponent(bidId)}`;
                return;
            }

            await updateBidStatus(card, 3);
            card?.remove();

            if (refs.bidsWrap && !refs.bidsWrap.querySelector(".bid-card")) {
                const empty = document.createElement("p");
                empty.className = "paragraph";
                empty.textContent = "Este item ainda não possui lances.";
                refs.bidsWrap.appendChild(empty);
            }
        } catch (error) {
            console.error(error);
            showPageError(error.message || "Erro ao atualizar o lance.");
        } finally {
            button.disabled = false;
        }
    }

    function renderItem(item, photos) {
        const title = item.title || item.name || "Item sem título";
        const description = item.description || "Sem descrição disponível.";
        const ownerName = item.user?.name || item.User?.name || item.owner?.name || item.Owner?.name || "-";
        const category = item.category?.name || item.categoryName || item.category || "-";
        const quantity = item.quantity || item.amount || item.volume || "-";
        const offerType = formatOfferType(item.typeOffer ?? item.offerType ?? item.offer?.type);
        const offerValue = formatCurrency(item.value ?? item.offerValue ?? item.offer?.value ?? 0);
        const expiration = formatListingDuration(item.durationDays || item.durationOption || item.durationHours);
        const city = item.city || item.location?.city || "-";
        const stateText = item.state || item.uf || item.location?.state || item.location?.uf || "-";
        const neighborhood = item.neighborhood || item.district || item.location?.district || "-";
        const address = item.street || item.address || item.location?.address || "-";

        document.title = `${title} - NovoUso Amazônia`;
        setText(refs.title, title);
        setText(refs.description, description);
        setInfoValue("[data-item-owner]", ownerName);
        setInfoValue("[data-item-category]", category);
        setInfoValue("[data-item-quantity]", quantity);
        setInfoValue("[data-item-offer-type]", offerType);
        setInfoValue("[data-item-offer-value]", offerValue);
        setInfoValue("[data-item-offer-expiration]", expiration);
        setInfoValue("[data-item-city-state]", `${city}, ${stateText}`);
        setInfoValue("[data-item-neighborhood]", neighborhood);
        setInfoValue("[data-item-address]", address);
        renderImages(getItemImages(item, photos), title);

        const itemUserId = resolveItemOwnerId(item);
        const currentUserId = getCurrentUserId();
        state.isOwner = Boolean(currentUserId !== null && itemUserId !== null && String(currentUserId) === String(itemUserId));

        if (redirectToMatchingPage()) return;
        setVisibility();
    }

    async function loadAll() {
        try {
            const headers = { Accept: "application/json" };
            const token = getToken();
            if (token) headers.Authorization = `Bearer ${token}`;

            const itemResponse = await fetch(`${API_BASE_URL}/api/item/${itemId}`, { headers });
            if (!itemResponse.ok) throw new Error("Não foi possível carregar os detalhes do item.");

            const itemData = await itemResponse.json();
            const item = itemData?.item || itemData?.data || itemData;
            const [photos, bids] = await Promise.all([getPhotos(itemId), getBids(itemId)]);

            renderItem(item, photos);
            renderBids(bids);
            setOwnerHeader(getCurrentUser());
        } catch (error) {
            console.error(error);
            showPageError(error.message || "Erro ao carregar item.");
        }
    }

    refs.bidToggleButton?.addEventListener("click", () => {
        if (!refs.offerFormWrap || state.isOwner) return;
        refs.offerFormWrap.hidden = !refs.offerFormWrap.hidden;
    });

    refs.bidsWrap?.addEventListener("click", handleBidAction);

    window.addEventListener("item-details:refresh", loadAll);
    window.addEventListener("item-details:reload-bids", loadAll);

    if (!itemId) {
        showPageError("Não foi possível identificar o item.");
        return;
    }

    refs.itemOffersSection?.setAttribute("data-item-id", itemId);
    loadAll();
});
