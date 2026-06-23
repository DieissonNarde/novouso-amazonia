document.addEventListener("DOMContentLoaded", () => {
    const apiBaseUrl = "http://localhost:5134";
    const itemId = new URLSearchParams(window.location.search).get("itemId");

    const itemDataSection = document.querySelector(".item-data");
    const itemOffersSection = document.querySelector(".item-offers");
    const titleElement = document.querySelector(".item-info h1");
    const descriptionElement = document.querySelector(".item-info > div:first-child .paragraph");

    const mainImageElement = document.querySelector(".main-image");
    const thumbnailElements = Array.from(document.querySelectorAll(".item-images-wrap .item-image"));

    const infoCardWraps = document.querySelectorAll(".item-info .info-card-wrap");
    const basicInfoCards = infoCardWraps[0]?.querySelectorAll(".info-card") || [];
    const offerInfoCards = infoCardWraps[1]?.querySelectorAll(".info-card") || [];
    const locationInfoCards = infoCardWraps[2]?.querySelectorAll(".info-card") || [];

    const bidCardWrap = document.querySelector(".bid-card-wrap");

    if (!itemId) {
        showPageError("Não foi possível identificar o item.");
        return;
    }

    if (itemOffersSection) {
        itemOffersSection.dataset.itemId = itemId;
    }

    function getAuthToken() {
        if (typeof window.getToken === "function") {
            return window.getToken();
        }

        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function showPageError(message) {
        if (!itemDataSection) return;

        const error = document.createElement("p");
        error.className = "paragraph";
        error.style.color = "red";
        error.style.marginTop = "16px";
        error.textContent = message;

        itemDataSection.prepend(error);
    }

    function setText(selectorOrElement, value, fallback = "-") {
        const element =
            typeof selectorOrElement === "string"
                ? document.querySelector(selectorOrElement)
                : selectorOrElement;

        if (element) {
            element.textContent = value || fallback;
        }
    }

    function setInfoCardValue(cards, index, value, fallback = "-") {
        const element = cards[index]?.querySelector(".info-text");
        if (element) {
            element.textContent = value || fallback;
        }
    }

    function formatCurrency(value) {
        const normalized = typeof value === "string"
            ? Number(value.replace(",", ".").replace(/[^\d.-]/g, ""))
            : Number(value || 0);

        return normalized.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
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

        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function getImages(item, itemPhotos) {
        const fromItem = Array.isArray(item?.images)
            ? item.images
                .map((image) => {
                    if (typeof image === "string") return image;
                    return image?.url || image?.path || "";
                })
                .filter(Boolean)
            : [];

        const fromPhotos = Array.isArray(itemPhotos)
            ? itemPhotos
                .slice()
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((photo) => photo?.url || photo?.path || "")
                .filter(Boolean)
            : [];

        const fallback = [];
        if (item?.image) fallback.push(item.image);
        if (item?.imageUrl) fallback.push(item.imageUrl);
        if (item?.thumbnail) fallback.push(item.thumbnail);

        return [...fromItem, ...fromPhotos, ...fallback].filter(Boolean);
    }

    function getOwnerName(item) {
        return (
            item.user?.name ||
            item.owner?.name ||
            item.createdBy?.name ||
            item.author?.name ||
            "-"
        );
    }

    function getCategory(item) {
        return item.category?.name || item.category || item.categoryId || "-";
    }

    function getQuantity(item) {
        return item.quantity || item.amount || item.volume || "-";
    }

    function getOfferType(item) {
        return item.typeOffer ?? item.offerType ?? item.offer?.type ?? "-";
    }

    function getOfferValue(item) {
        return item.value ?? item.offerValue ?? item.offer?.value ?? 0;
    }

    function getCity(item) {
        return item.city || item.location?.city || "-";
    }

    function getState(item) {
        return item.state || item.uf || item.location?.state || item.location?.uf || "-";
    }

    function getDistrict(item) {
        return item.neighborhood || item.district || item.location?.district || "-";
    }

    function getAddress(item) {
        return item.street || item.address || item.location?.address || "-";
    }

    function getBids(item) {
        if (Array.isArray(item.bids)) return item.bids;
        if (Array.isArray(item.offers)) return item.offers;
        return [];
    }

    function normalizeItemResponse(data) {
        return data?.item || data?.data || data;
    }

    function renderImages(images, title) {
        const fallbackImage = "/src/assets/images/imagem_principal_do_item.webp";
        const finalImages = images.length ? images : [fallbackImage];

        if (mainImageElement) {
            mainImageElement.src = finalImages[0];
            mainImageElement.alt = `Imagem principal de ${title}`;
        }

        thumbnailElements.forEach((img, index) => {
            const imageUrl = finalImages[index + 1];

            if (imageUrl) {
                img.src = imageUrl;
                img.alt = `Imagem ${index + 2} de ${title}`;
                img.style.display = "block";

                img.onclick = () => {
                    if (mainImageElement) {
                        mainImageElement.src = imageUrl;
                        mainImageElement.alt = `Imagem principal de ${title}`;
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

    function createBidCard(bid) {
        const card = document.createElement("div");
        card.className = "bid-card";

        const bidType = bid.type || bid.bidType || bid.offerType || "-";
        const bidValue = bid.value ?? bid.amount ?? 0;
        const bidderName = bid.user?.name || bid.bidder?.name || bid.userName || "Usuário";
        const bidDate = bid.createdAt || bid.date || null;
        const bidDescription = bid.description || "-";

        card.innerHTML = `
            <div class="bid-text-wrap">
                <h4>${bidderName}</h4>
                <span class="offer-date">${formatDate(bidDate)}</span>
            </div>

            <div class="bid-offer-wrap">
                <span class="type-offer">${formatOfferType(bidType)}</span>
                <span class="offer-price">${formatCurrency(bidValue)}</span>
            </div>

            <p class="paragraph">${bidDescription}</p>
        `;

        return card;
    }

    function renderBids(item) {
        if (!bidCardWrap) return;

        const bids = getBids(item);
        bidCardWrap.innerHTML = "";

        if (!bids.length) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "paragraph";
            emptyMessage.textContent = "Este item ainda não possui lances.";
            bidCardWrap.appendChild(emptyMessage);
            return;
        }

        bids.forEach((bid) => {
            bidCardWrap.appendChild(createBidCard(bid));
        });
    }

    async function loadItemPhotos() {
        const token = getAuthToken();
        const headers = { Accept: "application/json" };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${apiBaseUrl}/api/ItemPhoto`, {
            method: "GET",
            headers
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        const photos = Array.isArray(data) ? data : data?.items || data?.data || [];
        return photos.filter((photo) => String(photo.itemId) === String(itemId));
    }

    function renderItem(item, itemPhotos) {
        const title = item.title || item.name || "Item sem título";
        const description = item.description || "Sem descrição disponível.";
        const city = getCity(item);
        const state = getState(item);
        const locationText = city !== "-" || state !== "-" ? `${city}, ${state}` : "-";

        document.title = `${title} - NovoUso Amazônia`;

        setText(titleElement, title);
        setText(descriptionElement, description);

        setInfoCardValue(basicInfoCards, 0, getOwnerName(item));
        setInfoCardValue(basicInfoCards, 1, getCategory(item));
        setInfoCardValue(basicInfoCards, 2, getQuantity(item));

        setInfoCardValue(offerInfoCards, 0, formatOfferType(getOfferType(item)));
        setInfoCardValue(offerInfoCards, 1, formatCurrency(getOfferValue(item)));
        setInfoCardValue(offerInfoCards, 2, formatListingDuration(item.durationDays));

        setInfoCardValue(locationInfoCards, 0, locationText);
        setInfoCardValue(locationInfoCards, 1, getDistrict(item));
        setInfoCardValue(locationInfoCards, 2, getAddress(item));

        renderImages(getImages(item, itemPhotos), title);
        renderBids(item);
    }

    async function loadItem() {
        try {
            const token = getAuthToken();
            const headers = { Accept: "application/json" };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const [itemResponse, photos] = await Promise.all([
                fetch(`${apiBaseUrl}/api/item/${itemId}`, {
                    method: "GET",
                    headers
                }),
                loadItemPhotos()
            ]);

            if (!itemResponse.ok) {
                throw new Error("Não foi possível carregar os detalhes do item.");
            }

            const data = await itemResponse.json();
            const item = normalizeItemResponse(data);

            renderItem(item, photos);
        } catch (error) {
            console.error(error);
            showPageError(error.message || "Erro ao carregar item.");
        }
    }

    loadItem();
});
