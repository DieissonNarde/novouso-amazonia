const form = document.getElementById("registerForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const cpfCnpj = document.getElementById("cpf").value.trim();
    const dateBirth = document.getElementById("date-birth").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!name || !email || !password) {
        message.textContent = "Preencha todos os campos.";
        message.style.color = "red";
        return;
    }

    const userData = {
        name,
        email,
        whatsapp,
        cpfCnpj,
        dateBirth,
        password
    };

    try {
        const response = await fetch("http://localhost:5134/api/user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        message.textContent = "Cadastro realizado com sucesso!";
        message.style.color = "green";

        //console.log("Resposta da API:", data);
        form.reset();
    } catch (error) {
        message.textContent = "Cadastro não realizado.";
        message.style.color = "red";
        console.error(error);
    }
});