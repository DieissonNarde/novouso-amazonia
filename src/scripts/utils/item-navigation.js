function resolveItemOwnerId(item) {
    const candidates = [
        item?.userId,
        item?.UserId,
        item?.user?.id,
        item?.user?.Id,
        item?.User?.id,
        item?.User?.Id,
        item?.user?.userId,
        item?.user?.UserId,
        item?.ownerUserId,
        item?.OwnerUserId,
        item?.owner?.id,
        item?.Owner?.Id,
        item?.createdBy?.id,
        item?.createdBy?.Id,
        item?.CreatedBy?.id,
        item?.CreatedBy?.Id
    ];

    return candidates.find((candidate) => candidate !== null && candidate !== undefined) ?? null;
}

function getCurrentUserId() {
    const token = typeof window.getToken === "function" ? window.getToken() : localStorage.getItem("token");
    const user = typeof window.getUser === "function" ? window.getUser() : (() => {
        try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    })();

    const tokenUserId = typeof window.getUserIdFromToken === "function"
        ? window.getUserIdFromToken(token)
        : null;

    return tokenUserId
        ?? user?.id
        ?? user?.Id
        ?? user?.userId
        ?? user?.UserId
        ?? user?.user?.id
        ?? user?.user?.Id
        ?? user?.user?.userId
        ?? user?.user?.UserId
        ?? null;
}

async function goToItemDetails(itemId) {
    if (!itemId) return;

    try {
        const response = await fetch(`http://localhost:5134/api/item/${encodeURIComponent(itemId)}`, {
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            window.location.href = `/src/pages/item-details/item-details.html?itemId=${encodeURIComponent(itemId)}`;
            return;
        }

        const data = await response.json();
        const item = data?.item || data?.data || data;
        const ownerId = resolveItemOwnerId(item);
        const currentUserId = getCurrentUserId();
        const isOwner = ownerId !== null
            && currentUserId !== null
            && String(ownerId) === String(currentUserId);

        const target = isOwner
            ? "/src/pages/item-details/owner-item-details.html"
            : "/src/pages/item-details/item-details.html";

        window.location.href = `${target}?itemId=${encodeURIComponent(itemId)}`;
    } catch {
        window.location.href = `/src/pages/item-details/item-details.html?itemId=${encodeURIComponent(itemId)}`;
    }
}

window.goToItemDetails = goToItemDetails;
