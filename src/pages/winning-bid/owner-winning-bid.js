document.addEventListener("DOMContentLoaded", () => {
  const itemId = new URLSearchParams(window.location.search).get("itemId");

  const mainImage = document.querySelector(".main-image");
  const itemTitle = document.querySelector(".item-title h2");
  const bidCard = document.querySelector(".bid-card");
  const bidderName = bidCard?.querySelector("h4");
  const offerDate = bidCard?.querySelector(".offer-date");
  const typeOffer = bidCard?.querySelector(".type-offer");
  const offerPrice = bidCard?.querySelector(".offer-price");
  const bidDescription = bidCard?.querySelector(".paragraph");

  const checkbox = document.getElementById("accept");
  const acceptButton = document.querySelector(".item-terms .action-button");
  const itemData = document.querySelector(".item-data");

  if (!itemId) {
    showError("Não foi possível identificar o item.");
    return;
  }

  if (acceptButton) {
    acceptButton.disabled = true;
  }

  function getAuthToken() {
    if (typeof window.getToken === "function") {
      return window.getToken();
    }

    return localStorage.getItem("token") || sessionStorage.getItem("token");
  }

  function showError(message) {
    const error = document.createElement("p");
    error.className = "paragraph";
    error.style.color = "red";
    error.style.marginTop = "16px";
    error.textContent = message;
    itemData?.prepend(error);
  }

  function setText(element, value, fallback = "-") {
    if (element) {
      element.textContent = value || fallback;
    }
  }

  function formatCurrency(value) {
    const number = Number(value || 0);

    return number.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
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

  function formatBidType(type) {
    const map = {
      "pagar-item": "Pagar pelo item",
      "cobrar-retirada": "Cobrar pela retirada",
      "retirar-gratis": "Retirar gratuitamente"
    };

    return map[type] || type || "-";
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
    return (
      item?.winningBid ||
      item?.winnerBid ||
      item?.acceptedBid ||
      item?.selectedBid ||
      null
    );
  }

  function renderWinningBid(item) {
    const title = item.title || item.name || "Item sem título";
    const imageUrl = getImageUrl(item);
    const winningBid = getWinningBid(item);

    document.title = `${title} - Oferta vencedora - NovoUso Amazônia`;

    if (mainImage) {
      mainImage.src = imageUrl;
      mainImage.alt = `Imagem principal de ${title}`;
    }

    setText(itemTitle, title);

    if (!winningBid) {
      bidCard.innerHTML = `<p class="paragraph">Este item ainda não possui oferta vencedora.</p>`;
      return;
    }

    const winnerName =
      winningBid.user?.name ||
      winningBid.bidder?.name ||
      winningBid.userName ||
      "Usuário";

    const winnerDate =
      winningBid.createdAt ||
      winningBid.updatedAt ||
      winningBid.date ||
      null;

    const winnerType =
      winningBid.type ||
      winningBid.bidType ||
      "-";

    const winnerValue =
      winningBid.value ??
      winningBid.amount ??
      0;

    const winnerDescription =
      winningBid.description ||
      "Sem descrição.";

    setText(bidderName, winnerName);
    setText(offerDate, formatDate(winnerDate));
    setText(typeOffer, formatBidType(winnerType));
    setText(offerPrice, formatCurrency(winnerValue));
    setText(bidDescription, winnerDescription);
  }

  async function loadWinningBid() {
    try {
      const token = getAuthToken();

      const headers = {
        Accept: "application/json"
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`https://api.seudominio.com/items/${itemId}/winning-bid`, {
        method: "GET",
        headers
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar a oferta vencedora.");
      }

      const data = await response.json();
      const item = normalizeResponse(data);

      renderWinningBid(item);
    } catch (error) {
      console.error(error);
      showError(error.message || "Erro ao carregar os dados.");
    }
  }

  checkbox?.addEventListener("change", () => {
    if (acceptButton) {
      acceptButton.disabled = !checkbox.checked;
    }
  });

  loadWinningBid();
});