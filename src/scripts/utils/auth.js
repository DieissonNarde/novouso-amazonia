function saveToken(token) {
    localStorage.setItem("token", token);
}

function getToken() {
    return localStorage.getItem("token");
}

function decodeJwtPayload(token) {
    if (!token || typeof token !== "string") {
        return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
        return null;
    }

    try {
        const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const payloadJson = atob(payloadBase64);
        return JSON.parse(payloadJson);
    } catch (error) {
        return null;
    }
}

function getUserIdFromToken(token) {
    const payload = decodeJwtPayload(token);
    if (!payload) {
        return null;
    }

    return payload.id
        ?? payload.userId
        ?? payload.UserId
        ?? payload.sub
        ?? payload.nameid
        ?? payload.NameId
        ?? payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
        ?? null;
}

function saveUser(user) {
    if (!user || typeof user !== "object") {
        localStorage.removeItem("user");
        return;
    }

    const userString = JSON.stringify(user);

    localStorage.setItem("user", userString);
}

function getUser() {
    const user = localStorage.getItem("user");

    if (!user || user === "undefined" || user === "null") {
        localStorage.removeItem("user");
        return null;
    }

    try {
        return JSON.parse(user);
    } catch (error) {
        localStorage.removeItem("user");
        return null;
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
}
