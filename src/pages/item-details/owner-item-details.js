document.addEventListener("DOMContentLoaded", () => {
    const offersSection = document.querySelector(".item-offers");
    const bidList = document.querySelector(".bid-card-wrap");

    if (!offersSection || !bidList) return;

    const itemId =
        offersSection.dataset.itemId ||
        new URLSearchParams(window.location.search).get("itemId");

    const pageFeedback = document.createElement("p");
    pageFeedback.style.marginTop = "16px";
    pageFeedback.style.fontSize = "14px";
    offersSection.appendChild(pageFeedback);

    function setPageFeedback(message, color = "#222") {
        pageFeedback.textContent = message;
        pageFeedback.style.color = color;
    }

    function getAuthToken() {
        if (typeof getToken === "function") {
            return getToken();
        }

        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function setBidStatusUI(card, status) {
        const buttonsWrap = card.querySelector(".bid-buttons-wrap");
        const existingStatus = card.querySelector(".bid-status");

        if (existingStatus) {
            existingStatus.remove();
        }

        const statusEl = document.createElement("span");
        statusEl.className = `bid-status ${status}`;
        statusEl.style.display = "inline-block";
        statusEl.style.marginTop = "12px";
        statusEl.style.fontWeight = "600";

        if (status === "accepted") {
            statusEl.textContent = "Lance aceito";
            statusEl.style.color = "green";
        } else {
            statusEl.textContent = "Lance recusado";
            statusEl.style.color = "red";
        }

        if (buttonsWrap) {
            buttonsWrap.innerHTML = "";
            buttonsWrap.appendChild(statusEl);
        }
    }

    async function updateBidStatus(card, status) {
        const token = getAuthToken();
        const bidId = card.dataset.bidId;

        if (!token) {
            setPageFeedback("Você precisa estar autenticado para gerenciar os lances.", "red");
            return;
        }

        if (!itemId || !bidId) {
            setPageFeedback("Não foi possível identificar o item ou o lance.", "red");
            return;
        }

        const acceptButton = card.querySelector(".accept");
        const rejectButton = card.querySelector(".reject");

        try {
            if (acceptButton) acceptButton.disabled = true;
            if (rejectButton) rejectButton.disabled = true;

            const response = await fetch(`https://api.seudominio.com/items/${itemId}/bids/${bidId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            const contentType = response.headers.get("content-type") || "";
            const data = contentType.includes("application/json")
                ? await response.json()
                : null;

            if (!response.ok) {
                throw new Error(data?.message || "Não foi possível atualizar o status do lance.");
            }

            setBidStatusUI(card, status);
            setPageFeedback(
                status === "accepted" ? "Lance aceito com sucesso." : "Lance recusado com sucesso.",
                "green"
            );
        } catch (error) {
            if (acceptButton) acceptButton.disabled = false;
            if (rejectButton) rejectButton.disabled = false;

            setPageFeedback(error.message || "Erro ao atualizar o lance.", "red");
            console.error(error);
        }
    }

    bidList.addEventListener("click", (event) => {
        const acceptButton = event.target.closest(".accept");
        const rejectButton = event.target.closest(".reject");

        if (!acceptButton && !rejectButton) return;

        const card = event.target.closest(".bid-card");
        if (!card) return;

        if (acceptButton) {
            updateBidStatus(card, "accepted");
        }

        if (rejectButton) {
            updateBidStatus(card, "rejected");
        }
    });
});