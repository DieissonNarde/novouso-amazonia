const form = document.getElementById("loginForm");
const message = document.getElementById("message");


form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        message.textContent = "Preencha e-mail e senha.";
        message.style.color = "red";
        return;
    }

    const loginData = {
        email,
        password
    };

    try {
        const response = await fetch("https://sua-api.com/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(loginData)
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        saveToken(data.token);
        saveUser(data.user);

        message.textContent = "Login realizado com sucesso!";
        message.style.color = "green";

        console.log("Resposta da API:", data);

        window.location.href = "home.html";
    } catch (error) {
        message.textContent = "E-mail ou senha inválidos.";
        message.style.color = "red";
        console.error(error);
    }
});