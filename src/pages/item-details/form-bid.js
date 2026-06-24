document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "http://localhost:5134";
    const form = document.getElementById("bidForm");
    const submitButton = document.getElementById("submitButton");
    const cancelButton = document.getElementById("cancelButton");
    const offersSection = document.querySelector(".item-offers");

    if (!form || !offersSection) return;

    const isOwner = () => offersSection.dataset.isOwner === "true";
    const registerOffer = document.querySelector(".register-offer");
    const toggleButton = document.querySelector("[data-bid-toggle]");

    if (isOwner()) {
        if (registerOffer) registerOffer.hidden = true;
        if (toggleButton) toggleButton.hidden = true;
        return;
    }

    const feedback = document.createElement("p");
    feedback.style.marginTop = "16px";
    feedback.style.fontSize = "14px";
    form.appendChild(feedback);

    function setFeedback(message, color = "#222") {
        feedback.textContent = message;
        feedback.style.color = color;
    }

    function getToken() {
        if (typeof window.getToken === "function") return window.getToken();
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentUserId() {
        if (typeof window.getUserIdFromToken === "function") {
            return window.getUserIdFromToken(getToken());
        }
        return null;
    }

    function getItemId() {
        return offersSection.dataset.itemId || new URLSearchParams(window.location.search).get("itemId");
    }

    function normalizeMoney(value) {
        if (!value) return 0;

        const normalized = value.trim()
            .replace(/\s/g, "")
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(",", ".");

        const numberValue = Number(normalized);
        return Number.isNaN(numberValue) ? null : numberValue;
    }

    cancelButton?.addEventListener("click", () => {
        form.reset();
        setFeedback("");
        if (registerOffer) registerOffer.hidden = true;
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const token = getToken();
        const itemId = getItemId();
        const userId = getCurrentUserId();
        const type = document.getElementById("type-bid").value;
        const description = document.getElementById("bid-description").value.trim();
        const rawValue = document.getElementById("bid-value").value.trim();

        let value = normalizeMoney(rawValue);

        if (offersSection.dataset.isOwner === "true") {
            setFeedback("O dono do item não pode enviar lance.", "red");
            return;
        }

        if (!token) {
            setFeedback("Você precisa estar logado para enviar um lance.", "red");
            return;
        }

        if (!itemId) {
            setFeedback("Não foi possível identificar o item.", "red");
            return;
        }

        if (!userId) {
            setFeedback("Não foi possível identificar o usuário.", "red");
            return;
        }

        if (!type || !description) {
            setFeedback("Preencha os campos obrigatórios.", "red");
            return;
        }

        if (value === null) {
            setFeedback("Informe um valor válido.", "red");
            return;
        }

        if (String(type) === "2") {
            value = 0;
        }

        const payload = {
            itemId: Number(itemId),
            userId: Number(userId),
            value: String(value),
            description,
            proposalType: Number(type)
        };

        try {
            submitButton.disabled = true;
            submitButton.textContent = "Enviando...";
            setFeedback("");

            const response = await fetch(`${API_BASE_URL}/api/Bid`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const contentType = response.headers.get("content-type") || "";
            const data = contentType.includes("application/json") ? await response.json() : null;

            if (!response.ok) {
                throw new Error(data?.message || "Não foi possível enviar o lance.");
            }

            setFeedback("Lance enviado com sucesso.", "green");
            form.reset();
            window.dispatchEvent(new CustomEvent("item-details:refresh"));
            if (registerOffer) registerOffer.hidden = true;
        } catch (error) {
            setFeedback(error.message || "Erro ao enviar lance.", "red");
            console.error(error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Enviar lance";
        }
    });
});
