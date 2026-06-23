document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("bidForm");
    const submitButton = document.getElementById('submitButton');
    const cancelButton = document.getElementById("cancelButton");
    const bidList = document.querySelector(".bid-card-wrap");

    if (cancelButton) {
        cancelButton.type = "button";
        cancelButton.addEventListener("click", () => {
            form.reset();
            setFeedback("");
        });
    }

    const feedback = document.createElement("p");
    feedback.style.marginTop = "16px";
    feedback.style.fontSize = "14px";
    form.appendChild(feedback);

    function setFeedback(message, color = "#222") {
        feedback.textContent = message;
        feedback.style.color = color;
    }

    function getItemId() {
        const params = new URLSearchParams(window.location.search);
        const itemIdFromQuery = params.get("itemId");

        if (itemIdFromQuery) return itemIdFromQuery;

        const itemElement = document.querySelector("[data-item-id]");
        if (itemElement?.dataset?.itemId) return itemElement.dataset.itemId;

        return null;
    }

    function normalizeMoney(value) {
        if (!value) return 0;

        const normalized = value
            .trim()
            .replace(/\s/g, "")
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(",", ".");

        const numberValue = Number(normalized);
        return Number.isNaN(numberValue) ? null : numberValue;
    }

    function formatMoney(value) {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function formatBidType(type) {
        const map = {
            "pagar-item": "Pagar pelo item",
            "cobrar-retirada": "Cobrar pela retirada",
            "retirar-gratis": "Retirar gratuitamente"
        };

        return map[type] || type;
    }

    function formatDate(dateString) {
        const date = dateString ? new Date(dateString) : new Date();

        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function appendBidCard(bid) {
        if (!bidList) return;

        const card = document.createElement("div");
        card.className = "bid-card";

        const bidderName =
            bid?.user?.name ||
            bid?.bidder?.name ||
            bid?.userName ||
            "Você";

        const bidDate =
            bid?.createdAt ||
            bid?.created_at ||
            new Date().toISOString();

        const bidType =
            bid?.type ||
            bid?.bidType ||
            document.getElementById("type-bid").value;

        const bidValue =
            bid?.value ??
            bid?.amount ??
            normalizeMoney(document.getElementById("bid-value").value);

        const bidDescription =
            bid?.description ||
            document.getElementById("bid-description").value.trim();

        card.innerHTML = `
      <div class="bid-text-wrap">
        <h4>${bidderName}</h4>
        <span class="offer-date">${formatDate(bidDate)}</span>
      </div>

      <div class="bid-offer-wrap">
        <span class="type-offer">
          ${formatBidType(bidType)}
        </span>

        <span class="offer-price">
          ${formatMoney(bidValue)}
        </span>
      </div>

      <p class="paragraph">${bidDescription}</p>
    `;

        bidList.prepend(card);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const token = getToken();
        const itemId = getItemId();

        if (!token) {
            setFeedback("Você precisa estar logado para enviar um lance.", "red");
            return;
        }

        if (!itemId) {
            setFeedback("Não foi possível identificar o item deste lance.", "red");
            return;
        }

        const type = document.getElementById("type-bid").value;
        const description = document.getElementById("bid-description").value.trim();
        const rawValue = document.getElementById("bid-value").value.trim();

        let value = normalizeMoney(rawValue);

        if (type === "retirar-gratis") {
            value = 0;
        }

        if (!type || !description) {
            setFeedback("Preencha os campos obrigatórios.", "red");
            return;
        }

        if (value === null) {
            setFeedback("Informe um valor válido.", "red");
            return;
        }

        const payload = {
            type,
            value,
            description
        };

        try {
            submitButton.disabled = true;
            submitButton.textContent = "Enviando...";
            setFeedback("");

            const response = await fetch(`https://api.seudominio.com/items/${itemId}/bids`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const contentType = response.headers.get("content-type") || "";
            const data = contentType.includes("application/json")
                ? await response.json()
                : null;

            if (!response.ok) {
                throw new Error(data?.message || "Não foi possível enviar o lance.");
            }

            setFeedback("Lance enviado com sucesso.", "green");
            appendBidCard(data?.bid || data);
            form.reset();
        } catch (error) {
            setFeedback(error.message || "Erro ao enviar lance.", "red");
            console.error(error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Enviar lance";
        }
    });
});