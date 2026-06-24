document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "http://localhost:5134";
    const itemId = new URLSearchParams(window.location.search).get("itemId");
    const bidId = new URLSearchParams(window.location.search).get("bidId");

    const refs = {
        itemData: document.querySelector(".item-data"),
        mainImage: document.querySelector(".main-image"),
        itemTitle: document.querySelector(".item-title h2"),
        bidderName: document.querySelector(".bid-card h4"),
        offerDate: document.querySelector(".bid-card .offer-date"),
        typeOffer: document.querySelector(".bid-card .type-offer"),
        offerPrice: document.querySelector(".bid-card .offer-price"),
        bidDescription: document.querySelector(".bid-card .paragraph"),
        checkbox: document.getElementById("accept"),
        acceptButton: document.querySelector(".item-terms .action-button")
    };

    if (!itemId) {
        showError("Não foi possível identificar o item.");
        return;
    }

    if (refs.acceptButton) refs.acceptButton.disabled = true;

    function getToken() {
        if (typeof window.getToken === "function") return window.getToken();
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function showError(message) {
        const error = document.createElement("p");
        error.className = "paragraph";
        error.style.color = "red";
        error.style.marginTop = "16px";
        error.textContent = message;
        refs.itemData?.prepend(error);
    }

    function setText(element, value, fallback = "-") {
        if (element) element.textContent = value || fallback;
    }

    function formatCurrency(value) {
        const normalized = Number(value || 0);
        return normalized.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function formatDate(dateString) {
        if (!dateString) return "-";
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return "-";
        return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    function formatBidType(type) {
        const normalized = String(type ?? "").toLowerCase();
        const map = {
            "1": "Pagar pelo item",
            "2": "Retirar gratuitamente",
            "3": "Cobrar pela retirada",
            payforitem: "Pagar pelo item",
            freepickup: "Retirar gratuitamente",
            chargeforremoval: "Cobrar pela retirada"
        };
        return map[normalized] || type || "-";
    }

    function getImageUrl(item) {
        if (Array.isArray(item.images) && item.images.length > 0) {
            const firstImage = item.images[0];
            if (typeof firstImage === "string") return firstImage;
            return firstImage?.url || firstImage?.path || "";
        }

        if (item.image) return item.image;
        if (item.imageUrl) return item.imageUrl;

        return "/src/assets/images/imagem_principal_do_item.webp";
    }

    function normalizeResponse(data) {
        return data?.item || data?.data || data;
    }

    function getWinningBid(item) {
        return item?.winningBid || item?.winnerBid || item?.acceptedBid || item?.selectedBid || null;
    }

    async function getBids() {
        const headers = { Accept: "application/json" };
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/api/Bid`, { headers });
        if (!response.ok) return [];

        const data = await response.json();
        const list = Array.isArray(data) ? data : data?.items || data?.data || [];
        return list.filter((bid) => String(bid.itemId) === String(itemId));
    }

    async function loadItemData() {
        const headers = { Accept: "application/json" };
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/api/item/${encodeURIComponent(itemId)}`, { headers });
        if (!response.ok) throw new Error("Não foi possível carregar os dados do item.");

        return normalizeResponse(await response.json());
    }

    async function resolveWinningBid(item) {
        const acceptedFromItem = getWinningBid(item);
        if (acceptedFromItem) return acceptedFromItem;

        const bids = await getBids();
        if (bidId) {
            const directBid = bids.find((bid) => String(bid.id) === String(bidId));
            if (directBid) return directBid;
        }

        return bids.find((bid) => String(bid.status ?? "") === "2") || null;
    }

    async function renderWinningBid(item) {
        const title = item.title || item.name || "Item sem título";
        const winningBid = await resolveWinningBid(item);
        const imageUrl = getImageUrl(item);

        document.title = `${title} - Oferta vencedora - NovoUso Amazônia`;

        if (refs.mainImage) {
            refs.mainImage.src = imageUrl;
            refs.mainImage.alt = `Imagem principal de ${title}`;
        }

        setText(refs.itemTitle, title);

        if (!winningBid) {
            const empty = document.createElement("p");
            empty.className = "paragraph";
            empty.textContent = "Ainda não existe um lance aceito para este item.";
            refs.itemData?.appendChild(empty);
            return;
        }

        const winnerName = winningBid.user?.name || winningBid.bidder?.name || winningBid.userName || "Usuário";
        const winnerDate = winningBid.createdAt || winningBid.updatedAt || winningBid.date || null;
        const winnerType = winningBid.type || winningBid.bidType || winningBid.proposalType || "-";
        const winnerValue = winningBid.value ?? winningBid.amount ?? 0;
        const winnerDescription = winningBid.description || "Sem descrição.";

        setText(refs.bidderName, winnerName);
        setText(refs.offerDate, formatDate(winnerDate));
        setText(refs.typeOffer, formatBidType(winnerType));
        setText(refs.offerPrice, formatCurrency(winnerValue));
        setText(refs.bidDescription, winnerDescription);
    }

    async function loadWinningBid() {
        try {
            const item = await loadItemData();
            await renderWinningBid(item);
        } catch (error) {
            console.error(error);
            showError(error.message || "Erro ao carregar os dados.");
        }
    }

    refs.checkbox?.addEventListener("change", () => {
        if (refs.acceptButton) refs.acceptButton.disabled = !refs.checkbox.checked;
    });

    refs.acceptButton?.addEventListener("click", () => {
        if (refs.acceptButton && refs.checkbox && refs.checkbox.checked) {
            refs.acceptButton.textContent = "Termos aceitos";
        }
    });

    loadWinningBid();
});
