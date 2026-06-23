function saveToken(token) {
    localStorage.setItem("token", token);
}

function getToken() {
    return localStorage.getItem("token");
}

function saveUser(user) {
    const userString = JSON.stringify(user);

    localStorage.setItem("user", userString);
}

function getUser() {
    const user = localStorage.getItem("user");

    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem("token");
}