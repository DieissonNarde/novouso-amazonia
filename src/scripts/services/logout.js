function handleLogout(event) {
    if (event) {
        event.preventDefault();
    }

    if (typeof window.logout === "function") {
        window.logout();
    } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    }

    window.location.href = "/src/pages/login/login.html";
}

window.handleLogout = handleLogout;

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-logout-link]").forEach((link) => {
        link.addEventListener("click", handleLogout);
    });
});
