document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("addItemForm");
    const submitButton = document.getElementById("submitButton");
    const cancelButton = document.getElementById("cancelButton");
    const apiBaseUrl = "http://localhost:5134";

    if (cancelButton) {
        cancelButton.type = "button";
        cancelButton.addEventListener("click", () => {
            window.history.back();
        });
    }

    const feedback = document.createElement("p");
    feedback.style.marginTop = "16px";
    feedback.style.fontSize = "14px";
    form.appendChild(feedback);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const token = getToken();
        const userId = getUserIdFromToken(token);

        if (!token) {
            feedback.textContent = "Você precisa estar autenticado para publicar um item.";
            feedback.style.color = "red";
            return;
        }

        if (!userId) {
            feedback.textContent = "Não foi possível identificar o usuário pelo token.";
            feedback.style.color = "red";
            return;
        }

        const imageInput = document.getElementById("item-images");
        const files = Array.from(imageInput.files);

        if (files.length > 6) {
            feedback.textContent = "Você pode enviar no máximo 6 imagens.";
            feedback.style.color = "red";
            return;
        }

        const rawOfferValue = document.getElementById("offer-value").value.trim();
        const normalizedOfferValue = rawOfferValue
            .replace(/\s/g, "")
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(",", ".");

        const formData = new FormData();

        formData.append("Title", document.getElementById("item-title").value.trim());
        formData.append("Description", document.getElementById("item-description").value.trim());
        formData.append("CategoryId", document.getElementById("category").value);
        formData.append("Quantity", document.getElementById("item-qtd").value.trim());

        formData.append("ZipCode", document.getElementById("item-cep").value.trim());
        formData.append("State", document.getElementById("item-uf").value);
        formData.append("City", document.getElementById("item-city").value);
        formData.append("Street", document.getElementById("item-addres").value.trim());
        formData.append("Neighborhood", document.getElementById("item-district").value.trim());

        const complement = document.getElementById("item-complement").value.trim();
        if (complement) {
            formData.append("Complement", complement);
        }

        formData.append("DurationDays", document.getElementById("offer-duration").value);
        formData.append("TypeOffer", document.getElementById("type-offer").value);
        formData.append("Value", normalizedOfferValue);
        formData.append("UserId", String(userId));

        files.forEach((file) => {
            formData.append("Images", file, file.name);
        });

        try {
            submitButton.disabled = true;
            submitButton.textContent = "Publicando...";
            feedback.textContent = "";

            const response = await fetch(`${apiBaseUrl}/api/item`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const contentType = response.headers.get("content-type") || "";
            const data = contentType.includes("application/json")
                ? await response.json()
                : null;

            if (!response.ok) {
                throw new Error(data?.message || "Não foi possível cadastrar o item.");
            }

            feedback.textContent = "Item cadastrado com sucesso!";
            feedback.style.color = "green";
            form.reset();
        } catch (error) {
            feedback.textContent = error.message || "Erro ao cadastrar item.";
            feedback.style.color = "red";
            console.error(error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Publicar item";
        }
    });
});
